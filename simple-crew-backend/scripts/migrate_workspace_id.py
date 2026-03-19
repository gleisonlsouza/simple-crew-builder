import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/simple-crew-builder")

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print(f"Connecting to {DATABASE_URL}...")
        try:
            # Check if column exists first
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='crewproject' AND column_name='workspace_id';
            """))
            if not result.fetchone():
                print("Adding workspace_id column to crewproject table...")
                connection.execute(text("ALTER TABLE crewproject ADD COLUMN workspace_id UUID;"))
                connection.commit()
                print("Migration successful!")
            else:
                print("Column workspace_id already exists.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
