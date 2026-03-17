import sys
import threading
import queue
import json
from typing import Dict, List, Iterator
from crewai import Agent, Task, Crew, Process
from crewai.llm import LLM
import os
from pydantic import BaseModel, Field
from crewai_tools import MCPServerAdapter
from mcp import StdioServerParameters
from .schemas import GraphData
from .models import LLMModel, Credential, MCPServer
from .database import engine
from sqlmodel import Session, select
from dotenv import load_dotenv
from contextlib import ExitStack

load_dotenv()

class StreamToQueue:
    def __init__(self, q: queue.Queue):
        self.q = q
        
    def write(self, buf):
        for line in buf.splitlines(True):
            if line.strip():
                # Encapsula o print nativo do CrewAI numa casca estruturada
                self.q.put(json.dumps({"type": "log", "data": line}) + "\n")
                
    def flush(self):
        pass

# --- DEFINIÇÃO DE SCHEMAS PARA PLAYWRIGHT MCP ---
class BrowserNavigateSchema(BaseModel):
    url: str = Field(...)
class BrowserClickSchema(BaseModel):
    ref: str = Field(...)
class BrowserTypeSchema(BaseModel):
    ref: str = Field(...)
    text: str = Field(...)
class BrowserSnapshotSchema(BaseModel):
    pass

playwright_schemas = {
    "browser_navigate": BrowserNavigateSchema,
    "browser_click": BrowserClickSchema,
    "browser_type": BrowserTypeSchema,
    "browser_snapshot": BrowserSnapshotSchema
}

def run_crew_stream(graph_data: GraphData) -> Iterator[str]:
    nodes = {node.id: node for node in graph_data.nodes}
    edges = graph_data.edges
    
    # 1. Identificando a Crew Principal
    crew_node = next((n for n in graph_data.nodes if n.type == 'crew'), None)
    if not crew_node:
        yield json.dumps({"type": "error", "error": "O fluxo não possui um nó de Crew principal."}) + "\n"
        return

    process_type = Process.sequential
    if crew_node.data.process == "hierarchical":
        process_type = Process.hierarchical


    # 2. Setup de IDs para emissão de status
    agent_nodes = [n for n in graph_data.nodes if n.type == 'agent']
    task_nodes = [n for n in graph_data.nodes if n.type == 'task']
    ordered_task_ids = [n.id for n in task_nodes]
    
    # Mapeamento para emissão de status simultâneo
    task_to_agent_map = {}
    for edge in edges:
        if edge.target in ordered_task_ids:
            task_to_agent_map[edge.target] = edge.source

    q = queue.Queue()
    
    def make_agent_step_callback(agent_id: str):
        def cb(step_output):
            q.put(json.dumps({"type": "status", "nodeId": agent_id, "status": "running"}) + "\n")
        return cb

    def emit_task_running(task_id: str):
        q.put(json.dumps({"type": "status", "nodeId": task_id, "status": "running"}) + "\n")
        agent_id = task_to_agent_map.get(task_id)
        if agent_id:
            q.put(json.dumps({"type": "status", "nodeId": agent_id, "status": "running"}) + "\n")
    
    def make_task_callback(task_id: str):
        def cb(output):
            q.put(json.dumps({"type": "task_completed", "task_id": task_id}) + "\n")
            try:
                curr_idx = ordered_task_ids.index(task_id)
                if curr_idx + 1 < len(ordered_task_ids):
                    next_task_id = ordered_task_ids[curr_idx + 1]
                    emit_task_running(next_task_id)
            except ValueError:
                pass
        return cb

    # 5. Execução em Thread
    
    def worker():
        original_stdout = sys.stdout
        sys.stdout = StreamToQueue(q)
        
        with ExitStack() as stack:
            try:
                # --- 1. Preparação de Ferramentas MCP ---
                # Mapeia Agent ID -> Lista de Ferramentas
                agent_tools_map = {}
                
                # Coletamos todos os IDs de MCP únicos que serão usados
                all_mcp_ids = set()
                for node in agent_nodes:
                    mcp_server_ids = getattr(node.data, 'mcpServerIds', []) or []
                    for mid in mcp_server_ids:
                        all_mcp_ids.add(mid)
                
                def log_debug(msg):
                    """Helper to log both to queue (frontend) and terminal"""
                    full_msg = f"DEBUG: {msg}\n"
                    q.put(json.dumps({"type": "log", "data": full_msg}) + "\n")
                    # Tenta printar no stdout real (terminal) se disponível
                    try:
                        if sys.__stdout__:
                            sys.__stdout__.write(full_msg)
                            sys.__stdout__.flush()
                        else:
                            print(full_msg)
                    except:
                        pass

                log_debug(f"Unique MCP IDs found in graph: {all_mcp_ids}")
                
                # Carregamos do banco e ativamos os Adapters
                mcp_adapters_cache = {}
                with Session(engine) as session:
                    for mcp_id in all_mcp_ids:
                        mcp_record = session.get(MCPServer, mcp_id)
                        if not mcp_record:
                            continue
                        
                        try:
                            if mcp_record.transport_type == 'stdio':
                                command = mcp_record.command
                                if command == "npx" and os.name == "nt":
                                    command = "npx.cmd"
                                
                                env = dict(os.environ)
                                if mcp_record.env_vars:
                                    env.update(mcp_record.env_vars)

                                log_debug(f"Starting stdio MCP: {command} {' '.join(mcp_record.args or [])}")
                                params = StdioServerParameters(
                                    command=command,
                                    args=mcp_record.args or [],
                                    env=env
                                )
                                adapter = MCPServerAdapter(params)
                            else:
                                # SSE (Em desenvolvimento - Requer SseClientParameters do SDK MCP)
                                log_debug(f"SSE transport not yet supported for {mcp_record.name}")
                                continue
                            
                            # Entramos no contexto do adapter para ativar a conexão (Retorna a lista de ferramentas)
                            raw_tools = stack.enter_context(adapter)
                            log_debug(f"MCP {mcp_record.name} connected. Found {len(raw_tools)} tools.")
                            
                            # Playwright Schema Injection & Filtering
                            is_playwright = "playwright" in mcp_record.name.lower() or any("playwright" in str(arg).lower() for arg in (mcp_record.args or []))
                            
                            processed_tools = []
                            if is_playwright:
                                allowed_suffixes = list(playwright_schemas.keys())
                                for tool in raw_tools:
                                    match = next((s for s in allowed_suffixes if tool.name.endswith(s)), None)
                                    if match:
                                        log_debug(f"Injecting schema for Playwright tool: {tool.name}")
                                        tool.args_schema = playwright_schemas[match]
                                        processed_tools.append(tool)
                                    else:
                                        log_debug(f"Skipping non-essential Playwright tool: {tool.name}")
                            else:
                                processed_tools = raw_tools
                                        
                            mcp_adapters_cache[mcp_id] = processed_tools
                        except Exception as e:
                            log_debug(f"Connection failed for {mcp_record.name}: {str(e)}")

                # --- 2. Instanciação de Agentes (Agora com ferramentas) ---
                agents_map: Dict[str, Agent] = {}
                for node in agent_nodes:
                    role = node.data.role
                    goal = node.data.goal
                    backstory = node.data.backstory
                    name = node.data.name or f"Agent_{node.id}"
                    model_id = getattr(node.data, 'modelId', None)
                    mcp_server_ids = getattr(node.data, 'mcpServerIds', [])
                    
                    # Coleta ferramentas deste agente
                    this_agent_tools = []
                    mcp_server_ids = getattr(node.data, 'mcpServerIds', []) or []
                    for mid in mcp_server_ids:
                        if mid in mcp_adapters_cache:
                            tools_to_add = mcp_adapters_cache[mid]
                            this_agent_tools.extend(tools_to_add)
                            q.put(json.dumps({"type": "log", "data": f"DEBUG: Agent {name} received {len(tools_to_add)} tools from MCP {mid}\n"}) + "\n")
                        else:
                            q.put(json.dumps({"type": "log", "data": f"DEBUG: MCP {mid} not found in cache for agent {name}\n"}) + "\n")

                    # LLM Setup (já estava no generator mas vamos mover para cá ou reutilizar lógica)
                    # Para simplificar, vou extrair a lógica de LLM para ser reusável ou mantê-la aqui
                    agent_llm = None
                    with Session(engine) as session:
                        llm_config = None
                        if model_id:
                            llm_config = session.get(LLMModel, model_id)
                        if not llm_config:
                            llm_config = session.exec(select(LLMModel).where(LLMModel.is_default == True)).first()
                        
                        if llm_config:
                            credential = session.get(Credential, llm_config.credential_id)
                            if credential:
                                llm_params = {
                                    "model": llm_config.model_name,
                                    "api_key": credential.key,
                                }
                                if llm_config.temperature is not None: llm_params["temperature"] = llm_config.temperature
                                if llm_config.max_tokens is not None: llm_params["max_tokens"] = llm_config.max_tokens
                                if llm_config.max_completion_tokens is not None: llm_params["max_completion_tokens"] = llm_config.max_completion_tokens
                                if llm_config.base_url and llm_config.base_url != "default": llm_params["base_url"] = llm_config.base_url
                                if credential.provider: llm_params["provider"] = credential.provider
                                agent_llm = LLM(**llm_params)

                    agent = Agent(
                        role=role,
                        goal=goal,
                        backstory=backstory,
                        verbose=True,
                        allow_delegation=False, 
                        step_callback=make_agent_step_callback(node.id),
                        llm=agent_llm,
                        tools=this_agent_tools,
                        max_iter=getattr(node.data, 'max_iter', 60),
                        max_execution_time=getattr(node.data, 'max_execution_time', 300)
                    )
                    agents_map[node.id] = agent
                    log_debug(f"Agent {name} (ID: {node.id}) successfully initialized with {len(this_agent_tools)} tools. (max_iter={agent.max_iter})")

                # --- 3. Instanciação de Tasks (Re-regrando links com agentes criados) ---
                tasks_list: List[Task] = []
                tasks_dict: Dict[str, Task] = {}

                for node in task_nodes:
                    description = node.data.description
                    expected_output = node.data.expected_output
                    
                    # Encontra o agente vinculado a esta task (borda onde a origem é um agente)
                    agent_ids = {n.id for n in agent_nodes}
                    task_agent_edge = next((e for e in edges if e.target == node.id and e.source in agent_ids), None)
                    
                    if not task_agent_edge: 
                        log_debug(f"Warning: Task {node.id} has no agent assigned via edge. Skipping.")
                        continue
                        
                    source_agent_id = task_agent_edge.source
                    if source_agent_id not in agents_map: 
                        log_debug(f"Warning: Agent {source_agent_id} for task {node.id} not found in agents_map. Skipping.")
                        continue
                    
                    target_agent = agents_map[source_agent_id]
                    log_debug(f"Task {node.data.name or node.id} assigned to Agent {target_agent.role if hasattr(target_agent, 'role') else source_agent_id}")
                        
                    task = Task(
                        description=description,
                        expected_output=expected_output,
                        agent=agents_map[source_agent_id],
                        callback=make_task_callback(node.id)
                    )
                    tasks_list.append(task)
                    tasks_dict[node.id] = task

                # --- 4. Ordenação e Vinculação de Contexto ---
                # Precisamos garantir que as tasks sejam executadas na ordem correta
                # se houver dependência de context.
                
                final_tasks_ordered: List[Task] = []
                final_task_ids_ordered: List[str] = []
                visited = set()
                
                def add_task_with_context(tid):
                    if tid in visited or tid not in tasks_dict:
                        return
                    
                    # 1. Pega os contexts desta task
                    node = nodes.get(tid)
                    if not node:
                        return
                    context_ids = getattr(node.data, 'context', []) or []
                    
                    # 2. Garante que os contexts foram adicionados primeiro
                    for c_id in context_ids:
                        add_task_with_context(c_id)
                    
                    # 3. Adiciona a task atual
                    task_instance = tasks_dict[tid]
                    if context_ids:
                        context_tasks = [tasks_dict[ctx_id] for ctx_id in context_ids if ctx_id in tasks_dict]
                        task_instance.context = context_tasks
                        log_debug(f"Context linked: Task {tid} will receive output from {len(context_tasks)} task(s).")
                    
                    if tid not in visited:
                        final_tasks_ordered.append(task_instance)
                        final_task_ids_ordered.append(tid)
                        visited.add(tid)

                for node in task_nodes:
                    add_task_with_context(node.id)

                if not final_tasks_ordered:
                    q.put(json.dumps({"type": "error", "error": "A Crew não possui nenhuma Task válida para executar."}) + "\n")
                    return
                
                log_debug(f"Execution Order: {final_task_ids_ordered}")
                
                # Sobrescreve a lista global de IDs ordenados para o callback de status emitir corretamente
                nonlocal ordered_task_ids
                ordered_task_ids = final_task_ids_ordered

                # --- 5. Execução ---
                crew = Crew(
                    agents=list(agents_map.values()),
                    tasks=final_tasks_ordered,
                    process=process_type,
                    verbose=True
                )
                
                if ordered_task_ids:
                    emit_task_running(ordered_task_ids[0])
                
                result = crew.kickoff()
                q.put(json.dumps({"type": "final_result", "result": str(result)}) + "\n")

            except Exception as e:
                q.put(json.dumps({"type": "error", "error": str(e)}) + "\n")
            finally:
                sys.stdout = original_stdout
                q.put(json.dumps({"type": "done"}) + "\n")
                q.put(None) # EOF Marker

    thread = threading.Thread(target=worker)
    thread.start()
    
    # 6. Drenando a Queue para a StreamingResponse
    while True:
        try:
            item = q.get(timeout=15)
            if item is None:
                break
            yield item
        except queue.Empty:
            yield json.dumps({"type": "heartbeat"}) + "\n"
