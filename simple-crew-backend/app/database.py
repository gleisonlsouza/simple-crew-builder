import os
import uuid
from sqlalchemy import text
from sqlmodel import create_engine, SQLModel, Session, select
from dotenv import load_dotenv
from .models import User, CrewProject, Credential, LLMModel, AppSettings, CustomTool, Workspace

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/simple-crew-builder")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)
    
    # Schema Migration for existing databases (Postgres specific)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE llmmodel ALTER COLUMN credential_id DROP NOT NULL"))
            print("--- Migration: credential_id is now nullable in llmmodel! ---")
    except Exception as e:
        # Expected to fail if not using Postgres or specialized environment, but safe to skip
        print(f"--- Migration Note: Manual alter for llmmodel skipped: {e} ---")

    # Workspace Deletion Migration: workspace_id in crewproject
    try:
        with engine.begin() as conn:
            # 1. Alter Column to be Nullable (just in case)
            conn.execute(text("ALTER TABLE crewproject ALTER COLUMN workspace_id DROP NOT NULL"))
            # 2. Drop existing FK constraint (common default name)
            conn.execute(text("ALTER TABLE crewproject DROP CONSTRAINT IF EXISTS crewproject_workspace_id_fkey"))
            # 3. Add new FK constraint with ON DELETE SET NULL
            conn.execute(text("ALTER TABLE crewproject ADD CONSTRAINT crewproject_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE SET NULL"))
            print("--- Migration: workspace_id in crewproject is now nullable and has ON DELETE SET NULL! ---")
    except Exception as e:
        print(f"--- Migration Note: Manual alter for crewproject skipped: {e} ---")
    
    # Seed Root User
    with Session(engine) as session:
        statement = select(User).where(User.email == "gleison.lsouza@gmail.com")
        root_user = session.exec(statement).first()
        
        if not root_user:
            root_user = User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"), # Fixed IDs for root can be useful
                name="Gleison Souza",
                email="gleison.lsouza@gmail.com"
            )
            session.add(root_user)
            session.commit()
            print("--- Seed: Root User 'Gleison Souza' created! ---")
        
        # Seed Settings
        settings = session.exec(select(AppSettings).where(AppSettings.user_id == root_user.id)).first()
        if not settings:
            settings = AppSettings(user_id=root_user.id)
            session.add(settings)
            session.commit()
            print("--- Seed: Default AppSettings created! ---")

def get_session():
    with Session(engine) as session:
        yield session
