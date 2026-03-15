import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/simple-crew-builder")

def sync_db():
    engine = create_engine(DATABASE_URL)
    
    def run_sql(sql):
        with engine.connect() as conn:
            try:
                conn.execute(text(sql))
                conn.commit()
                return True
            except Exception as e:
                print(f"Error executing [{sql}]: {e}")
                return False

    print("Checking for 'model' or 'model_name' column in 'llmmodel' table...")
    
    # Try rename model -> model_name
    rename_success = run_sql("ALTER TABLE llmmodel RENAME COLUMN model TO model_name")
    if rename_success:
        print("Renamed 'model' to 'model_name' successfully.")
    
    # Ensure model_name exists
    add_success = run_sql("ALTER TABLE llmmodel ADD COLUMN IF NOT EXISTS model_name VARCHAR")
    if add_success:
        print("Ensured 'model_name' column exists.")
            
    print("Database sync complete.")

if __name__ == "__main__":
    sync_db()
