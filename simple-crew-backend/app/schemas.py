from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Dict, Optional, Any, Literal, Union, Annotated
from datetime import datetime
from .models import ModelType

class CustomTool(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    code: str

# --- LangGraph Specific Sub-Schemas ---
class StateField(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    key: str
    type: str
    reducer: Optional[str] = None
    defaultValue: Optional[Any] = Field(default=None, alias="defaultValue")

class SchemaField(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    key: str
    type: str
    description: str
    defaultValue: Optional[Any] = Field(default=None, alias="defaultValue")

class RouteCondition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    label: str
    field: str
    operator: str
    value: Any

# --- Specialized Node Data Models ---

class BaseNodeData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None

class CrewNodeData(BaseNodeData):
    process: Optional[str] = None
    memory: Optional[bool] = None
    planning: Optional[bool] = None
    share_crew: Optional[bool] = None
    agentOrder: Optional[List[str]] = None
    taskOrder: Optional[List[str]] = None
    inputs: Optional[Dict[str, Any]] = None
    embedder: Optional[Any] = None
    output_log_file: Optional[str] = None
    prompt_file: Optional[str] = None
    manager_llm_id: Optional[str] = None
    planning_llm_id: Optional[str] = None
    function_calling_llm_id: Optional[str] = None
    outputKey: Optional[str] = None
    outputMapping: Optional[str] = None

class AgentNodeData(BaseNodeData):
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    modelId: Optional[str] = None
    temperature: Optional[float] = None
    verbose: Optional[bool] = None
    allow_delegation: Optional[bool] = None
    cache: Optional[bool] = None
    allow_code_execution: Optional[bool] = None
    respect_context_window: Optional[bool] = None
    use_system_prompt: Optional[bool] = None
    max_iter: Optional[int] = None
    max_retry_limit: Optional[int] = None
    max_rpm: Optional[int] = None
    max_execution_time: Optional[int] = None
    code_execution_mode: Optional[str] = None
    reasoning: Optional[bool] = None
    max_reasoning_attempts: Optional[int] = None
    multimodal: Optional[bool] = None
    inject_date: Optional[bool] = None
    date_format: Optional[str] = None
    system_template: Optional[str] = None
    prompt_template: Optional[str] = None
    response_template: Optional[str] = None
    mcpServerIds: Optional[List[str]] = None
    customToolIds: Optional[List[str]] = None
    globalToolIds: Optional[List[Any]] = None
    disabledToolIds: Optional[List[str]] = None
    identitySkillIds: Optional[List[str]] = Field(default_factory=list)
    taskOrder: Optional[List[str]] = None

class TaskNodeData(BaseNodeData):
    description: Optional[str] = None
    expected_output: Optional[str] = None
    async_execution: Optional[bool] = None
    human_input: Optional[bool] = None
    create_directory: Optional[bool] = None
    output_file: Optional[str] = None
    context: Optional[List[str]] = None
    mcpServerIds: Optional[List[str]] = None
    customToolIds: Optional[List[str]] = None
    globalToolIds: Optional[List[Any]] = None
    disabledToolIds: Optional[List[str]] = None

class StateNodeData(BaseNodeData):
    fields: List[StateField] = []

class SchemaNodeData(BaseNodeData):
    fields: List[SchemaField] = []

class RouterNodeData(BaseNodeData):
    conditions: List[RouteCondition] = []
    defaultRoute: Optional[str] = None

class McpNodeData(BaseNodeData):
    serverId: Optional[str] = None

class ToolNodeData(BaseNodeData):
    toolId: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class CustomToolNodeData(BaseNodeData):
    toolId: Optional[str] = None

class ChatNodeData(BaseNodeData):
    description: Optional[str] = None
    inputMapping: Optional[str] = None
    includeHistory: Optional[bool] = None
    systemMessage: Optional[str] = None

class WebhookNodeData(BaseNodeData):
    webhookId: Optional[str] = None
    path: Optional[str] = None
    url: Optional[str] = None
    method: Optional[str] = None
    fieldMappings: Optional[Dict[str, str]] = None
    token: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    isActive: Optional[bool] = None
    waitForResult: Optional[bool] = None

# --- Specific Node Models ---

class CrewNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['crew']
    data: Optional[CrewNodeData] = None
    position: Optional[Dict[str, float]] = None

class AgentNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['agent']
    data: Optional[AgentNodeData] = None
    position: Optional[Dict[str, float]] = None

class TaskNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['task']
    data: Optional[TaskNodeData] = None
    position: Optional[Dict[str, float]] = None

class StateNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['state']
    data: Optional[StateNodeData] = None
    position: Optional[Dict[str, float]] = None

class SchemaNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['schema']
    data: Optional[SchemaNodeData] = None
    position: Optional[Dict[str, float]] = None

class RouterNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['router']
    data: Optional[RouterNodeData] = None
    position: Optional[Dict[str, float]] = None

class McpNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['mcp']
    data: Optional[McpNodeData] = None
    position: Optional[Dict[str, float]] = None

class ToolNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['tool']
    data: Optional[ToolNodeData] = None
    position: Optional[Dict[str, float]] = None

class CustomToolNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['customTool']
    data: Optional[CustomToolNodeData] = None
    position: Optional[Dict[str, float]] = None

class ChatNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['chat']
    data: Optional[ChatNodeData] = None
    position: Optional[Dict[str, float]] = None

class WebhookNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: Literal['webhook']
    data: Optional[WebhookNodeData] = None
    position: Optional[Dict[str, float]] = None

# --- Final Discriminated Union ---

Node = Annotated[
    Union[
        CrewNode, AgentNode, TaskNode, 
        StateNode, SchemaNode, RouterNode,
        McpNode, ToolNode, CustomToolNode,
        ChatNode, WebhookNode
    ],
    Field(discriminator='type')
]

class Edge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class ToolConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    isEnabled: bool = True
    apiKey: Optional[str] = None
    requiresKey: bool = False
    category: Optional[str] = None
    user_config_schema: Optional[Dict[str, Any]] = None

class GraphData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    version: Optional[str] = "1.0"
    framework: Optional[str] = Field(default="crewai")  # Capture framework choice from frontend
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)
    customTools: Optional[List[CustomTool]] = []
    globalTools: Optional[List[ToolConfig]] = []
    inputs: Optional[Dict[str, Any]] = None


# Schemas para CRUD de Projetos (Sprint 38)
class ProjectBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = None
    workspace_id: Optional[Any] = None # UUID
    framework: Optional[str] = Field(default="crewai")  # New field for Multi-Framework support
    canvas_data: Dict[str, Any]

class ProjectCreate(ProjectBase):
    pass

class ProjectRead(ProjectBase):
    id: Any # UUID
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    workspace_id: Optional[Any] = None
    canvas_data: Optional[Dict[str, Any]] = None

# Schemas para CRUD de Credenciais
class CredentialBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = None
    provider: Optional[str] = None

class CredentialCreate(CredentialBase):
    key: str

class CredentialRead(CredentialBase):
    id: Any
    key: str
    created_at: Any
    updated_at: Any

    @classmethod
    def from_orm(cls, obj):
        # Mascara a chave por segurança
        data = obj.__dict__.copy()
        raw_key = data.get('key', '')
        if raw_key:
            if len(raw_key) > 8:
                data['key'] = f"{raw_key[:4]}••••{raw_key[-4:]}"
            else:
                data['key'] = "••••••••"
        return cls(**data)

    class Config:
        from_attributes = True

class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    key: Optional[str] = None
    provider: Optional[str] = None

# Schemas para CRUD de Modelos de AI (LLM Models)
class LLMModelBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    model_name: str
    description: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    is_default: Optional[bool] = False
    model_type: ModelType = ModelType.GENERATIVE
    credential_id: Any # UUID

    @field_validator('temperature', 'max_tokens', 'max_completion_tokens', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

class LLMModelCreate(LLMModelBase):
    pass

class LLMModelRead(LLMModelBase):
    id: Any # UUID
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class LLMModelUpdate(BaseModel):
    name: Optional[str] = None
    model_name: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    is_default: Optional[bool] = None
    model_type: Optional[ModelType] = None
    credential_id: Optional[Any] = None

    @field_validator('temperature', 'max_tokens', 'max_completion_tokens', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

# Schemas para Gerenciamento de MCP Servers
class MCPServerBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    transport_type: str # 'stdio' | 'sse'
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env_vars: Optional[Dict[str, str]] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None

class MCPServerCreate(MCPServerBase):
    pass

class MCPServerRead(MCPServerBase):
    id: Any # UUID
    created_at: Any
    updated_at: Any

    @classmethod
    def from_orm(cls, obj):
        # Mask all header and env_var values for security — only return the key names
        data = {}
        for field in ['name', 'transport_type', 'command', 'args', 'url', 'id', 'created_at', 'updated_at']:
            val = getattr(obj, field, None)
            if val is not None:
                data[field] = val

        # Mask header values: return key → "••••••••"
        raw_headers = getattr(obj, 'headers', None) or {}
        data['headers'] = {k: '••••••••' for k in raw_headers} if raw_headers else {}

        # Mask env_var values: return key → "••••••••"
        raw_env_vars = getattr(obj, 'env_vars', None) or {}
        data['env_vars'] = {k: '••••••••' for k in raw_env_vars} if raw_env_vars else {}

        return cls(**data)

    class Config:
        from_attributes = True

class MCPServerUpdate(BaseModel):
    name: Optional[str] = None
    transport_type: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env_vars: Optional[Dict[str, str]] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None

# Schemas para Gerenciamento de Custom Tools
class CustomToolBase(BaseModel):
    name: str
    description: Optional[str] = None
    code: str
    framework: Optional[str] = Field(default="crewai")

class CustomToolCreate(CustomToolBase):
    pass

class CustomToolRead(CustomToolBase):
    id: Any # UUID
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class CustomToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    framework: Optional[str] = None

# Schemas para Gerenciamento de Workspaces
class WorkspaceBase(BaseModel):
    name: str
    path: str

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceRead(WorkspaceBase):
    id: Any # UUID
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None

# Schemas para Configurações do App
class AppSettingsBase(BaseModel):
    system_ai_model_id: Optional[Any] = None
    embedding_model_id: Optional[Any] = None
    active_workspace_id: Optional[Any] = None

class AppSettingsRead(AppSettingsBase):
    user_id: Any

    class Config:
        from_attributes = True

class AppSettingsUpdate(BaseModel):
    system_ai_model_id: Optional[Any] = None
    embedding_model_id: Optional[Any] = None
    active_workspace_id: Optional[Any] = None

# Sugestões de IA
class AiSuggestionRequest(BaseModel):
    field: str  # role, goal, backstory
    agent_name: str
    workflow_name: Optional[str] = None
    workflow_description: Optional[str] = None
    current_value: Optional[str] = None

class AiSuggestionResponse(BaseModel):
    suggestion: str

class AiBulkSuggestionRequest(BaseModel):
    agent_name: str
    workflow_name: str
    workflow_description: str
    current_values: dict = {} # Map of field -> value

class AiBulkSuggestionResponse(BaseModel):
    role: str
    goal: str
    backstory: str

class AiTaskBulkSuggestionRequest(BaseModel):
    task_name: str
    agent_name: Optional[str] = None
    workflow_name: str
    workflow_description: str
    current_values: dict = {}

class AiTaskBulkSuggestionResponse(BaseModel):
    description: str
    expected_output: str

# Knowledge Base Schemas
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None

class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: Any

class KnowledgeBaseDocumentResponse(BaseModel):
    id: str
    filename: str
    size: Optional[int] = None
    status: str = "success"
    error: Optional[str] = None
    created_at: Any

# Execution History Schemas
class ExecutionRead(BaseModel):
    id: Any
    project_id: Any
    status: str
    trigger_type: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    graph_snapshot: Dict[str, Any]
    duration: Optional[float] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Agent Skill Library Schemas ---
class AgentSkillBase(BaseModel):
    name: str
    description: Optional[str] = None
    content: str
    source_url: Optional[str] = None

class AgentSkillCreate(AgentSkillBase):
    pass

class AgentSkillRead(AgentSkillBase):
    id: Any # UUID
    created_at: Any

    class Config:
        from_attributes = True

class SkillImportRequest(BaseModel):
    url: str

