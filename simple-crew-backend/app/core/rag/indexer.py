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
        print(f"DEBUG: Error extracting text from {file_path}: {e}")
        return False
        
    if not content:
        print(f"DEBUG: No text extracted from {file_path}")
        return False
        
    # 2. Chunking
    language = get_language_from_ext(file_path)
    if language != 'Unknown':
        # Usa o parser especializado para código (injeta headers [File: ...])
        chunks = chunk_code(content, file_path)
    else:
        # Usa o chunker simples para texto geral
        chunks = chunk_text(content)
        
    if not chunks:
        return False
        
    # 3. Get Model Config for Embeddings
    with Session(engine) as db_session:
        embedding_config = get_embedding_model_config(db_session)
        api_key = embedding_config.get("api_key")
        model_name = embedding_config.get("model_name")
        
    if not api_key:
        print("DEBUG: OpenAI API Key not configured for indexing.")
        return False
        
    # 4. Generate Embeddings & Save to Neo4j
    client = OpenAI(api_key=api_key)
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
        print(f"DEBUG: Error during RAG indexing: {e}")
        return False
