import os
import uuid
from sqlmodel import create_engine, SQLModel, Session, select
from dotenv import load_dotenv
from .models import User, CrewProject, Credential, LLMModel

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/simple-crew-builder")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)
    
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

def get_session():
    with Session(engine) as session:
        yield session
