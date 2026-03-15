from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class NodeData(BaseModel):
    # Campos que transitam desde o Canvas do React Flow
    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    description: Optional[str] = None
    expected_output: Optional[str] = None
    process: Optional[str] = None
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
    base_url: Optional[str] = "default"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 4096
    max_completion_tokens: Optional[int] = 2048
    is_default: Optional[bool] = False
    credential_id: Any # UUID

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
