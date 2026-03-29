import sys
import threading
import queue
import json
import typing
import uuid
import datetime
import traceback
from typing import Dict, List, Iterator, Any, Optional
from pathlib import Path
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool, BaseTool
from crewai.llm import LLM
import os
from pydantic import BaseModel, Field
from .models import LLMModel, Credential, MCPServer, AppSettings, Workspace, Execution, ExecutionStatus
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
from .tools.knowledge_base_search import get_search_knowledge_base_tool
from .database import engine
from sqlmodel import Session, select
from dotenv import load_dotenv
from contextlib import ExitStack, redirect_stdout
import contextlib

from .utils import normalize_command

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

def run_crew_stream(graph_data: GraphData, workspace_id: Optional[Any] = None, inputs: Optional[Dict[str, Any]] = None, execution_id: Optional[typing.Union[str, uuid.UUID]] = None) -> Iterator[str]:
    import time
    start_time = time.time()
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
    
    # Mescla com inputs externos (ex: vindo de Webhook)
    if inputs:
        execution_inputs.update(inputs)

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
    tracked_statuses: Dict[str, str] = {}
    
    def make_agent_step_callback(agent_id: str):
        def cb(step_output):
            tracked_statuses[agent_id] = "running"
            q.put(json.dumps({"type": "status", "nodeId": agent_id, "status": "running"}) + "\n")
        return cb

    def emit_task_running(task_id: str):
        tracked_statuses[task_id] = "running"
        q.put(json.dumps({"type": "status", "nodeId": task_id, "status": "running"}) + "\n")
        agent_id = task_to_agent_map.get(task_id)
        if agent_id:
            tracked_statuses[agent_id] = "running"
            q.put(json.dumps({"type": "status", "nodeId": agent_id, "status": "running"}) + "\n")
    
    def make_task_callback(task_id: str):
        def cb(output):
            tracked_statuses[task_id] = "success"
            agent_id = task_to_agent_map.get(task_id)
            if agent_id:
                tracked_statuses[agent_id] = "success"
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
        nonlocal start_time
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
                                command = normalize_command(mcp_record.command)
                                
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
                    
                    disabled_ids = getattr(node_data, 'disabledToolIds', []) or []
                    
                    for entry in global_ids:
                        gid = entry
                        config_data = {}
                        
                        if isinstance(entry, dict):
                            gid = entry.get("id")
                            config_data = entry.get("config", {})
                            
                        if gid in disabled_ids:
                            log_debug(f"Tool '{gid}' is disabled for {node_name}. Skipping.")
                            continue

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
                                if workspace_path:
                                    node_tools.append(WorkspaceFileReadTool(workspace_path=workspace_path))
                                else:
                                    node_tools.append(FileReadTool()) 
                            elif gid == 'file_write':
                                if workspace_path:
                                    node_tools.append(WorkspaceFileWriterTool(workspace_path=workspace_path))
                                else:
                                    node_tools.append(FileWriterTool())
                            elif gid == 'directory_search':
                                node_tools.append(DirectorySearchTool(directory=workspace_path))
                            elif gid == 'search_knowledge_base':
                                kb_id = config_data.get("knowledge_base_id")
                                if kb_id:
                                    node_tools.append(get_search_knowledge_base_tool(kb_id=kb_id))
                            elif gid in ['pdf_search', 'docx_search', 'json_search', 'xml_search', 'csv_search', 'mdx_search', 'txt_search']:
                                # RAG Tools: Use provided config (like knowledge_base_id)
                                tool_config = {'directory': workspace_path} if workspace_path else {}
                                if config_data:
                                    tool_config.update(config_data)
                                
                                if gid == 'pdf_search': node_tools.append(PDFSearchTool(config=tool_config))
                                elif gid == 'docx_search': node_tools.append(DOCXSearchTool(config=tool_config))
                                elif gid == 'json_search': node_tools.append(JSONSearchTool(config=tool_config))
                                elif gid == 'xml_search': node_tools.append(XMLSearchTool(config=tool_config))
                                elif gid == 'csv_search': node_tools.append(CSVSearchTool(config=tool_config))
                                elif gid == 'mdx_search': node_tools.append(MDXSearchTool(config=tool_config))
                                elif gid == 'txt_search': node_tools.append(TXTSearchTool(config=tool_config))
                            
                            log_debug(f"Default tool '{gid}' added to {node_name} with config: {config_data}")
                        except Exception as ge:
                            log_debug(f"Failed to instantiate default tool '{gid}': {str(ge)}")

                    if include_mcp:
                        mcp_ids = getattr(node_data, 'mcpServerIds', []) or []
                        log_debug(f"Node {node_name} requesting tools for MCP IDs: {mcp_ids}")
                        for mid in mcp_ids:
                            mid_str = str(mid)
                            if mid_str in disabled_ids:
                                log_debug(f"MCP Server '{mid_str}' is disabled for {node_name}. Skipping.")
                                continue
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
                        if cid in disabled_ids:
                            log_debug(f"Custom Tool '{cid}' is disabled for {node_name}. Skipping.")
                            continue
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
                    fc_llm = None
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
                                if getattr(node.data, 'temperature', None) is not None:
                                    llm_params["temperature"] = node.data.temperature
                                    
                                if llm_config.max_tokens is not None: llm_params["max_tokens"] = llm_config.max_tokens
                                if getattr(llm_config, 'max_completion_tokens', None) is not None: llm_params["max_completion_tokens"] = llm_config.max_completion_tokens
                                if llm_config.base_url and llm_config.base_url != "default": llm_params["base_url"] = llm_config.base_url
                                if credential.provider: llm_params["provider"] = credential.provider
                                agent_llm = LLM(**llm_params)

                        fc_id = getattr(node.data, 'function_calling_llm_id', None)
                        if fc_id:
                            fc_config = session.get(LLMModel, fc_id)
                            if fc_config:
                                credential = session.get(Credential, fc_config.credential_id)
                                if credential:
                                    llm_params = {
                                        "model": fc_config.model_name,
                                        "api_key": credential.key,
                                    }
                                    if fc_config.temperature is not None: llm_params["temperature"] = fc_config.temperature
                                    if fc_config.max_tokens is not None: llm_params["max_tokens"] = fc_config.max_tokens
                                    if getattr(fc_config, 'max_completion_tokens', None) is not None: llm_params["max_completion_tokens"] = fc_config.max_completion_tokens
                                    if fc_config.base_url and fc_config.base_url != "default": llm_params["base_url"] = fc_config.base_url
                                    if credential.provider: llm_params["provider"] = credential.provider
                                    fc_llm = LLM(**llm_params)

                    # Injeção de Prompt: Força o Agente a respeitar o Workspace (como restrição, não como ordem)
                    workspace_instruction = (
                        f"\n\nIMPORTANT: Your current working directory is '{workspace_path}'. "
                        "All file operations (read/write) MUST be done inside this directory or its subfolders. "
                        "Never attempt to access paths outside this workspace."
                    )
                    
                    # Se o agente tiver a ferramenta de busca, reforçamos que ele DEVE usar
                    has_rag = any(getattr(t, 'name', '') == "company_knowledge_search" for t in this_agent_tools)
                    if has_rag:
                        workspace_instruction += (
                            "\n\nCRITICAL: You MUST use the 'company_knowledge_search' tool to look up documentation and code "
                            "BEFORE answering any questions about the project, architecture, or specific files. "
                            "Do not rely on your internal knowledge if project-specific information is available."
                        )
                    
                    agent_kwargs = {
                        "role": role,
                        "goal": goal,
                        "backstory": backstory + workspace_instruction,
                        "step_callback": make_agent_step_callback(node.id),
                        "llm": agent_llm,
                        "tools": this_agent_tools,
                        "verbose": getattr(node.data, 'verbose', True) is not False,
                        "allow_delegation": getattr(node.data, 'allow_delegation', False) is True,
                        "cache": getattr(node.data, 'cache', True) is not False,
                        "allow_code_execution": getattr(node.data, 'allow_code_execution', False) is True,
                        "respect_context_window": getattr(node.data, 'respect_context_window', True) is not False,
                        "use_system_prompt": getattr(node.data, 'use_system_prompt', True) is not False,
                        "reasoning": getattr(node.data, 'reasoning', False) is True,
                        "multimodal": getattr(node.data, 'multimodal', False) is True,
                        "inject_date": getattr(node.data, 'inject_date', False) is True,
                    }
                    if fc_llm:
                        agent_kwargs["function_calling_llm"] = fc_llm
                        
                    max_iter = getattr(node.data, 'max_iter', 25)
                    if max_iter is not None: agent_kwargs["max_iter"] = max_iter
                    
                    max_retry_limit = getattr(node.data, 'max_retry_limit', 2)
                    if max_retry_limit is not None: agent_kwargs["max_retry_limit"] = max_retry_limit
                    
                    max_rpm = getattr(node.data, 'max_rpm', None)
                    if max_rpm is not None: agent_kwargs["max_rpm"] = max_rpm
                    
                    max_exec_time = getattr(node.data, 'max_execution_time', None)
                    if max_exec_time is not None: agent_kwargs["max_execution_time"] = max_exec_time
                    
                    max_reasoning_attempts = getattr(node.data, 'max_reasoning_attempts', None)
                    if max_reasoning_attempts is not None: agent_kwargs["max_reasoning_attempts"] = max_reasoning_attempts
                    
                    date_format = getattr(node.data, 'date_format', None)
                    if date_format: agent_kwargs["date_format"] = date_format
                    
                    system_template = getattr(node.data, 'system_template', None)
                    if system_template: agent_kwargs["system_template"] = system_template
                    
                    prompt_template = getattr(node.data, 'prompt_template', None)
                    if prompt_template: agent_kwargs["prompt_template"] = prompt_template
                    
                    response_template = getattr(node.data, 'response_template', None)
                    if response_template: agent_kwargs["response_template"] = response_template
                    
                    code_exec_mode = getattr(node.data, 'code_execution_mode', None)
                    max_exec = getattr(node.data, 'max_execution_time', None)
                    if max_exec is not None: agent_kwargs["max_execution_time"] = max_exec
                    
                    code_exec_mode = getattr(node.data, 'code_execution_mode', None)
                    if code_exec_mode in ("safe", "unsafe") and getattr(node.data, 'allow_code_execution', False):
                        agent_kwargs["code_execution_mode"] = code_exec_mode

                    agent = Agent(**agent_kwargs)
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
                    
                    # Encontra o agente vinculado a esta task
                    # Prioridade 1: Borda visual (Edge)
                    agent_ids = {n.id for n in agent_nodes}
                    task_agent_edge = next((e for e in edges if e.target == node.id and e.source in agent_ids), None)
                    
                    source_agent_id = None
                    if task_agent_edge:
                        source_agent_id = task_agent_edge.source
                    else:
                        # Prioridade 2: Campo explícito agentId (configurado no drawer)
                        source_agent_id = getattr(node.data, 'agentId', None)
                    
                    if not source_agent_id or source_agent_id not in agents_map: 
                        log_debug(f"Warning: Task {task_name} (ID: {node.id}) has no valid agent assigned. Skipping.")
                        continue
                    
                    target_agent = agents_map[source_agent_id]
                    log_debug(f"Task {task_name} assigned to Agent {target_agent.role if hasattr(target_agent, 'role') else source_agent_id}")
                    
                    # Resolve ferramentas da Task (Custom/Global Tools + MCP)
                    this_task_tools = resolve_node_tools(node.data, f"Task {task_name}", include_mcp=True)
                        
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

                    task_kwargs = {
                        "description": description + workspace_task_instruction,
                        "expected_output": expected_output,
                        "agent": target_agent,
                        "tools": combined_tools,
                        "callback": make_task_callback(node.id)
                    }
                    
                    if getattr(node.data, 'async_execution', False) is True:
                        task_kwargs['async_execution'] = True
                        
                    if getattr(node.data, 'human_input', False) is True:
                        task_kwargs['human_input'] = True
                        
                    if getattr(node.data, 'create_directory', True) is False:
                        task_kwargs['create_directory'] = False

                    if getattr(node.data, 'output_json', False) is True:
                        task_kwargs['output_json'] = True

                    if getattr(node.data, 'output_pydantic', False) is True:
                        # Note: In a real scenario, this would require a Pydantic class.
                        # For now, we set it as True if found, but CrewAI usually expects a class.
                        task_kwargs['output_pydantic'] = True
                        
                    output_file = getattr(node.data, 'output_file', None)
                    if output_file:
                        task_kwargs['output_file'] = output_file
                        
                    task = Task(**task_kwargs)
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
                crew_kwargs = {
                    "agents": list(agents_map.values()),
                    "tasks": final_tasks_ordered,
                    "process": process_type
                }
                
                if crew_node:
                    data = crew_node.data
                    if getattr(data, 'verbose', True) is False:
                        crew_kwargs["verbose"] = False
                    else:
                        crew_kwargs["verbose"] = True
                        
                    if getattr(data, 'memory', False) is True:
                        crew_kwargs["memory"] = True
                        
                    if getattr(data, 'cache', True) is False:
                        crew_kwargs["cache"] = False
                        
                    if getattr(data, 'planning', False) is True:
                        crew_kwargs["planning"] = True
                        
                    if getattr(data, 'share_crew', False) is True:
                        crew_kwargs["share_crew"] = True
                        
                    max_rpm = getattr(data, 'max_rpm', None)
                    if max_rpm is not None:
                        crew_kwargs["max_rpm"] = max_rpm

                    with Session(engine) as session:
                        manager_id = getattr(data, 'manager_llm_id', None)
                        if manager_id:
                            manager_config = session.get(LLMModel, manager_id)
                            if manager_config:
                                credential = session.get(Credential, manager_config.credential_id)
                                if credential:
                                    llm_params = {
                                        "model": manager_config.model_name,
                                        "api_key": credential.key,
                                    }
                                    if credential.provider: llm_params["provider"] = credential.provider
                                    if manager_config.base_url and manager_config.base_url != "default": llm_params["base_url"] = manager_config.base_url
                                    if manager_config.temperature is not None: llm_params["temperature"] = manager_config.temperature
                                    if manager_config.max_tokens is not None: llm_params["max_tokens"] = manager_config.max_tokens
                                    if getattr(manager_config, 'max_completion_tokens', None) is not None: llm_params["max_completion_tokens"] = manager_config.max_completion_tokens
                                    crew_kwargs["manager_llm"] = LLM(**llm_params)
                                    
                        planning_id = getattr(data, 'planning_llm_id', None)
                        if planning_id:
                            planning_config = session.get(LLMModel, planning_id)
                            if planning_config:
                                credential = session.get(Credential, planning_config.credential_id)
                                if credential:
                                    llm_params = {
                                        "model": planning_config.model_name,
                                        "api_key": credential.key,
                                    }
                                    if credential.provider: llm_params["provider"] = credential.provider
                                    if planning_config.base_url and planning_config.base_url != "default": llm_params["base_url"] = planning_config.base_url
                                    if planning_config.temperature is not None: llm_params["temperature"] = planning_config.temperature
                                    if planning_config.max_tokens is not None: llm_params["max_tokens"] = planning_config.max_tokens
                                    if getattr(planning_config, 'max_completion_tokens', None) is not None: llm_params["max_completion_tokens"] = planning_config.max_completion_tokens
                                    crew_kwargs["planning_llm"] = LLM(**llm_params)

                        fc_id = getattr(data, 'function_calling_llm_id', None)
                        if fc_id:
                            fc_config = session.get(LLMModel, fc_id)
                            if fc_config:
                                credential = session.get(Credential, fc_config.credential_id)
                                if credential:
                                    llm_params = {
                                        "model": fc_config.model_name,
                                        "api_key": credential.key,
                                    }
                                    if credential.provider: llm_params["provider"] = credential.provider
                                    if fc_config.base_url and fc_config.base_url != "default": llm_params["base_url"] = fc_config.base_url
                                    if fc_config.temperature is not None: llm_params["temperature"] = fc_config.temperature
                                    if fc_config.max_tokens is not None: llm_params["max_tokens"] = fc_config.max_tokens
                                    if getattr(fc_config, 'max_completion_tokens', None) is not None: llm_params["max_completion_tokens"] = fc_config.max_completion_tokens
                                    crew_kwargs["function_calling_llm"] = LLM(**llm_params)

                    embedder_conf = getattr(data, 'embedder', None)
                    if embedder_conf:
                        try:
                            crew_kwargs["embedder"] = json.loads(embedder_conf)
                        except Exception as e:
                            log_debug(f"Failed to parse embedder JSON config: {e}")

                    output_log = getattr(data, 'output_log_file', None)
                    if output_log:
                        crew_kwargs["output_log_file"] = output_log

                    prompt_file = getattr(data, 'prompt_file', None)
                    if prompt_file:
                        crew_kwargs["prompt_file"] = prompt_file

                crew = Crew(**crew_kwargs)
                
                if ordered_task_ids:
                    emit_task_running(ordered_task_ids[0])
                
                log_debug(f"Kicking off Crew with inputs: {execution_inputs}")
                
                result = crew.kickoff(inputs=execution_inputs)
                final_output = str(result)
                
                # Update Execution in database if id provided
                if execution_id:
                    try:
                        with Session(engine) as session:
                            execution = session.get(Execution, execution_id)
                            if execution:
                                execution.status = ExecutionStatus.SUCCESS
                                execution.output_data = {"result": final_output, "node_statuses": tracked_statuses}
                                execution.duration = time.time() - start_time
                                session.add(execution)
                                session.commit()
                    except Exception as db_err:
                        log_debug(f"DB Update Error (Success): {db_err}")

                q.put(json.dumps({"type": "final_result", "result": final_output}) + "\n")

            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                log_debug(f"CRITICAL ERROR during worker execution:\n{error_trace}")
                
                # Update Execution status to Error
                if execution_id:
                    try:
                        with Session(engine) as session:
                            execution = session.get(Execution, execution_id)
                            if execution:
                                for nid, nstatus in tracked_statuses.items():
                                    if nstatus == "running":
                                        tracked_statuses[nid] = "error"
                                        
                                execution.status = ExecutionStatus.ERROR
                                execution.output_data = {"error": str(e), "traceback": error_trace, "node_statuses": tracked_statuses}
                                execution.duration = time.time() - start_time
                                session.add(execution)
                                session.commit()
                    except Exception as db_err:
                        log_debug(f"DB Update Error (Failure): {db_err}")
                
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
