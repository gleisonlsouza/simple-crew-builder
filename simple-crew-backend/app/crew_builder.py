import sys
import threading
import queue
import json
from typing import Dict, List, Iterator
from crewai import Agent, Task, Crew, Process
from crewai.llm import LLM
from .schemas import GraphData
from .models import LLMModel, Credential
from .database import engine
from sqlmodel import Session, select
from dotenv import load_dotenv

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

    # 2. Instanciando os Agentes
    agents_map: Dict[str, Agent] = {}
    agent_nodes = [n for n in graph_data.nodes if n.type == 'agent']
    
    # Criaremos a Fila Queue agora no topo pois os Callbacks precisarão apontar pra ela
    q = queue.Queue()
    
    def make_agent_step_callback(agent_id: str):
        def cb(step_output):
            # Sempre que o agente pensar num novo "Step" da delegação
            q.put(json.dumps({"type": "status", "nodeId": agent_id, "status": "running"}) + "\n")
        return cb

    for node in agent_nodes:
        role = node.data.role
        goal = node.data.goal
        backstory = node.data.backstory
        name = node.data.name or f"Agent_{node.id}"
        model_id = getattr(node.data, 'modelId', None)
        
        if not all([role, goal, backstory]):
            yield json.dumps({"type": "error", "error": f"O Agente '{name}' está incompleto. Preencha Role, Goal e Backstory."}) + "\n"
            return

        # 2.1 Busca o Modelo de LLM
        agent_llm = None
        with Session(engine) as session:
            llm_config = None
            if model_id:
                llm_config = session.get(LLMModel, model_id)
            
            if not llm_config:
                # Fallback para o default do usuário (GLEISON_ID por enquanto)
                llm_config = session.exec(
                    select(LLMModel).where(LLMModel.is_default == True)
                ).first()
            
            if llm_config:
                credential = session.get(Credential, llm_config.credential_id)
                if credential:
                    llm_params = {
                        "model": llm_config.model_name,
                        "api_key": credential.key,
                    }
                    
                    if llm_config.temperature is not None:
                        llm_params["temperature"] = llm_config.temperature
                    
                    if llm_config.max_tokens is not None:
                        llm_params["max_tokens"] = llm_config.max_tokens
                        
                    if llm_config.max_completion_tokens is not None:
                        llm_params["max_completion_tokens"] = llm_config.max_completion_tokens
                    
                    if llm_config.base_url and llm_config.base_url != "default":
                        llm_params["base_url"] = llm_config.base_url
                    
                    if credential.provider:
                        llm_params["provider"] = credential.provider
                        
                    agent_llm = LLM(**llm_params)

        agent = Agent(
            role=role,
            goal=goal,
            backstory=backstory,
            verbose=True,
            allow_delegation=False, 
            step_callback=make_agent_step_callback(node.id),
            llm=agent_llm
        )
        agents_map[node.id] = agent
        
    # 3. Instanciando as Tasks e Injetando os Agentes Executores via Edges
    tasks_list: List[Task] = []
    task_nodes = [n for n in graph_data.nodes if n.type == 'task']
    ordered_task_ids = [n.id for n in task_nodes]
    
    # Mapeamento Reverso: Task ID -> Agent ID associado
    task_to_agent_map = {}
    for edge in edges:
        if edge.target in ordered_task_ids:
            task_to_agent_map[edge.target] = edge.source

    def emit_task_running(task_id: str):
        # Emite Running para a Task
        q.put(json.dumps({"type": "status", "nodeId": task_id, "status": "running"}) + "\n")
        # Emite Running para o Agente pai da Task simultaneamente
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

    for node in task_nodes:
        description = node.data.description
        expected_output = node.data.expected_output
        name = node.data.name or f"Task_{node.id}"
        
        if not all([description, expected_output]):
            yield json.dumps({"type": "error", "error": f"A Task '{name}' está incompleta. Preencha Description e Expected Output."}) + "\n"
            return
            
        task_edges = [e for e in edges if e.target == node.id]
        if not task_edges:
            yield json.dumps({"type": "error", "error": f"A Task '{name}' está orfã. Ela deve ser conectada a um Agent."}) + "\n"
            return
            
        source_agent_id = task_edges[0].source
        if source_agent_id not in agents_map:
            yield json.dumps({"type": "error", "error": f"A conexão apontando para a Task '{name}' é inválida (Ela precisa vir de um Agent Node)."}) + "\n"
            return
            
        task = Task(
            description=description,
            expected_output=expected_output,
            agent=agents_map[source_agent_id],
            callback=make_task_callback(node.id)
        )
        tasks_list.append(task)
        
    if not tasks_list:
        yield "[ERROR] A Crew não possui nenhuma Task válida para executar."
        return
        
    # 4. Compilando o Time (Crew)
    crew = Crew(
        agents=list(agents_map.values()),
        tasks=tasks_list,
        process=process_type,
        verbose=True
    )
    
    # 5. Interceptação via Callbacks e Execução em Thread
    
    def worker():
        original_stdout = sys.stdout
        sys.stdout = StreamToQueue(q)
        try:
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
