import io
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from .crew_builder import run_crew_stream
from .database import init_db, get_session
from .models import CrewProject, User, Credential, LLMModel, MCPServer, AppSettings, CustomTool
from .schemas import (
    GraphData, ProjectCreate, ProjectRead, ProjectUpdate, 
    CredentialCreate, CredentialRead, CredentialUpdate,
    LLMModelCreate, LLMModelRead, LLMModelUpdate,
    MCPServerCreate, MCPServerRead, MCPServerUpdate,
    CustomToolCreate, CustomToolRead, CustomToolUpdate,
    AppSettingsRead, AppSettingsUpdate,
    AiSuggestionRequest, AiSuggestionResponse,
    AiBulkSuggestionRequest, AiBulkSuggestionResponse,
    AiTaskBulkSuggestionRequest, AiTaskBulkSuggestionResponse
)
from .exporter import generate_python_project
from .ai_service import generate_suggestion, generate_bulk_suggestion, generate_task_bulk_suggestion

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa o banco e o usuário seed no startup
    init_db()
    yield

app = FastAPI(
    title="SimpleCrew Backend API",
    description="Endpoint recebedor de Grafos visuais React Flow para rodar CrewAI via Python nativo",
    version="1.0.0",
    lifespan=lifespan
)

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

@app.post("/api/v1/run-crew")
async def execute_crew(
    graph_data: GraphData, 
    save_to_db: bool = Query(False),
    session: Session = Depends(get_session)
):
    try:
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
                    user_id=user.id
                )
                session.add(new_crew)
                session.commit()
                print(f"--- Crew '{crew_name}' persistida no banco! ---")

        # Resolve Custom Tools do Banco de Dados
        graph_data = resolve_custom_tools(graph_data, session)

        # Despacha as dependências e payload JSON para a magia do nosso Parser local CrewAI Stream
        return StreamingResponse(
            run_crew_stream(graph_data), 
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
        if node.type == 'agent' and hasattr(node.data, 'customToolIds') and node.data.customToolIds:
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
            providers=list(unique_providers)
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
