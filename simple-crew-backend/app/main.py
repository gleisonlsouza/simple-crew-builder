import io
import os
import shutil
import tempfile
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, Header, Request, BackgroundTasks, Query, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session, select
from .crew_builder import run_crew_stream
from .database import init_db, get_session
from .models import CrewProject, User, Credential, LLMModel, MCPServer, AppSettings, CustomTool, Workspace
from .schemas import (
    GraphData, ProjectCreate, ProjectRead, ProjectUpdate, 
    CredentialCreate, CredentialRead, CredentialUpdate,
    LLMModelCreate, LLMModelRead, LLMModelUpdate,
    MCPServerCreate, MCPServerRead, MCPServerUpdate,
    CustomToolCreate, CustomToolRead, CustomToolUpdate,
    WorkspaceCreate, WorkspaceRead, WorkspaceUpdate,
    AppSettingsRead, AppSettingsUpdate,
    AiSuggestionRequest, AiSuggestionResponse,
    AiBulkSuggestionRequest, AiBulkSuggestionResponse,
    AiTaskBulkSuggestionRequest, AiTaskBulkSuggestionResponse
)
from .exporter import generate_python_project
from .ai_service import generate_suggestion, generate_bulk_suggestion, generate_task_bulk_suggestion
from .core.database.neo4j_db import neo4j_manager, get_neo4j_session
from neo4j import Session as Neo4jSession
from .routes import knowledge_base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa o banco SQL (SQLModel) e o usuário seed no startup
    init_db()
    
    # Inicializa o driver do Neo4j
    neo4j_manager.init_driver()
    
    # O índice será criado dinamicamente (Lazy Creation) durante a primeira ingestão
    # neo4j_manager.create_vector_index()
    
    yield
    
    # Fecha o driver do Neo4j no encerramento do app
    neo4j_manager.close()

app = FastAPI(
    title="SimpleCrew Backend API",
    description="Endpoint recebedor de Grafos visuais React Flow para rodar CrewAI via Python nativo",
    version="1.0.0",
    lifespan=lifespan
)
app.include_router(knowledge_base.router)

# Setup CORS para permitir conexão com o Servidor Vite do Frontend (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Modificar com url local/prod exata se quiser ser restritivo: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "SimpleCrew API Health status: Operacional! 🚀"}

@app.get("/api/neo4j/health")
async def neo4j_health(session: Neo4jSession = Depends(get_neo4j_session)):
    """Rota de Teste de Vida para o Neo4j."""
    try:
        result = session.run("RETURN 'Conexão com Neo4j estabelecida!' AS message")
        record = result.single()
        return {"status": "ok", "message": record["message"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na conexão com Neo4j: {str(e)}")

@app.post("/api/v1/run-crew")
async def execute_crew(
    graph_data: GraphData, 
    save_to_db: bool = Query(False),
    project_id: Optional[str] = Header(None, alias="X-Project-Id"),
    session: Session = Depends(get_session)
):
    try:
        # Resolve Workspace ID: Priorities: 1. Project level, 2. Global settings
        active_workspace_id = None
        
        # 1. Se informou o ID do projeto, tenta pegar o workspace dele
        if project_id:
            db_project = session.get(CrewProject, project_id)
            if db_project and db_project.workspace_id:
                active_workspace_id = db_project.workspace_id
        
        # 2. Se não tem ID ou o projeto não tem workspace setado, pega o Global (como fallback)
        if not active_workspace_id:
            settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
            if settings:
                active_workspace_id = settings.active_workspace_id

        # Se solicitado, persiste o estado do canvas no banco vinculado ao usuário root
        if save_to_db:
            # Busca o usuário root (seed)
            statement = select(User).where(User.email == "gleison.lsouza@gmail.com")
            user = session.exec(statement).first()
            
            if user:
                # Cria um nome para a crew baseado no timestamp se estiver vazio
                crew_name = "Nova Execução Visual"
                # Tenta extrair um nome do nó da Crew se existir no graph_data
                crew_node = next((n for n in graph_data.nodes if n.type == 'crew'), None)
                if crew_node and hasattr(crew_node, 'data') and getattr(crew_node.data, 'name', None):
                    crew_name = crew_node.data.name

                new_crew = CrewProject(
                    name=crew_name,
                    canvas_data=graph_data.model_dump(),
                    user_id=user.id,
                    workspace_id=active_workspace_id # Associate with resolved workspace
                )
                session.add(new_crew)
                session.commit()
                print(f"--- Crew '{crew_name}' persistida no banco! ---")

        # Resolve Custom Tools do Banco de Dados
        graph_data = resolve_custom_tools(graph_data, session)

        # Despacha as dependências e payload JSON para a magia do nosso Parser local CrewAI Stream
        return StreamingResponse(
            run_crew_stream(graph_data, workspace_id=active_workspace_id), 
            media_type="text/event-stream"
        )
    except ValueError as ve:
        # Erros esperados capturados na nossa lógica de Parse customizada
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Erros internos ou de infra API das LLMs (OpenAI error keys, etc)
        raise HTTPException(status_code=500, detail=f"Falha Crítica na Matrix da IAM: {str(e)}")

# --- CRUD de Projetos (Sprint 38) ---

ROOT_USER_ID = "00000000-0000-0000-0000-000000000000"

def resolve_custom_tools(graph_data: GraphData, session: Session):
    """
    Busca no banco de dados todas as Custom Tools referenciadas pelos agentes no grafo
    e popula a lista graph_data.customTools com os dados completos (incluindo o código).
    """
    used_tool_ids = set()
    for node in graph_data.nodes:
        if node.type in ['agent', 'task'] and hasattr(node.data, 'customToolIds') and node.data.customToolIds:
            for tid in node.data.customToolIds:
                used_tool_ids.add(tid)
    
    if not used_tool_ids:
        return graph_data
    
    # Busca as tools no banco
    statement = select(CustomTool).where(CustomTool.id.in_(list(used_tool_ids)))
    db_tools = session.exec(statement).all()
    
    # Converte modelos do banco para schemas (CustomTool schema interno do GraphData)
    from .schemas import CustomTool as GraphCustomTool
    resolved_tools = [
        GraphCustomTool(id=str(t.id), name=t.name, description=t.description or "", code=t.code)
        for t in db_tools
    ]
    
    # Adiciona as tools resolvidas ao graph_data (mesclando com as que já existem se houver)
    existing_ids = {t.id for t in (graph_data.customTools or [])}
    final_tools = list(graph_data.customTools or [])
    for rt in resolved_tools:
        if rt.id not in existing_ids:
            final_tools.append(rt)
            
    graph_data.customTools = final_tools
    return graph_data

@app.post("/api/v1/projects", response_model=ProjectRead)
async def create_project(project: ProjectCreate, session: Session = Depends(get_session)):
    new_project = CrewProject(
        **project.model_dump(),
        user_id=ROOT_USER_ID
    )
    session.add(new_project)
    session.commit()
    session.refresh(new_project)
    return new_project

@app.get("/api/v1/projects", response_model=List[ProjectRead])
async def list_projects(session: Session = Depends(get_session)):
    statement = select(CrewProject).where(CrewProject.user_id == ROOT_USER_ID).order_by(CrewProject.updated_at.desc())
    projects = session.exec(statement).all()
    return projects

@app.get("/api/v1/projects/{project_id}", response_model=ProjectRead)
async def get_project(project_id: str, session: Session = Depends(get_session)):
    project = session.get(CrewProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project

@app.patch("/api/v1/projects/{project_id}", response_model=ProjectRead)
@app.put("/api/v1/projects/{project_id}", response_model=ProjectRead)
async def update_project(project_id: str, project_update: ProjectUpdate, session: Session = Depends(get_session)):
    db_project = session.get(CrewProject, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # Lógica de "Pulo do Gato": Update Parcial
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project

@app.delete("/api/v1/projects/{project_id}")
async def delete_project(project_id: str, session: Session = Depends(get_session)):
    project = session.get(CrewProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    session.delete(project)
    session.commit()
    return {"message": "Projeto removido com sucesso"}

@app.get("/api/v1/projects/{project_id}/export-python")
async def export_project_python(project_id: str, session: Session = Depends(get_session)):
    project = session.get(CrewProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    try:
        # Reconstrói GraphData a partir do canvas_data persistido
        graph_data = GraphData(**project.canvas_data)
        
        # Resolve Custom Tools vinculadas
        graph_data = resolve_custom_tools(graph_data, session)
        
        # Obtém autor do projeto (usuário vinculado)
        author_name = "SimpleCrew"
        author_email = "admin@simplecrew.ai"
        if project.user:
            author_name = project.user.name
            author_email = project.user.email

        # Coleta Servidores MCP usados pelos agentes
        mcp_servers_data = []
        all_mcp_ids = set()
        
        # Coleta LLMs usados pelos agentes
        agent_llms_data = {}
        unique_providers = set()

        for node in graph_data.nodes:
            if node.type == 'agent':
                # MCP
                mcp_ids = getattr(node.data, 'mcpServerIds', []) or []
                for mid in mcp_ids:
                    all_mcp_ids.add(mid)
                
                # LLM
                model_id = getattr(node.data, 'modelId', None)
                llm_config = None
                if model_id:
                    llm_config = session.get(LLMModel, model_id)
                if not llm_config:
                    llm_config = session.exec(select(LLMModel).where(LLMModel.is_default == True)).first()
                
                if llm_config:
                    credential = session.get(Credential, llm_config.credential_id)
                    provider = credential.provider.lower() if credential and credential.provider else "openai"
                    unique_providers.add(provider)
                    agent_llms_data[node.id] = {
                        "model": llm_config.model_name,
                        "provider": provider
                    }
                
                # Function Calling LLM
                fc_id = getattr(node.data, 'function_calling_llm_id', None)
                if fc_id:
                    fc_config = session.get(LLMModel, fc_id)
                    if fc_config:
                        credential = session.get(Credential, fc_config.credential_id)
                        provider = credential.provider.lower() if credential and credential.provider else "openai"
                        unique_providers.add(provider)
                        agent_llms_data[f"function_calling_{node.id}"] = {
                            "model": fc_config.model_name,
                            "provider": provider
                        }
            elif node.type == 'crew':
                # MANAGER LLM
                manager_id = getattr(node.data, 'manager_llm_id', None)
                if manager_id:
                    manager_config = session.get(LLMModel, manager_id)
                    if manager_config:
                        credential = session.get(Credential, manager_config.credential_id)
                        provider = credential.provider.lower() if credential and credential.provider else "openai"
                        unique_providers.add(provider)
                        agent_llms_data[f"manager_{node.id}"] = {
                            "model": manager_config.model_name,
                            "provider": provider
                        }
                
                # PLANNING LLM
                planning_id = getattr(node.data, 'planning_llm_id', None)
                if planning_id:
                    planning_config = session.get(LLMModel, planning_id)
                    if planning_config:
                        credential = session.get(Credential, planning_config.credential_id)
                        provider = credential.provider.lower() if credential and credential.provider else "openai"
                        unique_providers.add(provider)
                        agent_llms_data[f"planning_{node.id}"] = {
                            "model": planning_config.model_name,
                            "provider": provider
                        }
                
                # FUNCTION CALLING LLM (CREW LEVEL)
                fc_id = getattr(node.data, 'function_calling_llm_id', None)
                if fc_id:
                    fc_config = session.get(LLMModel, fc_id)
                    if fc_config:
                        credential = session.get(Credential, fc_config.credential_id)
                        provider = credential.provider.lower() if credential and credential.provider else "openai"
                        unique_providers.add(provider)
                        agent_llms_data[f"function_calling_{node.id}"] = {
                            "model": fc_config.model_name,
                            "provider": provider
                        }
        
        # Fetch Workspace
        workspace_path = None
        settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
        if settings and settings.active_workspace_id:
            ws = session.get(Workspace, settings.active_workspace_id)
            if ws:
                workspace_path = ws.path # Relative path like 'workspaces/xxx'

        # Fetch MCP Servers
        if all_mcp_ids:
            statement = select(MCPServer).where(MCPServer.id.in_(list(all_mcp_ids)))
            mcp_records = session.exec(statement).all()
            for rec in mcp_records:
                mcp_servers_data.append({
                    "id": str(rec.id),
                    "name": rec.name,
                    "transport_type": rec.transport_type,
                    "command": rec.command,
                    "args": rec.args,
                    "env_vars": rec.env_vars
                })

        zip_bytes = generate_python_project(
            graph_data, 
            project.name,
            author_name=author_name,
            author_email=author_email,
            mcp_servers=mcp_servers_data,
            project_description=project.description or "",
            agent_llms=agent_llms_data,
            providers=list(unique_providers),
            workspace_path=workspace_path
        )
        
        # Nome do arquivo sanitizado para o header de download
        filename = f"{project.name.lower().replace(' ', '_')}_crew.zip"
        
        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar exportação: {str(e)}")

# --- CRUD de Credenciais ---

@app.post("/api/v1/credentials", response_model=CredentialRead)
async def create_credential(credential: CredentialCreate, session: Session = Depends(get_session)):
    new_credential = Credential(
        **credential.model_dump(),
        user_id=ROOT_USER_ID
    )
    session.add(new_credential)
    session.commit()
    session.refresh(new_credential)
    return CredentialRead.from_orm(new_credential)

@app.get("/api/v1/credentials", response_model=List[CredentialRead])
async def list_credentials(session: Session = Depends(get_session)):
    statement = select(Credential).where(Credential.user_id == ROOT_USER_ID).order_by(Credential.created_at.desc())
    credentials = session.exec(statement).all()
    return [CredentialRead.from_orm(c) for c in credentials]

@app.get("/api/v1/credentials/{credential_id}", response_model=CredentialRead)
async def get_credential(credential_id: str, session: Session = Depends(get_session)):
    credential = session.get(Credential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credencial não encontrada")
    return CredentialRead.from_orm(credential)

@app.delete("/api/v1/credentials/{credential_id}")
async def delete_credential(credential_id: str, session: Session = Depends(get_session)):
    credential = session.get(Credential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credencial não encontrada")
    session.delete(credential)
    session.commit()
    return {"message": "Credencial removida com sucesso"}

# --- CRUD de Modelos de AI (LLM Models) ---

@app.get("/api/v1/models", response_model=List[LLMModelRead])
async def list_models(session: Session = Depends(get_session)):
    statement = select(LLMModel).where(LLMModel.user_id == ROOT_USER_ID).order_by(LLMModel.created_at.desc())
    models = session.exec(statement).all()
    return models

@app.post("/api/v1/models", response_model=LLMModelRead)
async def create_model(model: LLMModelCreate, session: Session = Depends(get_session)):
    # Se for default, remove default de outros do mesmo usuário
    if model.is_default:
        statement = select(LLMModel).where(LLMModel.user_id == ROOT_USER_ID, LLMModel.is_default == True)
        existing_defaults = session.exec(statement).all()
        for d in existing_defaults:
            d.is_default = False
            session.add(d)

    new_model = LLMModel(
        **model.model_dump(),
        user_id=ROOT_USER_ID
    )
    session.add(new_model)
    session.commit()
    session.refresh(new_model)
    return new_model

@app.patch("/api/v1/models/{model_id}", response_model=LLMModelRead)
@app.put("/api/v1/models/{model_id}", response_model=LLMModelRead)
async def update_model(model_id: str, model_update: LLMModelUpdate, session: Session = Depends(get_session)):
    db_model = session.get(LLMModel, model_id)
    if not db_model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    
    update_data = model_update.model_dump(exclude_unset=True)
    
    # Lógica de Default Único
    if update_data.get("is_default"):
        statement = select(LLMModel).where(LLMModel.user_id == ROOT_USER_ID, LLMModel.is_default == True)
        existing_defaults = session.exec(statement).all()
        for d in existing_defaults:
            if str(d.id) != model_id:
                d.is_default = False
                session.add(d)

    for key, value in update_data.items():
        setattr(db_model, key, value)
    
    session.add(db_model)
    session.commit()
    session.refresh(db_model)
    return db_model

@app.delete("/api/v1/models/{model_id}")
async def delete_model(model_id: str, session: Session = Depends(get_session)):
    model = session.get(LLMModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    session.delete(model)
    session.commit()
    return {"message": "Modelo removido com sucesso"}

@app.post("/api/v1/models/{model_id}/set-default", response_model=LLMModelRead)
async def set_default_model(model_id: str, session: Session = Depends(get_session)):
    db_model = session.get(LLMModel, model_id)
    if not db_model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    
    # Remove outros defaults
    statement = select(LLMModel).where(LLMModel.user_id == ROOT_USER_ID, LLMModel.is_default == True)
    existing_defaults = session.exec(statement).all()
    for d in existing_defaults:
        d.is_default = False
        session.add(d)
    
    db_model.is_default = True
    session.add(db_model)
    session.commit()
    session.refresh(db_model)
    return db_model

# --- CRUD de Gerenciamento de MCP Servers ---
@app.post("/api/v1/mcp-servers", response_model=MCPServerRead)
async def create_mcp_server(mcp: MCPServerCreate, session: Session = Depends(get_session)):
    new_mcp = MCPServer(
        **mcp.model_dump(),
        user_id=ROOT_USER_ID
    )
    session.add(new_mcp)
    session.commit()
    session.refresh(new_mcp)
    return new_mcp

@app.get("/api/v1/mcp-servers", response_model=List[MCPServerRead])
async def list_mcp_servers(session: Session = Depends(get_session)):
    statement = select(MCPServer).where(MCPServer.user_id == ROOT_USER_ID).order_by(MCPServer.created_at.desc())
    servers = session.exec(statement).all()
    return servers

@app.get("/api/v1/mcp-servers/{mcp_id}", response_model=MCPServerRead)
async def get_mcp_server(mcp_id: str, session: Session = Depends(get_session)):
    mcp = session.get(MCPServer, mcp_id)
    if not mcp:
        raise HTTPException(status_code=404, detail="Servidor MCP não encontrado")
    return mcp

@app.patch("/api/v1/mcp-servers/{mcp_id}", response_model=MCPServerRead)
@app.put("/api/v1/mcp-servers/{mcp_id}", response_model=MCPServerRead)
async def update_mcp_server(mcp_id: str, mcp_update: MCPServerUpdate, session: Session = Depends(get_session)):
    db_mcp = session.get(MCPServer, mcp_id)
    if not db_mcp:
        raise HTTPException(status_code=404, detail="Servidor MCP não encontrado")
    
    update_data = mcp_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_mcp, key, value)
    
    session.add(db_mcp)
    session.commit()
    session.refresh(db_mcp)
    return db_mcp

@app.delete("/api/v1/mcp-servers/{mcp_id}")
async def delete_mcp_server(mcp_id: str, session: Session = Depends(get_session)):
    mcp = session.get(MCPServer, mcp_id)
    if not mcp:
        raise HTTPException(status_code=404, detail="Servidor MCP não encontrado")
    session.delete(mcp)
    session.commit()
    return {"message": "Servidor MCP removido com sucesso"}
    
# --- CRUD de Gerenciamento de Custom Tools ---

@app.post("/api/v1/custom-tools", response_model=CustomToolRead)
async def create_custom_tool(tool: CustomToolCreate, session: Session = Depends(get_session)):
    new_tool = CustomTool(
        **tool.model_dump(),
        user_id=ROOT_USER_ID
    )
    session.add(new_tool)
    session.commit()
    session.refresh(new_tool)
    return new_tool

@app.get("/api/v1/custom-tools", response_model=List[CustomToolRead])
async def list_custom_tools(session: Session = Depends(get_session)):
    statement = select(CustomTool).where(CustomTool.user_id == ROOT_USER_ID).order_by(CustomTool.created_at.desc())
    tools = session.exec(statement).all()
    return tools

@app.get("/api/v1/custom-tools/{tool_id}", response_model=CustomToolRead)
async def get_custom_tool(tool_id: str, session: Session = Depends(get_session)):
    tool = session.get(CustomTool, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Custom Tool não encontrada")
    return tool

@app.patch("/api/v1/custom-tools/{tool_id}", response_model=CustomToolRead)
@app.put("/api/v1/custom-tools/{tool_id}", response_model=CustomToolRead)
async def update_custom_tool(tool_id: str, tool_update: CustomToolUpdate, session: Session = Depends(get_session)):
    db_tool = session.get(CustomTool, tool_id)
    if not db_tool:
        raise HTTPException(status_code=404, detail="Custom Tool não encontrada")
    
    update_data = tool_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tool, key, value)
    
    session.add(db_tool)
    session.commit()
    session.refresh(db_tool)
    return db_tool

@app.delete("/api/v1/custom-tools/{tool_id}")
async def delete_custom_tool(tool_id: str, session: Session = Depends(get_session)):
    tool = session.get(CustomTool, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Custom Tool não encontrada")
    session.delete(tool)
    session.commit()
    return {"message": "Custom Tool removida com sucesso"}

# --- CRUD de Gerenciamento de Workspaces ---

import os
from pathlib import Path

def ensure_workspace_dir(workspace_path: str) -> str:
    """Garante que a pasta existe e retorna o path relativo (ex: workspaces/minha-pasta)"""
    try:
        # 1. Normaliza o path: remove leading slashes e ./
        clean_path = workspace_path.lstrip("./\\ ")
        
        # 2. Garante o prefixo workspaces/
        if not clean_path.startswith("workspaces"):
            normalized_path = os.path.join("workspaces", clean_path)
        else:
            normalized_path = clean_path
            
        # 3. Cria a pasta fisicamente
        abs_path = os.path.abspath(os.path.join(os.getcwd(), normalized_path))
        if not os.path.exists(abs_path):
            os.makedirs(abs_path, exist_ok=True)
            print(f"Diretório de Workspace criado: {abs_path}")
            
        return normalized_path.replace("\\", "/") # Retorna sempre com forward slashes para o DB
    except Exception as e:
        print(f"Erro ao criar diretório de workspace: {e}")
        return workspace_path

@app.post("/api/v1/workspaces", response_model=WorkspaceRead)
async def create_workspace(ws: WorkspaceCreate, session: Session = Depends(get_session)):
    # Check for duplicates
    existing = session.exec(select(Workspace).where(Workspace.path == ws.path)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Um workspace com este caminho já existe")

    # Garante que a pasta existe e normaliza o path para o banco
    normalized_path = ensure_workspace_dir(ws.path)
    
    new_ws = Workspace(
        name=ws.name,
        path=normalized_path,
        user_id=ROOT_USER_ID
    )
    session.add(new_ws)
    session.commit()
    session.refresh(new_ws)
    return new_ws

@app.get("/api/v1/workspaces", response_model=List[WorkspaceRead])
async def list_workspaces(session: Session = Depends(get_session)):
    statement = select(Workspace).where(Workspace.user_id == ROOT_USER_ID).order_by(Workspace.created_at.desc())
    workspaces = session.exec(statement).all()
    return workspaces

@app.get("/api/v1/workspaces/{ws_id}", response_model=WorkspaceRead)
async def get_workspace(ws_id: str, session: Session = Depends(get_session)):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    return ws

@app.patch("/api/v1/workspaces/{ws_id}", response_model=WorkspaceRead)
@app.put("/api/v1/workspaces/{ws_id}", response_model=WorkspaceRead)
async def update_workspace(ws_id: str, ws_update: WorkspaceUpdate, session: Session = Depends(get_session)):
    db_ws = session.get(Workspace, ws_id)
    if not db_ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    update_data = ws_update.model_dump(exclude_unset=True)
    
    # Se mudar o path, garante que a nova pasta existe e não é duplicada
    if 'path' in update_data:
        normalized_path = ensure_workspace_dir(update_data['path'])
        if normalized_path != db_ws.path:
            existing = session.exec(select(Workspace).where(Workspace.path == normalized_path)).first()
            if existing:
                raise HTTPException(status_code=400, detail="Um workspace com este caminho já existe")
        update_data['path'] = normalized_path
        
    for key, value in update_data.items():
        setattr(db_ws, key, value)
    
    session.add(db_ws)
    session.commit()
    session.refresh(db_ws)
    return db_ws

@app.delete("/api/v1/workspaces/{ws_id}")
async def delete_workspace(ws_id: str, session: Session = Depends(get_session)):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    # Se era o workspace ativo, limpa nas configurações
    settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
    if settings and str(settings.active_workspace_id) == ws_id:
        settings.active_workspace_id = None
        session.add(settings)
        
    session.delete(ws)
    session.commit()
    return {"message": "Workspace removido com sucesso"}

@app.post("/api/v1/workspaces/{ws_id}/open")
async def open_workspace(ws_id: str, session: Session = Depends(get_session)):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    abs_path = os.path.abspath(os.path.join(os.getcwd(), ws.path))
    if not os.path.exists(abs_path):
        os.makedirs(abs_path, exist_ok=True)
    
    try:
        os.startfile(abs_path)
        return {"message": f"Workspace {ws.name} aberto no explorador de arquivos"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao abrir workspace: {str(e)}")

@app.get("/api/v1/workspaces/{ws_id}/files")
async def list_workspace_files(ws_id: str, session: Session = Depends(get_session)):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    abs_root = os.path.abspath(os.path.join(os.getcwd(), ws.path))
    if not os.path.exists(abs_root):
        return []

    def build_tree(current_path):
        tree = []
        try:
            for entry in os.scandir(current_path):
                rel_path = os.path.relpath(entry.path, abs_root)
                node = {
                    "name": entry.name,
                    "path": rel_path.replace("\\", "/"),
                    "is_dir": entry.is_dir()
                }
                if entry.is_dir():
                    node["children"] = build_tree(entry.path)
                tree.append(node)
        except Exception:
            pass
        # Sort: Folders first, then alphabetically
        tree.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return tree

    return build_tree(abs_root)

@app.get("/api/v1/workspaces/{ws_id}/files/content")
async def get_file_content(ws_id: str, path: str, session: Session = Depends(get_session)):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    abs_root = os.path.abspath(os.path.join(os.getcwd(), ws.path))
    # Security: join and check realpath to prevent traversal
    target_path = os.path.abspath(os.path.join(abs_root, path))
    
    if not target_path.startswith(abs_root):
        raise HTTPException(status_code=403, detail="Acesso negado (tentativa de path traversal)")
    
    if not os.path.exists(target_path) or os.path.isdir(target_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    try:
        with open(target_path, "r", encoding="utf-8") as f:
            content = f.read()
            return {"content": content}
    except UnicodeDecodeError:
        return {"content": "[Arquivo binário ou codificação não suportada]"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/workspaces/{ws_id}/download-zip")
async def download_workspace_zip(
    ws_id: str, 
    path: str = "", 
    background_tasks: BackgroundTasks = None,
    session: Session = Depends(get_session)
):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    abs_root = os.path.abspath(os.path.join(os.getcwd(), ws.path))
    target_path = os.path.abspath(os.path.join(abs_root, path))
    
    if not target_path.startswith(abs_root):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not os.path.exists(target_path) or not os.path.isdir(target_path):
        raise HTTPException(status_code=404, detail="Diretório não encontrado")

    temp_dir = tempfile.mkdtemp()
    base_name = f"{ws.name}_{path.replace('/', '_') or 'full'}"
    zip_output_base = os.path.join(temp_dir, base_name)
    
    try:
        zip_file_path = shutil.make_archive(zip_output_base, 'zip', target_path)
        
        def cleanup():
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
            
        if background_tasks:
            background_tasks.add_task(cleanup)
        
        return FileResponse(
            path=zip_file_path,
            filename=f"{base_name}.zip",
            media_type="application/zip"
        )
    except Exception as e:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/workspaces/{ws_id}/upload")
async def upload_workspace_files(
    ws_id: str,
    files: List[UploadFile] = File(...),
    paths: List[str] = Form(...),
    session: Session = Depends(get_session)
):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    abs_root = os.path.abspath(os.path.join(os.getcwd(), ws.path))
    if not os.path.exists(abs_root):
        os.makedirs(abs_root, exist_ok=True)

    # Note: paths will be received as a list of strings, one for each file.
    # Frontend will send webkitRelativePath for folder uploads or just filename for single files.
    
    saved_files = []
    
    for file, rel_path in zip(files, paths):
        # Security: prevent traversal
        # rel_path could be like "folder/sub/file.txt" or "file.txt"
        target_path = os.path.abspath(os.path.join(abs_root, rel_path))
        if not target_path.startswith(abs_root):
            continue # Skip invalid paths
        
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        # Save file (overwrite if exists)
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        saved_files.append(rel_path)

    return {"message": f"{len(saved_files)} arquivos carregados com sucesso", "files": saved_files}


@app.delete("/api/v1/workspaces/{ws_id}/files")
async def delete_workspace_file(
    ws_id: str,
    path: str = Query(...),
    session: Session = Depends(get_session)
):
    ws = session.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    abs_root = os.path.abspath(os.path.join(os.getcwd(), ws.path))
    target_path = os.path.abspath(os.path.join(abs_root, path))
    
    if not target_path.startswith(abs_root):
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Arquivo ou pasta não encontrado")

    try:
        if os.path.isdir(target_path):
            shutil.rmtree(target_path)
        else:
            os.remove(target_path)
        return {"message": f"{'Pasta' if os.path.isdir(target_path) else 'Arquivo'} removido com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Settings Endpoints ---
@app.get("/api/v1/settings", response_model=AppSettingsRead)
async def get_settings(session: Session = Depends(get_session)):
    settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
    if not settings:
        settings = AppSettings(user_id=ROOT_USER_ID)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@app.patch("/api/v1/settings", response_model=AppSettingsRead)
@app.put("/api/v1/settings", response_model=AppSettingsRead)
async def update_settings(settings_update: AppSettingsUpdate, session: Session = Depends(get_session)):
    db_settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
    if not db_settings:
        db_settings = AppSettings(user_id=ROOT_USER_ID)
    
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_settings, key, value)
    
    session.add(db_settings)
    session.commit()
    session.refresh(db_settings)
    return db_settings

# --- AI Suggestions ---
@app.post("/api/v1/ai/suggest", response_model=AiSuggestionResponse)
async def suggest_ai_content(request: AiSuggestionRequest):
    suggestion = generate_suggestion(
        field=request.field,
        agent_name=request.agent_name,
        workflow_name=request.workflow_name,
        workflow_description=request.workflow_description,
        current_value=request.current_value,
        root_user_id=ROOT_USER_ID
    )
    return AiSuggestionResponse(suggestion=suggestion)

@app.post("/api/v1/ai/bulk-suggest", response_model=AiBulkSuggestionResponse)
async def suggest_bulk_ai_content(request: AiBulkSuggestionRequest):
    result = generate_bulk_suggestion(
        agent_name=request.agent_name,
        workflow_name=request.workflow_name,
        workflow_description=request.workflow_description,
        current_values=request.current_values,
        root_user_id=ROOT_USER_ID
    )
    return AiBulkSuggestionResponse(**result)

@app.post("/api/v1/ai/task-bulk-suggest", response_model=AiTaskBulkSuggestionResponse)
async def suggest_task_bulk_ai_content(request: AiTaskBulkSuggestionRequest):
    result = generate_task_bulk_suggestion(
        task_name=request.task_name,
        agent_name=request.agent_name,
        workflow_name=request.workflow_name,
        workflow_description=request.workflow_description,
        current_values=request.current_values,
        root_user_id=ROOT_USER_ID
    )
    return AiTaskBulkSuggestionResponse(**result)
