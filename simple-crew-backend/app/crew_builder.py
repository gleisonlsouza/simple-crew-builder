import sys
import threading
import queue
import json
import typing
from typing import Dict, List, Iterator, Any, Optional
from pathlib import Path
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool, BaseTool
from crewai.llm import LLM
import os
from pydantic import BaseModel, Field
from .models import LLMModel, Credential, MCPServer, AppSettings, Workspace
from .schemas import GraphData
from mcp import StdioServerParameters
from crewai_tools import (
    SerperDevTool, 
    ScrapeWebsiteTool, 
    DirectoryReadTool, 
    FileReadTool, 
    FileWriterTool,
    DirectorySearchTool,
    PDFSearchTool,
    DOCXSearchTool,
    JSONSearchTool,
    XMLSearchTool,
    CSVSearchTool,
    MDXSearchTool,
    TXTSearchTool,
    MCPServerAdapter
)
from .database import engine
from sqlmodel import Session, select
from dotenv import load_dotenv
from contextlib import ExitStack, redirect_stdout
import contextlib

load_dotenv()

ROOT_USER_ID = "00000000-0000-0000-0000-000000000000"

class StreamToQueue:
    def __init__(self, q: queue.Queue):
        self.q = q
        
    def write(self, buf):
        for line in buf.splitlines(True):
            if line.strip():
                # Envia para a Queue (Frontend)
                self.q.put(json.dumps({"type": "log", "data": line}) + "\n")
                
                # Mirror para o Terminal Real (Importante para debug do usuário)
                try:
                    if sys.__stdout__:
                        sys.__stdout__.write(line)
                        sys.__stdout__.flush()
                except:
                    pass
                
    def flush(self):
        pass

# --- WORKSPACE AWARE FILE TOOLS ---
class WorkspaceFileReadTool(FileReadTool):
    workspace_path: str = Field(..., description="The root path of the workspace")
    
    def _run(self, file_path: Optional[str] = None, **kwargs: Any) -> str:
        if file_path:
            abs_workspace = os.path.abspath(self.workspace_path)
            if not os.path.isabs(file_path):
                file_path = os.path.join(abs_workspace, file_path)
        
        print(f"WorkspaceFileReadTool: reading {file_path}")
        return super()._run(file_path=file_path, **kwargs)

class WorkspaceFileWriterTool(FileWriterTool):
    workspace_path: str = Field(..., description="The root path of the workspace")
    
    def _run(self, filename: str, content: str, directory: Optional[str] = None, **kwargs: Any) -> str:
        abs_workspace = os.path.abspath(self.workspace_path)
        
        if not directory or not os.path.isabs(directory):
            if not directory or directory == "./":
                directory = abs_workspace
            else:
                directory = os.path.join(abs_workspace, directory.lstrip('./\\'))
        
        print(f"WorkspaceFileWriterTool: writing {filename} to {directory}")
        return super()._run(filename=filename, content=content, directory=directory, **kwargs)

def neutralize_path(path: str, abs_workspace: str) -> str:
    """
    Transforma qualquer caminho (absoluto ou relativo) em um caminho seguro 
    dentro do workspace, preservando a estrutura de subpastas pretendida,
    mas sem repetir a hierarquia do sistema de arquivos do host.
    """
    if not path:
        return abs_workspace
    
    # 1. Normaliza e resolve o caminho para absoluto para comparação
    abs_path = os.path.abspath(path)
    
    # 2. Se já estiver no workspace, excelente.
    if abs_path.startswith(abs_workspace):
        return abs_path
        
    # 3. Caso contrário, calculamos o caminho relativo ao root do backend (CWD)
    # Ex: C:\projetos\SimpleCrew\simple-crew-builder\index.html -> simple-crew-builder\index.html
    cwd = os.getcwd()
    try:
        rel_to_cwd = os.path.relpath(abs_path, cwd)
    except ValueError:
        # Se estiver em drives diferentes (Windows), pegamos apenas o basename + subpastas do path original
        _, path_no_drive = os.path.splitdrive(path)
        rel_to_cwd = path_no_drive.lstrip('./\\')

    # 4. Removemos qualquer '..' para garantir que ele não tente fugir do workspace
    # rel_to_cwd pode ser '../../etc/passwd' -> isso vira 'etc/passwd'
    safe_rel = rel_to_cwd.replace('..', '').lstrip('./\\')
    
    # 5. Junta ao workspace
    return os.path.join(abs_workspace, safe_rel)

def get_safe_open(workspace_path: str):
    import builtins
    abs_workspace = os.path.abspath(workspace_path)
    real_open = builtins.open
    
    def safe_open(file, *args, **kwargs):
        safe_file = neutralize_path(str(file), abs_workspace)
        return real_open(safe_file, *args, **kwargs)
    return safe_open

def get_safe_pathlib(workspace_path: str):
    abs_workspace = os.path.abspath(workspace_path)
    original_path = Path
    
    class SafePath(original_path):
        def _enforce(self):
            return SafePath(neutralize_path(str(self), abs_workspace))

        def open(self, mode='r', buffering=-1, encoding=None, errors=None, newline=None):
            safe = self._enforce()
            return super(SafePath, safe).open(mode, buffering, encoding, errors, newline)

        def mkdir(self, mode=0o777, parents=False, exist_ok=False):
            safe = self._enforce()
            return super(SafePath, safe).mkdir(mode, parents, exist_ok)
            
        def write_text(self, data, encoding=None, errors=None, newline=None):
            safe = self._enforce()
            return super(SafePath, safe).write_text(data, encoding, errors, newline)
            
        def write_bytes(self, data):
            safe = self._enforce()
            return super(SafePath, safe).write_bytes(data)

    return SafePath

def get_safe_os_module(workspace_path: str):
    import os as real_os
    abs_workspace = real_os.path.abspath(workspace_path)
    
    class SafeOS:
        def __init__(self):
            # Copia todos os membros do os original
            for name in dir(real_os):
                setattr(self, name, getattr(real_os, name))
        
        def _enforce(self, path):
            return neutralize_path(path, abs_workspace)

        def mkdir(self, path, mode=0o777): return real_os.mkdir(self._enforce(path), mode)
        def makedirs(self, name, mode=0o777, exist_ok=False): return real_os.makedirs(self._enforce(name), mode, exist_ok)
        def remove(self, path): return real_os.remove(self._enforce(path))
        def rmdir(self, path): return real_os.rmdir(self._enforce(path))
        def listdir(self, path='.'): return real_os.listdir(self._enforce(path))
        def chdir(self, path): pass # Proibido mudar de diretório global

    return SafeOS()

def wrap_tool_with_workspace_guard(tool_instance: BaseTool, workspace_path: str):
    """
    Intercepta a execução de qualquer ferramenta e garante que argumentos 
    relacionados a caminhos sejam forçados para dentro do workspace.
    Também limpa atributos da instância que possam estar apontando para fora.
    """
    if not workspace_path:
        return tool_instance
        
    original_run = tool_instance._run
    abs_workspace = os.path.abspath(workspace_path)
    
    # Lista de atributos comuns que CrewAI tools usam internamente
    attr_fields = ['path', 'file_path', 'directory', 'dir_path', 'filename', 'output_file']

    def protected_run(*args, **kwargs):
        # 1. Enforce instance attributes
        for attr in attr_fields:
            if hasattr(tool_instance, attr):
                val = getattr(tool_instance, attr)
                if isinstance(val, str) and val:
                    setattr(tool_instance, attr, neutralize_path(val, abs_workspace))

        # 2. Enforce kwargs
        for field in attr_fields:
            if field in kwargs and isinstance(kwargs[field], str) and kwargs[field]:
                kwargs[field] = neutralize_path(kwargs[field], abs_workspace)

        return original_run(*args, **kwargs)

    tool_instance._run = protected_run
    return tool_instance

def run_crew_stream(graph_data: GraphData, workspace_id: Optional[Any] = None) -> Iterator[str]:
    nodes = {node.id: node for node in graph_data.nodes}
    edges = graph_data.edges
    
    # 1. Identificando a Crew Principal
    crew_node = next((n for n in graph_data.nodes if n.type == 'crew'), None)
    if not crew_node:
        yield json.dumps({"type": "error", "error": "O fluxo não possui um nó de Crew principal."}) + "\n"
        return

    # --- 1b. Extração de Inputs para Kickoff ---
    # Coleta inputs definidos manualmente no nó da Crew
    execution_inputs = getattr(crew_node.data, 'inputs', {}) or {}
    # Filtra apenas keys reais (remove os placeholders temporários do frontend)
    execution_inputs = {k: v for k, v in execution_inputs.items() if not k.startswith('input_')}

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

            try:
                # --- PRE-STEP: Resolve Workspace Path (Physical for this run) ---
                workspace_path = None
                with Session(engine) as session:
                    # 1. Prioridade: Workspace vindo do Projeto (passado por argumento)
                    ws_to_use_id = workspace_id
                    
                    # 2. Fallback: Workspace Global das configurações
                    if not ws_to_use_id:
                        settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
                        if settings:
                            ws_to_use_id = settings.active_workspace_id

                    # Resolve o path físico se temos um ID
                    if ws_to_use_id:
                        ws_record = session.get(Workspace, ws_to_use_id)
                        if ws_record:
                            workspace_path = os.path.abspath(os.path.join(os.getcwd(), ws_record.path))
                            log_debug(f"Resolved workspace_path (ID: {ws_to_use_id}): {workspace_path}")
                    
                    # 3. Fallback final: default
                    if not workspace_path:
                        workspace_path = os.path.abspath(os.path.join(os.getcwd(), "workspaces", "default"))
                        log_debug(f"Using default workspace: {workspace_path}")
                    
                    if not os.path.exists(workspace_path):
                        os.makedirs(workspace_path, exist_ok=True)

                # --- 1. Preparação de Ferramentas MCP ---
                # Mapeia Agent ID -> Lista de Ferramentas
                agent_tools_map = {}
                
                # Coletamos todos os IDs de MCP únicos que serão usados
                all_mcp_ids = set()
                for node in agent_nodes:
                    mcp_server_ids = getattr(node.data, 'mcpServerIds', []) or []
                    if mcp_server_ids:
                        log_debug(f"Agent {node.data.name} has MCP Server IDs: {mcp_server_ids}")
                    for mid in mcp_server_ids:
                        all_mcp_ids.add(mid)
                
                log_debug(f"Unique MCP IDs found in graph: {all_mcp_ids}")
                if not all_mcp_ids:
                    log_debug("No MCP Server IDs found in any agent node.")
                
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
                                env["UV_PYTHON"] = "3.12"
                                if mcp_record.env_vars:
                                    env.update(mcp_record.env_vars)

                                # Força args para Lista se vier como Dict do banco por algum motivo
                                mcp_args = mcp_record.args or []
                                if isinstance(mcp_args, dict):
                                    mcp_args = [str(v) for v in mcp_args.values()]
                                
                                log_debug(f"Starting stdio MCP: {command} {' '.join(mcp_args)}")
                                try:
                                    params = StdioServerParameters(
                                        command=command,
                                        args=mcp_args,
                                        env=env
                                    )
                                    adapter = MCPServerAdapter(params, connect_timeout=120)
                                except Exception as pe:
                                    log_debug(f"Failed to create StdioServerParameters or Adapter for {mcp_record.name}: {str(pe)}")
                                    continue
                            else:
                                # SSE (Em desenvolvimento - Requer SseClientParameters do SDK MCP)
                                log_debug(f"SSE transport not yet supported for {mcp_record.name}")
                                continue
                            
                            log_debug(f"Connecting to MCP {mcp_record.name} via stack.enter_context...")
                            try:
                                # Entramos no contexto do adapter para ativar a conexão (Retorna a lista de ferramentas)
                                raw_tools = stack.enter_context(adapter)
                                log_debug(f"MCP {mcp_record.name} connected. Found {len(raw_tools if raw_tools else [])} raw tools.")
                            except Exception as ce:
                                log_debug(f"Failed to enter MCP context for {mcp_record.name}: {str(ce)}")
                                continue
                            
                            if not raw_tools:
                                log_debug(f"Warning: MCP server {mcp_record.name} returned 0 tools.")
                            
                            # Playwright Schema Injection & Filtering
                            is_playwright = "playwright" in mcp_record.name.lower() or any("playwright" in str(arg).lower() for arg in (mcp_record.args or []))
                            
                            processed_tools = []
                            if is_playwright:
                                allowed_suffixes = ["browser_navigate", "browser_click", "browser_type", "browser_snapshot"]
                                for mcp_tool in raw_tools:
                                    if any(mcp_tool.name.endswith(s) for s in allowed_suffixes):
                                        processed_tools.append(mcp_tool)
                                    else:
                                        log_debug(f"Skipping non-essential Playwright tool: {mcp_tool.name}")
                            else:
                                processed_tools.extend(raw_tools)
                            
                            mcp_adapters_cache[str(mcp_id)] = processed_tools
                            
                            for mcp_tool in processed_tools:
                                # Workspace Guard (only for non-MCP for now to be safe, or if you want it enabled)
                                # wrap_tool_with_workspace_guard(mcp_tool, workspace_path)
                                pass
                                
                            mcp_adapters_cache[str(mcp_id)] = processed_tools
                        except Exception as e:
                            log_debug(f"Connection failed for {mcp_record.name}: {str(e)}")
                def resolve_node_tools(node_data, node_name, include_mcp=True):
                    node_tools = []
                    
                    # 1. Default Tools (globalTools)
                    global_ids = getattr(node_data, 'globalToolIds', []) or []
                    global_configs = {t.id: t for t in (graph_data.globalTools or [])}
                    
                    for gid in global_ids:
                        config = global_configs.get(gid)
                        if not config or not config.isEnabled:
                            continue
                            
                        try:
                            if gid == 'serper':
                                node_tools.append(SerperDevTool(api_key=config.apiKey))
                            elif gid == 'scrape':
                                node_tools.append(ScrapeWebsiteTool())
                            elif gid == 'directory_read':
                                node_tools.append(DirectoryReadTool(directory=workspace_path))
                            elif gid == 'file_read':
                                # Use workspace-aware version if path available
                                if workspace_path:
                                    node_tools.append(WorkspaceFileReadTool(workspace_path=workspace_path))
                                else:
                                    node_tools.append(FileReadTool()) 
                            elif gid == 'file_write':
                                # Use workspace-aware version if path available
                                if workspace_path:
                                    node_tools.append(WorkspaceFileWriterTool(workspace_path=workspace_path))
                                else:
                                    node_tools.append(FileWriterTool())
                            elif gid == 'directory_search':
                                node_tools.append(DirectorySearchTool(directory=workspace_path))
                            elif gid == 'pdf_search':
                                node_tools.append(PDFSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            elif gid == 'docx_search':
                                node_tools.append(DOCXSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            elif gid == 'json_search':
                                node_tools.append(JSONSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            elif gid == 'xml_search':
                                node_tools.append(XMLSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            elif gid == 'csv_search':
                                node_tools.append(CSVSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            elif gid == 'mdx_search':
                                node_tools.append(MDXSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            elif gid == 'txt_search':
                                node_tools.append(TXTSearchTool(config={'directory': workspace_path} if workspace_path else {}))
                            
                            log_debug(f"Default tool '{gid}' added to {node_name}")
                        except Exception as ge:
                            log_debug(f"Failed to instantiate default tool '{gid}': {str(ge)}")

                    if include_mcp:
                        mcp_ids = getattr(node_data, 'mcpServerIds', []) or []
                        log_debug(f"Node {node_name} requesting tools for MCP IDs: {mcp_ids}")
                        for mid in mcp_ids:
                            mid_str = str(mid)
                            if mid_str in mcp_adapters_cache:
                                tools_to_add = mcp_adapters_cache[mid_str]
                                if isinstance(tools_to_add, list):
                                    node_tools.extend(tools_to_add)
                                    log_debug(f"Node {node_name} received {len(tools_to_add)} tools from MCP {mid_str}")
                                else:
                                    log_debug(f"Warning: Cached MCP item for {mid_str} is not a list: {type(tools_to_add)}")
                            else:
                                log_debug(f"Warning: MCP ID {mid_str} not found in mcp_adapters_cache. Cache Keys: {list(mcp_adapters_cache.keys())}")
                    
                    custom_ids = getattr(node_data, 'customToolIds', []) or []
                    for cid in custom_ids:
                        tool_def = next((t for t in (graph_data.customTools or []) if t.id == cid), None)
                        if not tool_def:
                            log_debug(f"Warning: Custom tool {cid} code not found in graph_data.")
                            continue
                        
                        try:
                            # Use a different name for the decorator in the namespace if needed, 
                            # but "tool" matches what's in the boilerplate.
                            tool_namespace = {
                                "tool": tool,
                                "BaseModel": BaseModel,
                                "Field": Field,
                                "os": get_safe_os_module(workspace_path),
                                "json": json,
                                "Path": get_safe_pathlib(workspace_path),
                                "open": get_safe_open(workspace_path),
                                "Optional": typing.Optional,
                                "Union": typing.Union,
                                "List": typing.List,
                                "Dict": typing.Dict,
                                "Literal": getattr(typing, 'Literal', None), # Compatibility
                                "WORKSPACE_PATH": workspace_path or "./"
                            }
                            log_debug(f"Injecting WORKSPACE_PATH: {workspace_path} into custom tool '{tool_def.name}'")
                            
                            # Use explicit globals and locals to ensure __annotations__ and other metadata are handled correctly
                            tool_globals = tool_namespace
                            tool_locals = {}
                            
                            exec(tool_def.code, tool_globals, tool_locals)
                            
                            found_tool = None
                            
                            # Discovery: prioritiza o que foi definido (locals)
                            # 1. Check for BaseTool instances
                            for obj in tool_locals.values():
                                if isinstance(obj, BaseTool):
                                    found_tool = obj
                                    break
                            
                            if not found_tool:
                                # 2. Check for decorated functions
                                for obj in tool_locals.values():
                                    if callable(obj) and hasattr(obj, 'name') and not isinstance(obj, type):
                                        found_tool = obj
                                        break
                                        
                            if not found_tool:
                                # 3. Check for functions matching the tool name
                                normalized_db_name = tool_def.name.lower().replace(" ", "_")
                                for t_name, obj in tool_locals.items():
                                    if callable(obj) and not isinstance(obj, type) and t_name.lower() == normalized_db_name:
                                        found_tool = tool(obj)
                                        break
                            
                            if not found_tool:
                                # 4. Fallback to any callable in locals that isn't one of our injected ones
                                reserved_names = ["tool", "BaseModel", "Field", "os", "json", "Path", "Optional", "Union", "List", "Dict", "Literal"]
                                for t_name, obj in tool_locals.items():
                                    if callable(obj) and not isinstance(obj, type) and t_name not in reserved_names:
                                        found_tool = tool(obj)
                                        break
                            
                            if found_tool:
                                # REMOVA ESTA LINHA: wrap_tool_with_workspace_guard(found_tool, workspace_path)
                                try:
                                    # Ensure metadata
                                    if not hasattr(found_tool, 'name') or not found_tool.name:
                                        found_tool.name = tool_def.name.lower().replace(" ", "_")
                                    if not hasattr(found_tool, 'description') or not found_tool.description or found_tool.description == "None":
                                        found_tool.description = tool_def.description or f"Custom tool {tool_def.name}"
                                except Exception:
                                    pass
                                
                                node_tools.append(found_tool)
                                log_debug(f"Custom tool '{getattr(found_tool, 'name', 'unnamed')}' successfully injected into {node_name}.")
                            else:
                                log_debug(f"Error: No valid function or tool found in code for '{tool_def.name}'.")
                        except Exception as te:
                            log_debug(f"Failed to execute custom tool '{tool_def.name}' for {node_name}: {str(te)}")
                    
                    return node_tools

                agents_map: Dict[str, Agent] = {}
                for node in agent_nodes:
                    role = node.data.role
                    goal = node.data.goal
                    backstory = node.data.backstory
                    name = node.data.name or f"Agent_{node.id}"
                    model_id = getattr(node.data, 'modelId', None)
                    
                    # Coleta ferramentas deste agente
                    this_agent_tools = resolve_node_tools(node.data, f"Agent {name}")

                    # LLM Setup
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

                    # Injeção de Prompt: Força o Agente a respeitar o Workspace (como restrição, não como ordem)
                    workspace_instruction = (
                        f"\n\nIMPORTANT: Your current working directory is '{workspace_path}'. "
                        "All file operations (read/write) MUST be done inside this directory or its subfolders. "
                        "Never attempt to access paths outside this workspace."
                    )
                    
                    agent = Agent(
                        role=role,
                        goal=goal,
                        backstory=backstory + workspace_instruction,
                        verbose=True,
                        allow_delegation=False, 
                        step_callback=make_agent_step_callback(node.id),
                        llm=agent_llm,
                        tools=this_agent_tools,
                        reasoning=False,
                        max_iter=getattr(node.data, 'max_iter', 60),
                        max_execution_time=getattr(node.data, 'max_execution_time', 300)
                    )
                    agents_map[node.id] = agent
                    
                    tool_names = [getattr(t, 'name', str(t)) for t in this_agent_tools]
                    log_debug(f"Agent {name} (ID: {node.id}) successfully initialized with {len(this_agent_tools)} tools: {tool_names}")

                # --- 3. Instanciação de Tasks (Re-regrando links com agentes criados) ---
                tasks_list: List[Task] = []
                tasks_dict: Dict[str, Task] = {}

                for node in task_nodes:
                    description = node.data.description
                    expected_output = node.data.expected_output
                    task_name = node.data.name or f"Task_{node.id}"
                    
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
                    log_debug(f"Task {task_name} assigned to Agent {target_agent.role if hasattr(target_agent, 'role') else source_agent_id}")
                    
                    # Resolve ferramentas da Task (Apenas Custom/Global Tools, sem MCP para Tasks como solicitado)
                    this_task_tools = resolve_node_tools(node.data, f"Task {task_name}", include_mcp=False)
                        
                    # Injeção de Prompt na Task para reforçar o workspace (como restrição, não como ordem)
                    workspace_task_instruction = (
                        f"\n\nIMPORTANT: Your current working directory is '{workspace_path}'. "
                        "All file operations (read/write) MUST be done inside this directory or its subfolders. "
                        "Never attempt to access paths outside this workspace."
                    )
                    
                    # Para garantir que o agente não perca seus poderes (como Browser/MCP) 
                    # definidos no nível de Agente, somamos as ferramentas do agente às da Task.
                    # No CrewAI, se passarmos tools para a Task, elas substituem as do agente se nâo houver soma.
                    # Usamos um dict para garantir que ferramentas com o mesmo nome não se dupliquem.
                    combined_tools_dict = {getattr(t, 'name', str(t)): t for t in (target_agent.tools or [])}
                    combined_tools_dict.update({getattr(t, 'name', str(t)): t for t in this_task_tools})
                    combined_tools = list(combined_tools_dict.values())

                    task = Task(
                        description=description + workspace_task_instruction,
                        expected_output=expected_output,
                        agent=target_agent,
                        tools=combined_tools,
                        callback=make_task_callback(node.id)
                    )
                    tasks_list.append(task)
                    tasks_dict[node.id] = task

                    tool_names = [getattr(t, 'name', str(t)) for t in this_task_tools]
                    if this_task_tools:
                        log_debug(f"Task {task_name} initialized with {len(this_task_tools)} tools: {tool_names}")

                # --- 4. Ordenação e Vinculação de Contexto ---
                # Precisamos garantir que as tasks sejam executadas na ordem correta
                # se houver dependência de context.
                
                final_tasks_ordered: List[Task] = []
                final_task_ids_ordered: List[str] = []
                visited = set()
                visiting = set() # Rastreia a pilha atual para detectar ciclos
                
                def add_task_with_context(tid):
                    if tid in visited or tid not in tasks_dict:
                        return
                    
                    if tid in visiting:
                        log_debug(f"ERRO CRÍTICO: Ciclo detectado envolvendo a Task {tid}. Quebrando o loop para evitar crash.")
                        return # Interrompe a recursão deste galho
                        
                    visiting.add(tid)
                    
                    # 1. Pega os contexts desta task
                    node = nodes.get(tid)
                    if not node:
                        visiting.remove(tid)
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
                    
                    visiting.remove(tid)

                # --- NOVA LÓGICA DE ORDENAÇÃO À PROVA DE BALAS (Baseada em Edges) ---
                
                base_task_queue = []
                
                # 1. Ordem oficial dos agentes
                agent_order = getattr(crew_node.data, 'agentOrder', []) if crew_node else []
                if not agent_order:
                    agent_order = [n.id for n in agent_nodes]

                # 2. Agrupa as tasks por agente lendo as linhas (edges) do canvas
                agent_to_tasks = {ag_id: [] for ag_id in agent_order}
                agent_ids_set = set(agent_order)

                for edge in edges:
                    if edge.source in agent_ids_set and edge.target in tasks_dict:
                        agent_to_tasks[edge.source].append(edge.target)

                # 3. Monta a fila respeitando rigorosamente a vez de cada agente
                for ag_id in agent_order:
                    tasks_of_agent = agent_to_tasks[ag_id]
                    
                    # Tenta organizar pela ordem salva no node (se o front enviou)
                    ag_node = nodes.get(ag_id)
                    ag_task_order = getattr(ag_node.data, 'taskOrder', []) if ag_node else []
                    
                    for tid in ag_task_order:
                        if tid in tasks_of_agent and tid not in base_task_queue:
                            base_task_queue.append(tid)
                            
                    # Força a adição de tasks que estão conectadas pela Edge, mas faltaram no array
                    for tid in tasks_of_agent:
                        if tid not in base_task_queue:
                            base_task_queue.append(tid)

                # 4. Fallback para tasks órfãs (segurança extra)
                for t_node in task_nodes:
                    if t_node.id not in base_task_queue and t_node.id in tasks_dict:
                        base_task_queue.append(t_node.id)

                # 5. Executa a montagem final de dependências de contexto
                for tid in base_task_queue:
                    add_task_with_context(tid)

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
                
                log_debug(f"Kicking off Crew with inputs: {execution_inputs}")
                
                result = crew.kickoff(inputs=execution_inputs)
                q.put(json.dumps({"type": "final_result", "result": str(result)}) + "\n")

            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                log_debug(f"CRITICAL ERROR during worker execution:\n{error_trace}")
                q.put(json.dumps({"type": "error", "error": f"{str(e)}\n{error_trace}"}) + "\n")
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
