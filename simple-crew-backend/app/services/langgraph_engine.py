import operator
import functools
import inspect
import jinja2
import logging
import json
import uuid
import time
import re
import queue
import threading
import traceback
import os
import builtins
from pathlib import Path
from typing import Dict, Any, Type, List, Optional, Callable, Annotated, TypedDict, Union
from pydantic import BaseModel, Field, create_model
from sqlmodel import Session, select
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool, StructuredTool
from langgraph.prebuilt import ToolNode
from contextlib import ExitStack
from mcp import StdioServerParameters

from app.schemas import GraphData, Node, Edge, CustomTool, ToolConfig
from app.models import LLMModel, Credential, Execution, ExecutionStatus, MCPServer, AgentSkill
from mcp_adapter import MCPServerAdapter

# ─────────────────────────────── safety utils ───────────────────────────────

def neutralize_path(path: str, abs_workspace: str) -> str:
    """
    Transforms any path (absolute or relative) into a safe path within the workspace.
    """
    if not path:
        return abs_workspace
    abs_path = os.path.abspath(path)
    if abs_path.startswith(abs_workspace):
        return abs_path
    cwd = os.getcwd()
    try:
        rel_to_cwd = os.path.relpath(abs_path, cwd)
    except ValueError:
        _, path_no_drive = os.path.splitdrive(path)
        rel_to_cwd = path_no_drive.lstrip('./\\')
    safe_rel = rel_to_cwd.replace('..', '').lstrip('./\\')
    return os.path.join(abs_workspace, safe_rel)

def get_safe_open(workspace_path: str):
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
            for name in dir(real_os):
                setattr(self, name, getattr(real_os, name))
        def _enforce(self, path):
            return neutralize_path(path, abs_workspace)
        def mkdir(self, path, mode=0o777): return real_os.mkdir(self._enforce(path), mode)
        def makedirs(self, name, mode=0o777, exist_ok=False): return real_os.makedirs(self._enforce(name), mode, exist_ok)
        def remove(self, path): return real_os.remove(self._enforce(path))
        def rmdir(self, path): return real_os.rmdir(self._enforce(path))
        def listdir(self, path='.'): return real_os.listdir(self._enforce(path))
        def chdir(self, path): pass # Forbidden to change global CWD

    return SafeOS()

def normalize_command(cmd: str) -> str:
    """Ensures cross-platform compatibility for common ecosystem commands."""
    if not cmd:
        return cmd
    
    # Map command variants (portability)
    mapping = {
        "npx.cmd": "npx",
        "npm.cmd": "npm",
        "python.exe": "python",
        "uv.exe": "uv"
    }
    
    cmd_lower = cmd.lower()
    for source, target in mapping.items():
        if cmd_lower == source:
            return target
            
    return cmd

# Configure logger
logger = logging.getLogger(__name__)


def merge_dicts(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Reducer that merges two dictionaries."""
    res = (a or {}).copy()
    res.update(b or {})
    return res

class LangGraphCompiler:
    def __init__(self, graph_data: GraphData, session: Session, workspace_id: Optional[str] = None, mcp_tools: Optional[Dict[str, List[Any]]] = None):
        self.graph_data = graph_data
        self.session = session
        self.workspace_id = workspace_id
        self.mcp_tools_cache = mcp_tools or {} # Pre-connected MCP tools
        self.nodes_map = {node.id: node for node in graph_data.nodes}
        self.edges = graph_data.edges
        self.schema_models: Dict[str, Type[BaseModel]] = {}
        self.emit: Optional[Callable[[Dict], None]] = None
        self.node_tasks_map: Dict[str, List[str]] = {}

    # ─────────────────────────────── helpers ───────────────────────────────

    def _emit(self, event: Dict) -> None:
        """Safely call self.emit if it has been wired up."""
        if self.emit:
            self.emit(event)

    def _wrap_tool_with_status_emitter(self, tool_instance: Any, visual_node_id: str) -> Any:
        """
        Wraps a tool instance to emit running/success/error events.
        Creates a NEW StructuredTool instance instead of mutating the original tool,
        which is critical for shared tools (like MCP) used by multiple agents.
        """
        from langchain_core.tools import StructuredTool
        
        # Capture original tool properties
        name = getattr(tool_instance, 'name', 'unknown_tool')
        description = getattr(tool_instance, 'description', '')
        args_schema = getattr(tool_instance, 'args_schema', None)

        def sync_wrapper(*args, **kwargs):
            self._emit({"type": "status", "nodeId": visual_node_id, "status": "running"})
            try:
                # Use invoke to handle both LangChain and duck-typed tools
                # CRITICAL: For CrewAI or MCP tools, calling `.invoke(dict)` stringifies the dictionary
                # and breaks parameters (like "missing parameter: method"). We must natively unpack kwargs!
                is_crew_tool = ('crewai' in tool_instance.__class__.__module__ or 'mcp' in str(type(tool_instance)))
                
                if is_crew_tool and hasattr(tool_instance, '_run'):
                    result = tool_instance._run(*args, **kwargs)
                elif is_crew_tool and hasattr(tool_instance, 'run') and callable(tool_instance.run):
                    # Some CrewAI tools only implement run
                    try:
                        result = tool_instance.run(*args, **kwargs)
                    except TypeError:
                        # Fallback if it only accepts a single dict
                        result = tool_instance.run(args[0] if args else kwargs)
                elif hasattr(tool_instance, 'invoke'):
                    input_data = args[0] if args else kwargs
                    # Try native invoke, but fallback to _run if it fails with type/missing param errors
                    try:
                        result = tool_instance.invoke(input_data)
                    except Exception as invoke_err:
                        if hasattr(tool_instance, '_run'):
                            result = tool_instance._run(*args, **kwargs)
                        else:
                            raise invoke_err
                elif hasattr(tool_instance, '_run'):
                    result = tool_instance._run(*args, **kwargs)
                else:
                    # Fallback to direct call if it's just a decorated function
                    result = tool_instance(*args, **kwargs)
                
                self._emit({"type": "status", "nodeId": visual_node_id, "status": "success"})
                self._emit({"type": "log", "data": f"\n[TOOL OUTPUT] Tool {getattr(tool_instance, 'name', 'unknown')} returned: {str(result)[:1000]}\n"})
                return result
            except Exception as e:
                self._emit({"type": "status", "nodeId": visual_node_id, "status": "error"})
                logger.error(f"[TOOL ERROR] Tool {getattr(tool_instance, 'name', 'unknown')} failed synchronously: {e}\n{traceback.format_exc()}")
                raise e

        async def async_wrapper(*args, **kwargs):
            self._emit({"type": "status", "nodeId": visual_node_id, "status": "running"})
            try:
                is_crew_tool = ('crewai' in tool_instance.__class__.__module__ or 'mcp' in str(type(tool_instance)))
                
                if is_crew_tool and hasattr(tool_instance, '_arun'):
                    result = await tool_instance._arun(*args, **kwargs)
                elif is_crew_tool and hasattr(tool_instance, 'arun') and callable(tool_instance.arun):
                    try:
                        result = await tool_instance.arun(*args, **kwargs)
                    except TypeError:
                        result = await tool_instance.arun(args[0] if args else kwargs)
                elif hasattr(tool_instance, 'ainvoke'):
                    input_data = args[0] if args else kwargs
                    try:
                        result = await tool_instance.ainvoke(input_data)
                    except Exception as invoke_err:
                        if hasattr(tool_instance, '_arun'):
                            result = await tool_instance._arun(*args, **kwargs)
                        else:
                            raise invoke_err
                elif hasattr(tool_instance, '_arun'):
                    result = await tool_instance._arun(*args, **kwargs)
                else:
                    result = await tool_instance(*args, **kwargs)
                
                self._emit({"type": "status", "nodeId": visual_node_id, "status": "success"})
                self._emit({"type": "log", "data": f"\n[TOOL OUTPUT] Tool {getattr(tool_instance, 'name', 'unknown')} returned: {str(result)[:1000]}\n"})
                return result
            except Exception as e:
                self._emit({"type": "status", "nodeId": visual_node_id, "status": "error"})
                logger.error(f"[TOOL ERROR] Tool {getattr(tool_instance, 'name', 'unknown')} failed asynchronously: {e}\n{traceback.format_exc()}")
                raise e

        # Return a fresh StructuredTool that proxies to the original
        return StructuredTool(
            name=name,
            description=description,
            args_schema=args_schema,
            func=sync_wrapper,
            coroutine=async_wrapper
        )

    def _init_chat_model(self, model_id: str):
        """
        Initializes a LangChain ChatModel based on the DB record.
        """
        model_record = None
        if not model_id:
            model_record = self.session.exec(select(LLMModel).where(LLMModel.is_default == True)).first()
            if not model_record:
                model_record = self.session.exec(select(LLMModel)).first()
            if not model_record:
                raise ValueError("No LLM Models found in database.")
        else:
            model_record = self.session.get(LLMModel, model_id)
            if not model_record:
                raise ValueError(f"Model ID '{model_id}' not found.")

        credential = self.session.get(Credential, model_record.credential_id)
        if not credential:
            raise ValueError(f"Credential for model '{model_record.name}' not found.")

        params = {
            "model": model_record.model_name,
            "temperature": model_record.temperature if model_record.temperature is not None else 0.7,
        }
        if model_record.max_tokens:
            params["max_tokens"] = model_record.max_tokens

        provider = (credential.provider or "openai").lower()
        
        PROVIDER_MAP = {
            "openai": ChatOpenAI,
            "anthropic": ChatAnthropic,
            "google": ChatGoogleGenerativeAI
        }
        
        # Determine the key for the map (handle substrings like "openai-compatible")
        provider_key = "openai"
        if "anthropic" in provider: provider_key = "anthropic"
        elif "google" in provider: provider_key = "google"
        
        LLMClass = PROVIDER_MAP.get(provider_key, ChatOpenAI)
        
        if provider_key == "google":
            params["google_api_key"] = credential.key
        else:
            params["api_key"] = credential.key
            if model_record.base_url:
                params["base_url"] = model_record.base_url
                
        return LLMClass(**params)

    def _build_state_schema(self) -> Type:
        """
        Dynamically generates the TypedDict for the LangGraph State.
        """
        TYPE_MAP = {
            "string": str, "integer": int, "float": float,
            "boolean": bool, "list": list, "dict": dict, "any": Any
        }

        state_node = next((n for n in self.graph_data.nodes if n.type == 'state'), None)
        if not state_node:
            raise ValueError("LangGraph workflow requires a 'state' node.")

        schema_nodes = [n for n in self.graph_data.nodes if n.type == 'schema']
        for s_node in schema_nodes:
            fields_def = {
                f.key: (TYPE_MAP.get(f.type.lower(), Any), Field(description=f.description))
                for f in s_node.data.fields
            }
            model_name = s_node.data.name or f"Schema_{s_node.id[:8]}"
            self.schema_models[model_name] = create_model(model_name, **fields_def)

        state_annotations = {}
        for field in state_node.data.fields:
            field_type_raw = (field.type or "any").lower()
            base_type = TYPE_MAP.get(field_type_raw)
            if not base_type:
                base_type = self.schema_models.get(field.type, Any)

            if field.key == "messages":
                state_annotations[field.key] = Annotated[base_type, add_messages]
            elif field.reducer in ["add", "append"]:
                state_annotations[field.key] = Annotated[base_type, operator.add]
            else:
                state_annotations[field.key] = base_type

        # Force message key for ReAct memory
        if "messages" not in state_annotations:
            state_annotations["messages"] = Annotated[List[Any], add_messages]
            
        # Add task tracking
        if "task_progress" not in state_annotations:
            state_annotations["task_progress"] = Annotated[Dict[str, int], merge_dicts]

        state_name = f"State_{state_node.data.name or state_node.id[:8]}"
        return TypedDict(state_name, state_annotations)

    def _resolve_node_tools(self, node: Node) -> List[Any]:
        """
        Resolves tools for an agent node by scanning both internal data and connected edges.
        """
        resolved_tools = []
        data = node.data

        # 1. Collect Tool IDs and Map to Visual Node IDs
        custom_tool_map = {tid: None for tid in (getattr(data, 'customToolIds', []) or [])}
        global_tool_map = {tid: None for tid in (getattr(data, 'globalToolIds', []) or [])}
        mcp_server_map = {sid: None for sid in (getattr(data, 'mcpServerIds', []) or [])}

        for edge in self.edges:
            if edge.source == node.id and edge.sourceHandle in ['out-tool', 'tools', 'out-mcp', 'mcp', 'out-custom-tool']:
                target_node = self.nodes_map.get(edge.target)
                if not target_node:
                    continue
                if target_node.type == 'customTool':
                    tid = getattr(target_node.data, 'toolId', None)
                    if tid: custom_tool_map[tid] = target_node.id
                elif target_node.type == 'tool':
                    tid = getattr(target_node.data, 'toolId', None)
                    if tid: global_tool_map[tid] = target_node.id
                elif target_node.type == 'mcp':
                    sid = getattr(target_node.data, 'serverId', None)
                    if sid: mcp_server_map[sid] = target_node.id

        # 2. Resolve Custom Tools
        for tool_id, visual_node_id in custom_tool_map.items():
            ct = next((t for t in self.graph_data.customTools if t.id == tool_id), None)
            if ct:
                try:
                    # Resolve Workspace Path
                    ws_base = "./"
                    if self.workspace_id:
                        from app.models import Workspace
                        ws_record = self.session.get(Workspace, self.workspace_id)
                        if ws_record and getattr(ws_record, 'path', None):
                            ws_base = ws_record.path

                    # Rich Execution Namespace (Inspired by CrewAI robustness)
                    tool_globals = {
                        "tool": tool,
                        "BaseModel": BaseModel,
                        "Field": Field,
                        "os": get_safe_os_module(ws_base),
                        "json": json,
                        "Path": get_safe_pathlib(ws_base),
                        "open": get_safe_open(ws_base),
                        "Optional": Optional,
                        "Union": Union,
                        "List": List,
                        "Dict": Dict,
                        "Any": Any,
                        "WORKSPACE_BASE_DIR": ws_base
                    }
                    
                    local_scope = {}
                    exec(ct.code, tool_globals, local_scope)
                    
                    found_tool = None
                    # 1st Pass: Look for BaseTool instances or classes inheriting from BaseTool
                    for obj in local_scope.values():
                        # Try to detect BaseTool by duck-typing or name to be framework-agnostic
                        if hasattr(obj, 'name') and hasattr(obj, 'description') and (hasattr(obj, '_run') or hasattr(obj, 'run')) and not isinstance(obj, type):
                            found_tool = obj
                            break
                        elif inspect.isclass(obj) and any(b.__name__ in ['BaseTool', 'StructuredTool'] for b in obj.__bases__):
                            try:
                                found_tool = obj()
                                break
                            except Exception:
                                continue

                    # 2nd Pass: Look for decorated functions (@tool)
                    if not found_tool:
                        for obj in local_scope.values():
                            if callable(obj) and hasattr(obj, 'name') and not isinstance(obj, type):
                                found_tool = obj
                                break

                    # 3rd Pass: Fallback to standard Python functions matching tool name
                    if not found_tool:
                        normalized_db_name = ct.name.lower().replace(" ", "_").replace("-", "_")
                        for name, obj in local_scope.items():
                            if inspect.isfunction(obj) and not name.startswith('_'):
                                if name.lower() == normalized_db_name:
                                    found_tool = StructuredTool.from_function(
                                        func=obj,
                                        name=ct.name or name,
                                        description=obj.__doc__ or f"Custom tool {ct.name}"
                                    )
                                    break

                    # 4th Pass: Last resort fallback to any valid function
                    if not found_tool:
                        for name, obj in local_scope.items():
                            if inspect.isfunction(obj) and not name.startswith('_'):
                                found_tool = StructuredTool.from_function(
                                    func=obj,
                                    name=ct.name or name,
                                    description=obj.__doc__ or f"Custom tool {ct.name}"
                                )
                                break

                    if found_tool:
                        # Normalize tool name for LLM compatibility
                        if hasattr(found_tool, 'name'):
                            try:
                                found_tool.name = found_tool.name.lower().replace(" ", "_").replace("-", "_")
                            except Exception: pass
                        
                        # Wrap with status emitter if possible
                        if self.emit and visual_node_id:
                            found_tool = self._wrap_tool_with_status_emitter(found_tool, visual_node_id)
                        elif self.emit:
                            found_tool = self._wrap_tool_with_status_emitter(found_tool, tool_id)
                        
                        resolved_tools.append(found_tool)
                    else:
                        logger.warning(f"No valid tool found in custom tool code for: {ct.name}")
                except Exception as e:
                    logger.error(f"Error resolving custom tool {ct.name}: {e}\n{traceback.format_exc()}")

        # 3. Resolve Global Tools
        for tool_id, visual_node_id in global_tool_map.items():
            gt_config = next((t for t in self.graph_data.globalTools if t.id == tool_id), None)
            if gt_config:
                t_instance = None
                gid = getattr(gt_config, 'id', '')
                if not gid: continue
                
                # Retrieve workspace path if needed
                ws_path = None
                if self.workspace_id:
                    from app.models import Workspace
                    ws_record = self.session.get(Workspace, self.workspace_id)
                    if ws_record:
                        ws_path = ws_record.path

                # Retrieve stored config
                config_data = {}
                if visual_node_id:
                    v_node = self.nodes_map.get(visual_node_id)
                    if v_node:
                        config_data = getattr(v_node.data, 'config', None) or {}

                if gid == 'search_knowledge_base':
                    kb_id = config_data.get('knowledge_base_id')
                    if not kb_id:
                        for edge in self.edges:
                            if edge.source == node.id and edge.sourceHandle in ['out-tool', 'tools']:
                                target_node = self.nodes_map.get(edge.target)
                                if target_node and target_node.type == 'tool' and 'search' in target_node.data.name.lower():
                                    t_config = getattr(target_node.data, 'config', None) or {}
                                    kb_id = t_config.get('knowledge_base_id')
                                    break
                    
                    if kb_id:
                        from app.tools.knowledge_base_search import get_search_knowledge_base_tool
                        t_instance = get_search_knowledge_base_tool(kb_id, framework='langgraph')
                    else:
                        logger.warning(f"Knowledge Base ID not found for tool: {gt_config.name}")

                elif gid == 'grep_search':
                    import os as _os
                    if ws_path and _os.path.exists(ws_path):
                        from app.tools.grep_search import get_grep_search_tool
                        t_instance = get_grep_search_tool(workspace_path=ws_path, framework='langgraph')
                    else:
                        logger.warning(f"Workspace path not found or invalid for grep_search. ID: {self.workspace_id}")

                elif gid in ['file_read', 'directory_read', 'file_write']:
                    from app.tools.fs_tools import get_file_read_tool, get_directory_read_tool, get_file_write_tool
                    if gid == 'file_read':
                        t_instance = get_file_read_tool(workspace_path=ws_path or "./", framework='langgraph')
                    elif gid == 'directory_read':
                        t_instance = get_directory_read_tool(workspace_path=ws_path or "./", framework='langgraph')
                    elif gid == 'file_write':
                        t_instance = get_file_write_tool(workspace_path=ws_path or "./", framework='langgraph')
                        
                elif gid == 'directory_search':
                    # Rout directory_search to native grep_search to avoid OpenAI DB requirements
                    import os as _os
                    from app.tools.grep_search import get_grep_search_tool
                    t_instance = get_grep_search_tool(workspace_path=ws_path or "./", framework='langgraph')
                        
                elif gid in ['serper', 'scrape']:
                    try:
                        import crewai_tools as ct
                        if gid == 'serper': 
                            api_key = getattr(gt_config, 'apiKey', None)
                            if api_key: t_instance = ct.SerperDevTool(api_key=api_key)
                        elif gid == 'scrape': t_instance = ct.ScrapeWebsiteTool()
                    except ImportError:
                        logger.warning("crewai_tools not installed, skipping CrewAI global tools.")
                    except Exception as e:
                        logger.error(f"Failed to instantiate global tool '{gid}': {e}")

                elif gid in ['pdf_search', 'docx_search', 'json_search', 'xml_search', 'csv_search', 'mdx_search', 'txt_search']:
                    try:
                        import crewai_tools as ct
                        tool_config = {'directory': ws_path} if ws_path else {}
                        if config_data: tool_config.update(config_data)
                        
                        if gid == 'pdf_search': t_instance = ct.PDFSearchTool(config=tool_config)
                        elif gid == 'docx_search': t_instance = ct.DOCXSearchTool(config=tool_config)
                        elif gid == 'json_search': t_instance = ct.JSONSearchTool(config=tool_config)
                        elif gid == 'xml_search': t_instance = ct.XMLSearchTool(config=tool_config)
                        elif gid == 'csv_search': t_instance = ct.CSVSearchTool(config=tool_config)
                        elif gid == 'mdx_search': t_instance = ct.MDXSearchTool(config=tool_config)
                        elif gid == 'txt_search': t_instance = ct.TXTSearchTool(config=tool_config)
                    except ImportError:
                        logger.warning("crewai_tools not installed, skipping CrewAI global tools.")
                    except Exception as e:
                        logger.error(f"Failed to instantiate global tool '{gid}': {e}")

                if t_instance:
                    if self.emit and visual_node_id:
                        t_instance = self._wrap_tool_with_status_emitter(t_instance, visual_node_id)
                    resolved_tools.append(t_instance)

        # 4. Resolve MCP Tools from pre-connected cache
        for server_id, visual_node_id in mcp_server_map.items():
            sid_str = str(server_id)
            if sid_str in self.mcp_tools_cache:
                tools_to_add = self.mcp_tools_cache[sid_str]
                if isinstance(tools_to_add, list):
                    for t_inst in tools_to_add:
                        # Normalize tool name for LLM compatibility
                        if hasattr(t_inst, 'name'):
                            try:
                                t_inst.name = t_inst.name.lower().replace(" ", "_").replace("-", "_").replace(".", "_")
                            except Exception: pass

                        # Wrap each tool with status emitter for the specific MCP node
                        if visual_node_id:
                            t_inst = self._wrap_tool_with_status_emitter(t_inst, visual_node_id)
                        
                        self._emit({"type": "log", "data": f"Binding MCP Tool: {getattr(t_inst, 'name', 'unknown')}\n"})
                        resolved_tools.append(t_inst)
                    logger.info(f"Loaded {len(tools_to_add)} tools from pre-connected MCP server {sid_str}")
                else:
                    logger.warning(f"MCP cache for {sid_str} is not a list: {type(tools_to_add)}")
            else:
                logger.warning(f"MCP Server {sid_str} was not pre-connected or not found in cache.")

        # 5. Deduplicate tools by name
        unique_tools = []
        seen_names = set()
        for t in resolved_tools:
            if hasattr(t, 'name') and t.name not in seen_names:
                unique_tools.append(t)
                seen_names.add(t.name)

        return unique_tools

    # ── Visual tool edge helpers ────────────────────────────────────────────

    def _visual_tool_ids_for_agent(self, agent_node_id: str) -> List[str]:
        """Returns the canvas tool node IDs wired to an agent via out-tool/tools edges."""
        return [
            edge.target for edge in self.edges
            if edge.source == agent_node_id
            and edge.sourceHandle in ['out-tool', 'tools']
        ]

    # ── Agent node builder ─────────────────────────────────────────────────

    def _build_agent_node(self, node: Node) -> Callable:
        """Returns an executable function for an Agent node."""
        base_model = self._init_chat_model(node.data.modelId)

        # Fetch workspace path to inject into LLM Context
        ws_path = None
        if self.workspace_id:
            from app.models import Workspace
            ws_record = self.session.get(Workspace, self.workspace_id)
            if ws_record and getattr(ws_record, 'path', None):
                ws_path = ws_record.path

        # --- PRE-RESOLVE SKILLS (Phase A: session is still open here) ---
        # IMPORTANT: agent_fn runs in Phase B where the DB session is CLOSED.
        # We must fetch skill content NOW and store it as plain strings so the
        # closure can inject them safely without touching self.session.
        resolved_skill_content: str = ""
        skill_ids = getattr(node.data, 'identitySkillIds', []) or []
        if skill_ids:
            resolved_skills = []
            for sid in skill_ids:
                try:
                    import uuid as _uuid
                    skill_record = self.session.get(AgentSkill, _uuid.UUID(str(sid)))
                    if skill_record:
                        resolved_skills.append((skill_record.name, skill_record.content))
                    else:
                        logger.warning(f"[Skill] ID {sid} not found in database.")
                except Exception as e:
                    logger.error(f"[Skill] Error fetching skill {sid}: {e}")
            if resolved_skills:
                resolved_skill_content = "\n\n[MANDATORY CONTEXT: AGENT SKILLS]\n"
                resolved_skill_content += "The following XML blocks contain specialized rules and guidelines. You must internalize these rules, but your PRIMARY directive is always to complete your ACTIVE TASK using your available TOOLS.\n\n"
                for skill_name, skill_content in resolved_skills:
                    resolved_skill_content += f'<agent_skill name="{skill_name}">\n{skill_content}\n</agent_skill>\n\n'

        node_tools = self._resolve_node_tools(node)
        if node_tools:
            logger.info(f"Detected {len(node_tools)} tools for agent {node.id}")

        data_obj = node.data
        task_ids: List[str] = []
        if hasattr(data_obj, 'taskOrder') and data_obj.taskOrder:
            task_ids = list(data_obj.taskOrder)
        elif isinstance(data_obj, dict) and data_obj.get('taskOrder'):
            task_ids = list(data_obj.get('taskOrder'))

        if not task_ids:
            for edge in self.edges:
                if edge.target == node.id:
                    source_node = self.nodes_map.get(edge.source)
                    if source_node and source_node.type == 'task':
                        if source_node.id not in task_ids:
                            task_ids.append(source_node.id)
                elif edge.source == node.id:
                    target_node = self.nodes_map.get(edge.target)
                    if target_node and target_node.type == 'task':
                        if target_node.id not in task_ids:
                            task_ids.append(target_node.id)

        self.node_tasks_map[node.id] = task_ids

        schema_model = None
        model_name = None
        for edge in self.edges:
            if edge.target == node.id:
                source_node = self.nodes_map.get(edge.source)
                if source_node and source_node.type == 'schema':
                    model_name = source_node.data.name or f"Schema_{source_node.id[:8]}"
                    schema_model = self.schema_models.get(model_name)
                    if schema_model:
                        break

        target_state_key = None
        state_node = next((n for n in self.graph_data.nodes if n.type == 'state'), None)
        
        # 1. OPTION A: Visual Map - check for direct data-out edge to a state field
        if state_node:
            for edge in self.edges:
                if edge.source == node.id and edge.sourceHandle == 'data-out':
                    if edge.target == state_node.id and edge.targetHandle and edge.targetHandle.startswith('field-in-'):
                        target_state_key = edge.targetHandle.replace('field-in-', '')
                        break
                        
        # 2. OPTION B: Config Map - check for specific target in agent config
        if not target_state_key and hasattr(node.data, 'outputStateKey') and node.data.outputStateKey: # Using camelCase or snake_case depending on TS to Python mapping
            target_state_key = getattr(node.data, 'outputStateKey')
        if not target_state_key and hasattr(node.data, 'output_state_key') and node.data.output_state_key:
            target_state_key = node.data.output_state_key

        # 3. LEGACY MAP: check for schema type matching or fallback heuristics
        if state_node and not target_state_key:
            if model_name:
                for field in state_node.data.fields:
                    if field.type == model_name:
                        target_state_key = field.key
                        break
            if not target_state_key:
                for field in state_node.data.fields:
                    if field.key in ['response', 'output', 'results']:
                        target_state_key = field.key
                        break

        # Capture visual tool IDs at build time (stable across calls)
        visual_tool_ids = self._visual_tool_ids_for_agent(node.id)

        def agent_fn(state: Dict[str, Any]) -> Dict[str, Any]:
            logger.info(f"--- Running Agent Node: {node.data.name or node.id} ---")
            self._emit({"type": "status", "nodeId": node.id, "status": "running"})

            llm_to_use = base_model.bind_tools(node_tools) if node_tools else base_model
            
            history = state.get("messages", [])
            # Defensive coercion to list of messages
            if isinstance(history, str):
                history = [HumanMessage(content=history)]
            elif not isinstance(history, list):
                history = [history] if history else []
                
            effective_task_ids = task_ids if task_ids else ["NO_TASK_FALLBACK"]

            # --- Sequential Task Tracking ---
            task_progress = state.get("task_progress", {}) or {}
            current_task_idx = task_progress.get(node.id, 0)
            
            # Safeguard against index overflow
            if current_task_idx >= len(effective_task_ids):
                current_task_idx = 0 
            
            current_task_id = effective_task_ids[current_task_idx]

            # --- Feedback ---
            if current_task_id != "NO_TASK_FALLBACK":
                msg = f"Task {current_task_idx + 1} of {len(effective_task_ids)}"
                self._emit({"type": "log", "data": f"\n[AGENT: {node.data.name or node.id}] Running {msg}...\n"})
                self._emit({"type": "status", "nodeId": current_task_id, "status": "running"})

            # ── 1. ALWAYS build the System Prompt ─────────────────────────────
            role = interpolate_prompt(getattr(node.data, 'role', 'Assistant'), state)
            goal = interpolate_prompt(getattr(node.data, 'goal', 'Help the user.'), state)
            backstory = interpolate_prompt(getattr(node.data, 'backstory', ''), state)

            system_content = f"Role: {role}\nGoal: {goal}\n"
            if backstory:
                system_content += f"Backstory: {backstory}\n"

            # --- SKILL INJECTION (using pre-resolved strings from build time) ---
            if resolved_skill_content:
                system_content += resolved_skill_content

            # INJECT WORKSPACE DIRECTORY
            if ws_path:
                system_content += f"\n[WORKSPACE CONTEXT]\n"
                system_content += f"Your current workspace absolute directory path is: {ws_path}\n"
                system_content += f"You MUST use this path as the base directory when reading or creating files.\n"

            system_template = interpolate_prompt(getattr(node.data, 'system_template', ''), state)
            if system_template:
                system_content += f"\nInstructions:\n{system_template}"

            # ── 2. Inject Current Task into System Prompt ──────────────
            task_content = ""
            if current_task_id != "NO_TASK_FALLBACK":
                task_node = self.nodes_map.get(current_task_id)
                if task_node:
                    curr_task = task_node.data
                    desc = interpolate_prompt(curr_task.description, state)
                    exp = interpolate_prompt(curr_task.expected_output, state)
                    
                    if len(effective_task_ids) > 1:
                        task_content = f"You are currently working on {msg}.\n"
                    
                    task_content += f"### CURRENT TASK\nInstruction: {desc}\n"
                    if exp: task_content += f"Expected Output: {exp}\n\n"
                    
                    task_content += "\nCRITICAL: Review the tools available to you. You MUST use the appropriate tools to execute this task. Do not just reply with text if a tool is required to take action."

            if task_content:
                system_content += f"\n\n[YOUR ACTIVE TASK]\n{task_content}"
            else:
                fallback_prompt = getattr(node.data, 'prompt_template', '') or "Please execute your goal."
                system_content += f"\n\n[ACTIVE INSTRUCTIONS]\n{fallback_prompt}"

            sys_msg = SystemMessage(content=system_content)

            # --- LOGGING: PROMPTS ---
            log_msg = f"\n{'─'*10} [SYSTEM PROMPT: {node.data.name or node.id}] {'─'*10}\n{system_content}\n{'─'*50}\n"
            self._emit({"type": "log", "data": log_msg})
            logger.info(log_msg)
            
            history_msg = f"[CONTEXT] History contains {len(history)} messages.\n"
            self._emit({"type": "log", "data": history_msg})
            logger.info(history_msg)

            # ── 3. Invoke LLM with Full Context ───────────────────────────────
            # Prepare updates dictionary (using State structure)
            updates: Dict[str, Any] = {"messages": []}
            
            # OpenAI and other models require at least one HumanMessage if no history exists
            if not history:
                dummy_msg = HumanMessage(content="Please begin.")
                history = [dummy_msg]
                updates["messages"].append(dummy_msg)

            messages_for_llm = [sys_msg] + history
            response = llm_to_use.invoke(messages_for_llm)
            
            # Label the AI message with the name of the Agent so subsequent agents know who output it
            agent_name = getattr(node.data, 'name', None) or getattr(node.data, 'role', 'Agent')
            safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name.replace(' ', '_'))
            if hasattr(response, 'name'):
                response.name = safe_name
                
            updates["messages"].append(response)

            # ── Phase 2: Tool Check (ReAct loop) ───────────────────────────────
            # Log the response so we can debug infinite loops
            tc_info = response.tool_calls if hasattr(response, 'tool_calls') else None
            self._emit({"type": "log", "data": f"\n[LLM RESPONSE] Agent {node.id[:8]} | Content: {response.content[:1000]} | Tool Calls: {tc_info}\n"})
            if hasattr(response, 'tool_calls') and response.tool_calls:
                for tid in visual_tool_ids:
                    self._emit({"type": "status", "nodeId": tid, "status": "running"})
                return updates

            # ── Phase 3: Task Completion ──
            if current_task_id != "NO_TASK_FALLBACK":
                self._emit({"type": "status", "nodeId": current_task_id, "status": "success"})
            
            # Increment progress for THIS agent
            updates["task_progress"] = {node.id: current_task_idx + 1}

            # ── Extraction (Only after last task) ──
            is_last_task = (current_task_idx >= len(effective_task_ids) - 1)
            
            if is_last_task:
                self._emit({"type": "status", "nodeId": node.id, "status": "success"})
                
            output_update: Dict[str, Any] = {}
            if is_last_task:
                final_text = response.content or ""
                if schema_model:
                    try:
                        extractor = base_model.with_structured_output(schema_model)
                        extraction_prompt = f"Extract the following into the schema:\n\n{final_text}"
                        extract_log = f"\n{'─'*10} [EXTRACTION PROMPT] {'─'*10}\n{extraction_prompt}\n{'─'*50}\n"
                        self._emit({"type": "log", "data": extract_log})
                        logger.info(extract_log)
                        parsed_data = extractor.invoke([
                            HumanMessage(content=extraction_prompt)
                        ])
                        output_update[target_state_key or "agent_output"] = parsed_data
                    except Exception as e:
                        logger.warning(f"Structured extraction failed for agent {node.id}: {e}")
                        output_update[target_state_key or "agent_output"] = final_text
                else:
                    # Direct state mapping: attempt JSON parse if field type implies it
                    parsed_val = final_text
                    field_type = "string"
                    if state_node and target_state_key:
                        for field in state_node.data.fields:
                            if field.key == target_state_key:
                                field_type = str(field.type).lower()
                                break
                    
                    if field_type in ['list', 'dict'] or (final_text.strip().startswith('[') or final_text.strip().startswith('{')):
                        try:
                            import json
                            cleaned = final_text.strip()
                            if "```json" in cleaned:
                                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                            elif "```" in cleaned:
                                cleaned = cleaned.split("```")[1].split("```")[0].strip()
                            parsed_val = json.loads(cleaned)
                        except Exception as e:
                            logger.warning(f"Could not parse direct output into {field_type} for agent {node.id}: {e}")
                            
                    output_update[target_state_key or "agent_output"] = parsed_val

            return {**updates, **output_update}

        return agent_fn

    def task_and_tools_condition(self, state: Dict[str, Any], agent_id: str) -> str:
        """
        Dynamically routes for both tools (ReAct) and sequential tasks.
        """
        messages = state.get("messages", [])
        if messages and hasattr(messages[-1], "tool_calls") and messages[-1].tool_calls:
            return "tools"
        
        # Check if more tasks remain for this agent
        progress = state.get("task_progress", {}).get(agent_id, 0)
        task_ids = self.node_tasks_map.get(agent_id, [])
        if progress < len(task_ids) and len(task_ids) > 1:
            return "loop"
            
        return "next"

    def _build_router_logic(self, node: Node) -> Callable:
        """
        Returns a conditional routing function.
        Emits running/success events in real-time via self._emit().
        """
        branch_map = {}
        for edge in self.edges:
            if edge.source == node.id and edge.sourceHandle:
                branch_map[edge.sourceHandle] = edge.target

        def router_fn(state: Dict[str, Any]) -> str:
            # Emit running immediately — router card starts spinning
            self._emit({"type": "status", "nodeId": node.id, "status": "running"})

            conditions = node.data.conditions if hasattr(node.data, 'conditions') else node.data.get('conditions', [])
            for condition in conditions:
                cond_dict = (
                    condition if isinstance(condition, dict)
                    else condition.dict() if hasattr(condition, 'dict')
                    else vars(condition)
                )
                actual_value = get_nested_value(state, cond_dict.get('field'))
                cond_value = cond_dict.get('value', '')
                operator_str = cond_dict.get('operator', 'is_equal')

                str_actual = str(actual_value).strip().lower() if actual_value is not None else ""
                str_cond = str(cond_value).strip().lower()
                
                self._emit({"type": "log", "data": f"  ├─ [ROUTER] '{cond_dict.get('field')}' ({str_actual}) {operator_str} '{str_cond}'\n"})

                match = False
                if operator_str in ['is_equal', '==', 'equals']:
                    match = (str_actual == str_cond)
                elif operator_str == 'contains':
                    match = (str_cond in str_actual)
                elif operator_str == 'is_true':
                    match = str_actual in ["true", "1", "yes"]
                elif operator_str == 'is_false':
                    match = str_actual in ["false", "0", "no"]

                if match:
                    route_key = f"route-{cond_dict['id']}"
                    self._emit({"type": "route_taken", "nodeId": node.id, "sourceHandle": route_key})
                    self._emit({"type": "status", "nodeId": node.id, "status": "success"})
                    return route_key

            self._emit({"type": "status", "nodeId": node.id, "status": "success"})
            return "route-default"

        return router_fn

    def _find_entry_point(self, functional_nodes: set) -> str:
        candidates = [n for n in self.graph_data.nodes if n.id in functional_nodes]
        for node in candidates:
            has_incoming = any(
                edge.target == node.id and edge.source in functional_nodes
                for edge in self.edges
            )
            if not has_incoming:
                return node.id
        if candidates:
            return candidates[0].id
        raise ValueError("No entry point found.")

    def compile(self) -> Any:
        state_schema = self._build_state_schema()
        builder = StateGraph(state_schema)
        functional_nodes: set = set()
        agent_tool_nodes: Dict[str, str] = {}  # agent_id -> tool_node_id

        # 1. Add functional nodes and their ToolNodes
        for node in self.graph_data.nodes:
            if node.type == 'agent':
                builder.add_node(node.id, self._build_agent_node(node))
                functional_nodes.add(node.id)
                tools = self._resolve_node_tools(node)
                if tools:
                    tool_node_id = f"{node.id}_tools"
                    builder.add_node(tool_node_id, ToolNode(tools))
                    builder.add_edge(tool_node_id, node.id)
                    agent_tool_nodes[node.id] = tool_node_id
            elif node.type == 'crew':
                builder.add_node(node.id, lambda x: x)
                functional_nodes.add(node.id)
            elif node.type == 'router':
                # Router node acts as an identity node that transitions via conditional edges
                builder.add_node(node.id, lambda x: {})
                functional_nodes.add(node.id)

        # 2. Build edges and identify targets
        node_next_steps: Dict[str, List[str]] = {}
        for edge in self.edges:
            if edge.source in functional_nodes:
                target_node = self.nodes_map.get(edge.target)
                if target_node and target_node.type in ['agent', 'crew', 'router']:
                    node_next_steps.setdefault(edge.source, []).append(edge.target)

        # 3. Handle routing for all functional nodes
        for source_id in functional_nodes:
            target_node = self.nodes_map.get(source_id)
            if not target_node: continue
            
            # Special logic for agents (Tools + Sequential Tasks)
            if target_node.type == 'agent':
                tool_node_id = agent_tool_nodes.get(source_id)
                task_ids = self.node_tasks_map.get(source_id, [])
                
                # Find original target node (default to END)
                targets = node_next_steps.get(source_id, [])
                next_node_id = targets[0] if targets else END
                
                # Build the Path Map for the router
                path_map = {"next": next_node_id}
                if tool_node_id:
                    path_map["tools"] = tool_node_id
                if len(task_ids) > 1:
                    path_map["loop"] = source_id
                
                # Add conditional edges using the specialized task/tool router
                def make_agent_router(aid=source_id):
                    return lambda state: self.task_and_tools_condition(state, aid)
                
                builder.add_conditional_edges(source_id, make_agent_router(), path_map)
            
            # Logic for router nodes (Conditional branching)
            elif target_node.type == 'router':
                router_logic = self._build_router_logic(target_node)
                path_map: Dict[str, Any] = {}
                for e in self.edges:
                    if e.source == target_node.id and e.sourceHandle:
                        path_map[e.sourceHandle] = e.target
                if "route-default" not in path_map:
                    path_map["route-default"] = END
                path_map[END] = END # Ensure END is reachable
                
                builder.add_conditional_edges(source_id, router_logic, path_map)

            # Logic for other nodes (Crew, etc)
            elif source_id in node_next_steps:
                targets = node_next_steps[source_id]
                for tid in targets:
                    builder.add_edge(source_id, tid)
            
            else:
                # No outgoing edges -> END
                builder.add_edge(source_id, END)

        builder.set_entry_point(self._find_entry_point(functional_nodes))
        self.compiled_graph = builder.compile()
        return self.compiled_graph


# ─────────────────────────────── utilities ──────────────────────────────────

def get_nested_value(state: dict, path_string: str):
    try:
        if not path_string:
            return None
        clean_path = path_string.replace('{{', '').replace('}}', '').strip()
        if clean_path.startswith('$json.'):
            clean_path = clean_path.replace('$json.', '', 1)
        if not clean_path:
            return None

        keys = clean_path.split('.')
        current_val = state
        for key in keys:
            if current_val is None:
                return None
            if isinstance(current_val, list) and current_val:
                current_val = current_val[-1]
            if hasattr(current_val, 'model_dump'):
                current_val = current_val.model_dump()
            elif hasattr(current_val, 'dict') and callable(getattr(current_val, 'dict')):
                current_val = current_val.dict()
            if isinstance(current_val, dict):
                current_val = current_val.get(key)
            else:
                current_val = getattr(current_val, key, None)
        if current_val is not None and not isinstance(current_val, str):
            current_val = json.dumps(current_val) if isinstance(current_val, (dict, list)) else str(current_val)
        return current_val
    except Exception as e:
        logger.error(f"Error resolving path {path_string}: {e}")
        return None


def interpolate_prompt(text: str, state: dict) -> str:
    if not text or not isinstance(text, str):
        return text
    
    result = text
    try:
        # We only interpolate top-level primitive state keys to avoid complex nested structures
        # and safely handle literal JSON blocks that contain single braces that would otherwise 
        # crash python's .format() or Jinja2.
        for key, value in state.items():
            str_val = None
            if isinstance(value, (str, int, float, bool)) or value is None:
                str_val = str(value) if value is not None else ""
            elif isinstance(value, (list, tuple)) and key == 'messages':
                history_texts = []
                for m in value:
                    v_type = getattr(m, 'type', type(m).__name__).upper()
                    v_name = getattr(m, 'name', v_type)
                    v_content = getattr(m, 'content', str(m))
                    history_texts.append(f"{v_name}: {v_content}")
                str_val = "\n".join(history_texts)
            
            if str_val is not None:
                # Safely replace {key}
                result = re.sub(r'(?<!\{)\{' + re.escape(key) + r'\}(?!\})', lambda _: str_val, result)
                # Safely replace {{key}}
                result = re.sub(r'\{\{' + re.escape(key) + r'\}\}', lambda _: str_val, result)
                
        # If user explicitly used valid Jinja statements (like {% if %}), we can attempt Jinja rendering
        # ONLY if there are still variable brackets and NO raw JSON blocks that look like jinja errors.
        if '{%' in result or '{{' in result:
            try:
                template = jinja2.Template(result)
                result = template.render(**state)
            except Exception:
                pass # Accept it silently as Jinja might fail on raw JSON
                
        return result
    except Exception as e:
        logger.error(f"[Interpolation Error] Failed safe interpolation: {e}")
        return text


def _deep_serialize(data: Any) -> Any:
    """Recursively serializes LangChain messages and Pydantic models to dicts."""
    if isinstance(data, dict):
        return {k: _deep_serialize(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_deep_serialize(i) for i in data]
    if hasattr(data, "model_dump"):
        try:
            return data.model_dump()
        except Exception:
            pass
    if hasattr(data, "dict") and callable(getattr(data, "dict", None)):
        try:
            return data.dict()
        except Exception:
            pass
    if isinstance(data, (str, int, float, bool, type(None))):
        return data
    return str(data)


def _extract_clean_result(data: Any) -> Any:
    if isinstance(data, dict):
        for key in ["result", "answer", "output", "text", "content"]:
            if key in data:
                return _extract_clean_result(data[key])
        if len(data) == 1:
            val = next(iter(data.values()))
            return _extract_clean_result(val)
        return data
    if isinstance(data, list) and data:
        extracted_strings = []
        for item in data:
            item_data = item
            if hasattr(item, "model_dump"):
                item_data = item.model_dump()
            elif hasattr(item, "dict") and callable(getattr(item, "dict")):
                item_data = item.dict()
            val = _extract_clean_result(item_data)
            if val is not None:
                extracted_strings.append(str(val))
        if extracted_strings:
            return "\n\n---\n\n".join(extracted_strings)
        return ""
    return data


# ──────────────────────── Producer-Consumer stream ──────────────────────────

def run_langgraph_stream(
    graph_data: GraphData,
    workspace_id: Optional[Any] = None,
    inputs: Optional[Dict[str, Any]] = None,
    execution_id: Optional[Union[str, uuid.UUID]] = None,
    session_factory: Optional[Callable] = None,
):
    """
    Real-time streaming generator using the Producer-Consumer pattern.

    Architecture:
      • A background daemon thread (worker) runs the entire LangGraph execution.
      • The compiler's self.emit callback pushes JSON-encoded SSE frames into a
        thread-safe Queue the *instant* each event is generated — even while the
        LLM is mid-invocation.
      • The generator (this function) simply drains the queue, yielding frames to
        FastAPI as fast as they arrive.
      • The worker signals completion by placing None in the queue.
    """
    from app.database import engine

    event_queue: queue.Queue = queue.Queue()

    # ── Emitter: called from inside the worker thread ──────────────────────
    def emit(event_dict: Dict) -> None:
        event_queue.put(json.dumps(event_dict) + "\n")
        
        # Mirror logs to backend stdout for Docker/Terminal visibility
        if event_dict.get("type") == "log":
            try:
                data = event_dict.get("data", "")
                if sys.__stdout__:
                    sys.__stdout__.write(data)
                    sys.__stdout__.flush()
            except:
                pass

    def log(msg: str) -> None:
        emit({"type": "log", "data": msg})

    # ── Worker: runs the full LangGraph execution on a background thread ───
    def worker() -> None:
        start_time = time.time()
        compiled_graph = None
        initial_state = {}
        final_snapshot = {}
        final_result = None

        try:
            with ExitStack() as stack:
                # --- PHASE A: Setup and Compile (Short DB Session) ---
                mcp_tools_cache = {}
                
                with Session(engine) as session:
                    try:
                        # 1. Resolve MCP Servers from the Graph
                        all_mcp_ids = set()
                        mcp_nodes = [n for n in graph_data.nodes if n.type == 'mcp']
                        for m_node in mcp_nodes:
                            sid = getattr(m_node.data, 'serverId', None)
                            if sid: all_mcp_ids.add(str(sid))
                        
                        # Fallback for legacy mcpServerIds on agent nodes
                        agent_nodes = [n for n in graph_data.nodes if n.type == 'agent']
                        for a_node in agent_nodes:
                            legacy_ids = getattr(a_node.data, 'mcpServerIds', []) or []
                            for mid in legacy_ids:
                                if mid: all_mcp_ids.add(str(mid))
                        
                        if all_mcp_ids:
                            log(f"Detected MCP servers in graph: {list(all_mcp_ids)}. Connecting...\n")
                            
                        # 2. Connect to each MCP Server
                        for mcp_id in all_mcp_ids:
                            mcp_record = session.get(MCPServer, mcp_id)
                            if not mcp_record:
                                continue
                            
                            try:
                                raw_tools = None
                                if mcp_record.transport_type == 'stdio':
                                    command = normalize_command(mcp_record.command)
                                    env = dict(os.environ)
                                    env["UV_PYTHON"] = "3.12"
                                    if mcp_record.env_vars:
                                        env.update(mcp_record.env_vars)
                                    
                                    mcp_args = mcp_record.args or []
                                    if isinstance(mcp_args, dict):
                                        mcp_args = [str(v) for v in mcp_args.values()]
                                    
                                    params = StdioServerParameters(command=command, args=mcp_args, env=env)
                                    adapter = MCPServerAdapter(params, connect_timeout=120)
                                    raw_tools = stack.enter_context(adapter)
                                else:
                                    # SSE / HTTP Hybrid Strategy
                                    base_url = mcp_record.url.strip()
                                    strategies = [
                                        (mcp_record.transport_type or "sse", base_url.rstrip('/')),
                                        (mcp_record.transport_type or "sse", base_url.rstrip('/') + '/'),
                                        ("streamable-http", base_url.rstrip('/')),
                                        ("sse", base_url.rstrip('/') + '/sse'),
                                    ]
                                    
                                    last_err = None
                                    for transport, cand_url in strategies:
                                        try:
                                            headers = (mcp_record.headers or {}).copy()
                                            if "Accept" not in headers: headers["Accept"] = "text/event-stream"
                                            
                                            adapter = MCPServerAdapter({"url": cand_url, "transport": transport, "headers": headers}, connect_timeout=120)
                                            raw_tools = stack.enter_context(adapter)
                                            log(f"MCP '{mcp_record.name}' connected via {transport} at {cand_url}\n")
                                            break
                                        except Exception as ce:
                                            last_err = ce
                                            continue
                                    
                                    if not raw_tools and last_err:
                                        log(f"Failed to connect to MCP '{mcp_record.name}': {last_err}\n")
                                        continue

                                if raw_tools:
                                    # Playwright filtering
                                    is_playwright = "playwright" in mcp_record.name.lower() or any("playwright" in str(a).lower() for a in (mcp_record.args or []))
                                    processed = []
                                    if is_playwright:
                                        suffix = ["browser_navigate", "browser_click", "browser_type", "browser_snapshot"]
                                        processed = [t for t in raw_tools if any(t.name.endswith(s) for s in suffix)]
                                    else:
                                        processed = list(raw_tools)
                                    
                                    mcp_tools_cache[str(mcp_id)] = processed
                                    log(f"MCP '{mcp_record.name}' ready with {len(processed)} tools.\n")
                                    
                            except Exception as mcp_err:
                                logger.error(f"Error connecting to MCP {mcp_id}: {mcp_err}")
                                log(f"Error: Could not activate MCP server {mcp_id}\n")

                        # 3. Instantiate compiler with pre-connected tools
                        compiler = LangGraphCompiler(graph_data, session, workspace_id=workspace_id, mcp_tools=mcp_tools_cache)
                        compiler.emit = emit
                        compiled_graph = compiler.compile()

                        # ── Build initial state from DB ───────────────────────────
                        if execution_id:
                            db_exec = session.get(Execution, execution_id)
                            if db_exec and db_exec.input_data:
                                if isinstance(db_exec.input_data, dict):
                                    initial_state.update(db_exec.input_data)
                    except Exception as setup_err:
                        logger.error(f"LangGraph setup error: {setup_err}\n{traceback.format_exc()}")
                        emit({"type": "error", "error": f"LangGraph Setup Error: {str(setup_err)}"})
                        if execution_id:
                            try:
                                db_exec = session.get(Execution, execution_id)
                                if db_exec:
                                    db_exec.status = ExecutionStatus.ERROR
                                    db_exec.output_data = {"error": f"Setup Error: {str(setup_err)}"}
                                    session.add(db_exec)
                                    session.commit()
                            except Exception: pass
                        return

                # --- PHASE B: LLM Execution (NO DB SESSION HELD) ---
                if inputs:
                    initial_state.update(inputs)

                state_node = next((n for n in graph_data.nodes if n.type == 'state'), None)
                if state_node and state_node.data:
                    for field in getattr(state_node.data, 'fields', []):
                        if field.defaultValue and field.key not in initial_state:
                            val = field.defaultValue
                            if isinstance(val, str) and val.strip():
                                s_val = val.strip()
                                if (
                                    (s_val.startswith('[') and s_val.endswith(']'))
                                    or (s_val.startswith('{') and s_val.endswith('}'))
                                ):
                                    try:
                                        val = json.loads(s_val)
                                    except Exception:
                                        pass
                            initial_state[field.key] = val

                log("--- LangGraph Execution Started ---\n")
                final_snapshot = dict(initial_state)

                try:
                    for chunk in compiled_graph.stream(initial_state, stream_mode="updates"):
                        for node_id, update in chunk.items():
                            if update is None:
                                continue

                            # ── Synthetic ToolNode → map to visual tool node IDs ──
                            if node_id.endswith("_tools"):
                                agent_id = node_id.replace("_tools", "")
                                visual_tool_ids = [
                                    edge.target for edge in graph_data.edges
                                    if edge.source == agent_id
                                    and edge.sourceHandle in ['out-tool', 'tools', 'out-mcp', 'mcp']
                                ]
                                log(f"Agent '{agent_id}' executing tools...\n")
                                # Tool nodes finish here; running was pre-emitted by agent_fn
                                for tid in visual_tool_ids:
                                    emit({"type": "status", "nodeId": tid, "status": "success"})
                                if isinstance(update, dict):
                                    final_snapshot.update(update)
                                continue  # Skip normal agent processing below

                            # ── Normal functional node ────────────────────────────
                            # Detect mid-ReAct tool call: agent node returned but
                            # the LLM still has pending tool_calls → stay "running".
                            is_tool_call = False
                            if isinstance(update, dict):
                                msgs = update.get("messages", [])
                                if msgs and hasattr(msgs[-1], "tool_calls") and msgs[-1].tool_calls:
                                    is_tool_call = True

                            # The "running" event for agents/tasks was already
                            # emitted inside agent_fn via self._emit(). However,
                            # if it hasn't been emitted yet (e.g. non-agent nodes),
                            # emit it now so the canvas card lights up.
                            update_keys = list(update.keys()) if isinstance(update, dict) else [str(type(update))]
                            log(f"Node '{node_id}' update: keys={update_keys}\n")

                            if isinstance(update, dict):
                                final_snapshot.update(update)

                            # Only mark node success when not mid-ReAct
                            if not is_tool_call:
                                emit({"type": "status", "nodeId": node_id, "status": "success"})

                except Exception as exe_err:
                    logger.error(f"LangGraph runtime error: {exe_err}\n{traceback.format_exc()}")
                    emit({"type": "error", "error": f"LangGraph Runtime Error: {str(exe_err)}"})
                    if execution_id:
                        with Session(engine) as session:
                            db_exec = session.get(Execution, execution_id)
                            if db_exec:
                                db_exec.status = ExecutionStatus.ERROR
                                db_exec.output_data = {"error": str(exe_err)}
                                session.add(db_exec)
                                session.commit()
                    return  # Context will close on return

                # ── Extract final result ──────────────────────────────────
                crew_node = next((n for n in graph_data.nodes if n.type == "crew"), None)
                target_key = None
                if crew_node:
                    target_key = getattr(crew_node.data, "outputKey", None) or getattr(crew_node.data, "outputMapping", None)
                    if target_key == "__FULL_STATE__":
                        target_key = None

                if target_key:
                    # Strictly extract ONLY the requested key
                    current_val = get_nested_value(final_snapshot, target_key)
                    if current_val is not None:
                        if hasattr(current_val, "model_dump"):
                            current_val = current_val.model_dump()
                        elif hasattr(current_val, "dict") and callable(getattr(current_val, "dict")):
                            current_val = current_val.dict()
                            
                        final_result = current_val if isinstance(current_val, str) else json.dumps(current_val, indent=2, default=str)
                    else:
                        final_result = f"[OutputKey '{target_key}' not found in state]"
                else:
                    def _serialize(obj: Any) -> Any:
                        if hasattr(obj, "model_dump"): return obj.model_dump()
                        if hasattr(obj, "dict") and callable(getattr(obj, "dict", None)): return obj.dict()
                        return str(obj)

                    clean_snapshot = {k: v for k, v in final_snapshot.items() if k != 'messages'}
                    final_result = json.dumps(clean_snapshot, indent=2, default=_serialize)

                emit({"type": "final_result", "result": final_result})

                # --- PHASE C: Save Final State (Short DB Session) ---
                if execution_id:
                    with Session(engine) as session:
                        db_exec = session.get(Execution, execution_id)
                        if db_exec:
                            db_exec.status = ExecutionStatus.SUCCESS
                            clean_state = _deep_serialize(final_snapshot)
                            db_exec.output_data = {"final_state": clean_state, "result": final_result}
                            db_exec.duration = time.time() - start_time
                            session.add(db_exec)
                            session.commit()

        except Exception as fatal_err:
            logger.error(f"Fatal worker error: {fatal_err}\n{traceback.format_exc()}")
            emit({"type": "error", "error": f"Fatal Error: {str(fatal_err)}"})
            if execution_id:
                try:
                    with Session(engine) as session:
                        db_exec = session.get(Execution, execution_id)
                        if db_exec:
                            db_exec.status = ExecutionStatus.ERROR
                            session.add(db_exec)
                            session.commit()
                except Exception: pass

        finally:
            # Always sentinel the queue so the generator knows to stop
            event_queue.put(None)

    # ── Start producer thread ─────────────────────────────────────────────
    threading.Thread(target=worker, daemon=True).start()

    # ── Generator: consume queue and yield SSE frames ─────────────────────
    while True:
        item = event_queue.get()
        if item is None:
            break
        yield item
