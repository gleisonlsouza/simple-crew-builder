from pydantic import BaseModel, field_validator
from typing import List, Dict, Optional, Any

class CustomTool(BaseModel):
    id: str
    name: str
    description: str
    code: str

class NodeData(BaseModel):
    # Campos que transitam desde o Canvas do React Flow
    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    description: Optional[str] = None
    expected_output: Optional[str] = None
    process: Optional[str] = None
    context: Optional[List[str]] = None
    mcpServerIds: Optional[List[str]] = None
    customToolIds: Optional[List[str]] = None
    # Permitir chaves adicionais como isCollapsed de forma crua, caso necessite depois
    class Config:
        extra = "allow"

class Node(BaseModel):
    id: str
    type: str  # 'crew', 'agent' ou 'task'
    data: NodeData
    position: Dict[str, float]

class Edge(BaseModel):
    id: str
    source: str
    target: str
    # 'sourceHandle' e 'targetHandle' geralmente vem no xyflow, permitimos opcional
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class GraphData(BaseModel):
    version: Optional[str] = "1.0"
    nodes: List[Node]
    edges: List[Edge]
    customTools: Optional[List[CustomTool]] = []

# Schemas para CRUD de Projetos (Sprint 38)
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
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
    name: Optional[str] = None
    description: Optional[str] = None
    canvas_data: Optional[Dict[str, Any]] = None

# Schemas para CRUD de Credenciais
class CredentialBase(BaseModel):
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
    name: str
    model_name: str
    description: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    is_default: Optional[bool] = False
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
    credential_id: Optional[Any] = None

    @field_validator('temperature', 'max_tokens', 'max_completion_tokens', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

# Schemas para Gerenciamento de MCP Servers
class MCPServerBase(BaseModel):
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

# Schemas para Configurações do App
class AppSettingsBase(BaseModel):
    system_ai_model_id: Optional[Any] = None

class AppSettingsRead(AppSettingsBase):
    user_id: Any

    class Config:
        from_attributes = True

class AppSettingsUpdate(BaseModel):
    system_ai_model_id: Optional[Any] = None

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
