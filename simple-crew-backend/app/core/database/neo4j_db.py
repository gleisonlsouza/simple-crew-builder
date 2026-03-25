from neo4j import GraphDatabase, Driver
from typing import Optional, Generator
from ..config import settings

class Neo4jManager:
    _instance: Optional['Neo4jManager'] = None
    _driver: Optional[Driver] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Neo4jManager, cls).__new__(cls)
        return cls._instance

    def init_driver(self):
        """Inicializa o driver do Neo4j se ainda não estiver instanciado."""
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )
            print("--- Neo4j Driver Initialized ---")

    def close(self):
        """Fecha a conexão com o driver."""
        if self._driver:
            self._driver.close()
            self._driver = None
            print("--- Neo4j Driver Closed ---")

    def create_vector_index(self, dimension: int):
        """Cria o índice de vetor no Neo4j se não existir com a dimensão dinâmica."""
        query = f"""
        CREATE VECTOR INDEX kb_vector_index IF NOT EXISTS
        FOR (n:Chunk)
        ON (n.embedding)
        OPTIONS {{indexConfig: {{
         `vector.dimensions`: {int(dimension)},
         `vector.similarity_function`: 'cosine'
        }}}}
        """
        try:
            with self.driver.session() as session:
                session.run(query)
                print(f"--- Neo4j Vector Index Verified/Created (Dim: {dimension}) ---")
        except Exception as e:
            print(f"Erro ao criar índice vetorial: {e}")

    @property
    def driver(self) -> Driver:
        if self._driver is None:
            self.init_driver()
        return self._driver

# Instância Singleton
neo4j_manager = Neo4jManager()

def get_neo4j_session() -> Generator:
    """Dependency para injeção de sessão do Neo4j no FastAPI."""
    driver = neo4j_manager.driver
    session = driver.session()
    try:
        yield session
    finally:
        session.close()
