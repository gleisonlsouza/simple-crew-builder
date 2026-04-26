import os
from openai import OpenAI
from typing import List
from neo4j import Session as Neo4jSession
from ...database import engine
from .document_parser import extract_text_from_file
from .enterprise_code_parser import chunk_code, get_language_from_ext
from ...ai_service import get_embedding_model_config
from ..database.neo4j_db import neo4j_manager
from sqlmodel import Session

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Divide o texto em chunks com sobreposição."""
    if not text:
        return []
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        
    return chunks

def process_document(kb_id: str, file_path: str, doc_id: str = None):
    """Lê o arquivo, divide em chunks, gera embeddings e salva no Neo4j."""
    print(f"DEBUG: Indexing document {file_path} for KB: {kb_id} (doc_id: {doc_id})")
    
    # 1. Extrai Texto do Arquivo
    try:
        content = extract_text_from_file(file_path)
    except Exception as e:
        raise RuntimeError(f"Error extracting text from {file_path}: {str(e)}")
        
    if not content:
        raise RuntimeError(f"No text extracted from {file_path}")
        
    # 2. Chunking
    language = get_language_from_ext(file_path)
    if language != 'Unknown':
        # Usa o parser especializado para código (injeta headers [File: ...])
        chunks = chunk_code(content, file_path)
    else:
        # Usa o chunker simples para texto geral
        chunks = chunk_text(content)
        
    if not chunks:
        raise RuntimeError("No chunks generated from document")
        
    # 3. Get Model Config for Embeddings
    with Session(engine) as db_session:
        embedding_config = get_embedding_model_config(db_session)
        api_key = embedding_config.get("api_key")
        model_name = embedding_config.get("model_name")
        base_url = embedding_config.get("base_url")
        
    if not api_key:
        raise RuntimeError("OpenAI API Key not configured for indexing.")
        
    # 4. Generate Embeddings & Save to Neo4j
    client = OpenAI(api_key=api_key, base_url=base_url)
    driver = neo4j_manager.driver
    
    try:
        with driver.session() as neo4j_session:
            # Flag para criar o índice apenas uma vez por execução de documento
            index_created = False
            
            for i, chunk in enumerate(chunks):
                # Gera o embedding
                response = client.embeddings.create(
                    input=chunk,
                    model=model_name
                )
                embedding = response.data[0].embedding
                
                # Lazy Creation do Índice Vetorial: detecta dimensão do primeiro chunk e cria se necessário
                if not index_created:
                    dimension = len(embedding)
                    neo4j_manager.create_vector_index(dimension)
                    index_created = True
                
                # Salva o Chunk no Neo4j com vínculo à KB e ao Documento
                query = """
                MATCH (kb:KnowledgeBase {id: $kb_id})
                CREATE (c:Chunk {
                    id: randomUUID(),
                    text: $text,
                    index: $index,
                    file_path: $file_path,
                    language: $language,
                    embedding: $embedding,
                    created_at: datetime()
                })-[:BELONGS_TO]->(kb)
                WITH c
                OPTIONAL MATCH (d:Document {id: $doc_id})
                FOREACH (ignore IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
                    CREATE (c)-[:FROM_DOCUMENT]->(d)
                )
                """
                neo4j_session.run(query, 
                    kb_id=kb_id, 
                    doc_id=doc_id, 
                    text=chunk, 
                    index=i, 
                    file_path=os.path.basename(file_path),
                    language=language,
                    embedding=embedding
                )
                
        print(f"DEBUG: Successfully indexed {len(chunks)} chunks for KB: {kb_id}")
        return True
    except Exception as e:
        # Rethrowing with context
        raise RuntimeError(f"Error during RAG indexing: {str(e)}")

def process_skill_content(skill_id: str, skill_name: str, skill_description: str, text: str, db_session: Session):
    """Lê o texto da skill, divide em chunks, gera embeddings e salva no Neo4j na base Skill Library."""
    print(f"DEBUG: Indexing skill {skill_name} (id: {skill_id})")
    
    # 1. Chunking
    chunks = chunk_text(text)
    if not chunks:
        print("DEBUG: No chunks generated from skill content")
        return False
        
    # 2. Get Model Config for Embeddings
    embedding_config = get_embedding_model_config(db_session)
    api_key = embedding_config.get("api_key")
    model_name = embedding_config.get("model_name")
    base_url = embedding_config.get("base_url")
        
    if not api_key:
        print("DEBUG: OpenAI API Key not configured for embedding. Skipping Neo4j ingestion.")
        return False
        
    # 3. Generate Embeddings & Save to Neo4j
    client = OpenAI(api_key=api_key, base_url=base_url)
    driver = neo4j_manager.driver
    
    try:
        with driver.session() as neo4j_session:
            # Garante que a KnowledgeBase "Skill Library" existe
            kb_query = """
            MERGE (kb:KnowledgeBase {name: 'Skill Library'})
            ON CREATE SET kb.id = randomUUID(), kb.description = 'System Knowledge Base for Agent Skills', kb.is_system = true, kb.created_at = datetime()
            RETURN kb.id AS id
            """
            kb_result = neo4j_session.run(kb_query).single()
            kb_id = kb_result["id"]

            # Cria o nó AgentSkill
            skill_query = """
            MERGE (s:AgentSkill {id: $skill_id})
            ON CREATE SET s.name = $skill_name, s.description = $skill_description
            ON MATCH SET s.name = $skill_name, s.description = $skill_description
            """
            neo4j_session.run(skill_query, skill_id=skill_id, skill_name=skill_name, skill_description=skill_description or "")
            
            # Limpa chunks antigos se houver atualização da mesma skill
            clear_chunks_query = "MATCH (c:Chunk)-[:FROM_SKILL]->(s:AgentSkill {id: $skill_id}) DETACH DELETE c"
            neo4j_session.run(clear_chunks_query, skill_id=skill_id)

            index_created = False
            
            for i, chunk in enumerate(chunks):
                # Gera o embedding
                response = client.embeddings.create(
                    input=chunk,
                    model=model_name
                )
                embedding = response.data[0].embedding
                
                # Lazy Creation do Índice Vetorial
                if not index_created:
                    dimension = len(embedding)
                    neo4j_manager.create_vector_index(dimension)
                    index_created = True
                
                # Salva o Chunk no Neo4j com vínculo à KB e à Skill
                query = """
                MATCH (kb:KnowledgeBase {id: $kb_id})
                MATCH (s:AgentSkill {id: $skill_id})
                CREATE (c:Chunk {
                    id: randomUUID(),
                    text: $text,
                    index: $index,
                    embedding: $embedding,
                    created_at: datetime()
                })-[:BELONGS_TO]->(kb)
                CREATE (c)-[:FROM_SKILL]->(s)
                """
                neo4j_session.run(query, 
                    kb_id=kb_id, 
                    skill_id=skill_id, 
                    text=chunk, 
                    index=i, 
                    embedding=embedding
                )
                
        print(f"DEBUG: Successfully indexed {len(chunks)} chunks for skill: {skill_name}")
        return True
    except Exception as e:
        raise RuntimeError(f"Error during Skill RAG indexing: {str(e)}")

