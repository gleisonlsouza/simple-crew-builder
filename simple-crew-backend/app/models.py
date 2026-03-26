import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, DateTime, func, JSON
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship

class ModelType(str, Enum):
    GENERATIVE = "GENERATIVE"
    EMBEDDING = "EMBEDDING"

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    
    # Timestamps
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

    crews: list["CrewProject"] = Relationship(back_populates="user")
    credentials: list["Credential"] = Relationship(back_populates="user")
    models: list["LLMModel"] = Relationship(back_populates="user")
    mcp_servers: list["MCPServer"] = Relationship(back_populates="user")
    custom_tools: list["CustomTool"] = Relationship(back_populates="user")
    workspaces: list["Workspace"] = Relationship(back_populates="user")
    settings: Optional["AppSettings"] = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})

class CustomTool(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: Optional[str] = None
    code: str
    
    # Relationship
    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="custom_tools")
    
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

class CrewProject(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: Optional[str] = None
    canvas_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="crews")

    workspace_id: Optional[uuid.UUID] = Field(default=None, foreign_key="workspace.id", sa_column_kwargs={"nullable": True})

    # Timestamps
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

class Credential(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: Optional[str] = None
    key: str
    provider: Optional[str] = None
    
    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="credentials")

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

class LLMModel(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    model_name: str
    description: Optional[str] = None
    
    # Parâmetros Técnicos
    base_url: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})
    temperature: Optional[float] = Field(default=None, sa_column_kwargs={"nullable": True})
    max_tokens: Optional[int] = Field(default=None, sa_column_kwargs={"nullable": True})
    max_completion_tokens: Optional[int] = Field(default=None, sa_column_kwargs={"nullable": True})
    is_default: bool = Field(default=False)
    model_type: ModelType = Field(default=ModelType.GENERATIVE)
    
    # Relacionamentos
    credential_id: uuid.UUID = Field(foreign_key="credential.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    
    user: User = Relationship(back_populates="models")
    
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

class MCPServer(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    transport_type: str  # 'stdio' | 'sse'
    
    # Stdio fields
    command: Optional[str] = None
    args: Optional[list[str]] = Field(default_factory=list, sa_column=Column(JSON))
    env_vars: Optional[Dict[str, str]] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # SSE fields
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Relationship
    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="mcp_servers")
    
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

class Workspace(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    path: str
    
    # Relationship
    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="workspaces")
    
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), 
            server_default=func.now(), 
            onupdate=func.now()
        )
    )

class AppSettings(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    system_ai_model_id: Optional[uuid.UUID] = Field(default=None, foreign_key="llmmodel.id", sa_column_kwargs={"nullable": True})
    embedding_model_id: Optional[uuid.UUID] = Field(default=None, foreign_key="llmmodel.id", sa_column_kwargs={"nullable": True})
    active_workspace_id: Optional[uuid.UUID] = Field(default=None, foreign_key="workspace.id", sa_column_kwargs={"nullable": True})

    user: User = Relationship(back_populates="settings")


class WebhookConfig(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="crewproject.id", unique=True, index=True)
    webhook_id: str = Field(unique=True, index=True)
    secret: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})
    field_mappings: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    wait_for_result: bool = Field(default=False)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now()
        )
    )


class WebhookExecution(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    webhook_id: str = Field(index=True)
    project_id: uuid.UUID = Field(foreign_key="crewproject.id")
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING)
    inputs_received: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    raw_payload: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    field_mappings_used: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    wait_for_result: Optional[bool] = Field(default=None, sa_column_kwargs={"nullable": True})
    result: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})
    error: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})

    started_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    finished_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
