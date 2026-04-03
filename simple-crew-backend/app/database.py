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
        print(f"--- Migration Note: Manual alter skipped (expected if not Postgres): {e} ---")
    
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
