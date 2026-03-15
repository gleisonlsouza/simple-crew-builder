from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from .crew_builder import run_crew_stream
from .database import init_db, get_session
from .models import CrewProject, User, Credential, LLMModel
from .schemas import (
    GraphData, ProjectCreate, ProjectRead, ProjectUpdate, 
    CredentialCreate, CredentialRead, CredentialUpdate,
    LLMModelCreate, LLMModelRead, LLMModelUpdate
)

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
