from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
import os
import shutil
import uuid
from neo4j import Session as Neo4jSession
from ..core.database.neo4j_db import get_neo4j_session
from ..schemas import KnowledgeBaseCreate, KnowledgeBaseResponse, KnowledgeBaseDocumentResponse
from ..core.rag.indexer import process_document
from ..core.rag.repository_ingestion import ingest_repository_zip
from ..ai_service import get_embedding_model_config
from ..database import engine
from sqlmodel import Session

router = APIRouter(prefix="/api/knowledge-bases", tags=["Knowledge Base"])

# Configura diretório de uploads
UPLOAD_DIR = "storage/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(
    kb: KnowledgeBaseCreate, 
    session: Neo4jSession = Depends(get_neo4j_session)
):
    """Cria uma nova Knowledge Base no Neo4j."""
    query = """
    CREATE (kb:KnowledgeBase {
        id: randomUUID(), 
        name: $name, 
        description: $description, 
        created_at: datetime()
    }) 
    RETURN kb.id AS id, kb.name AS name, kb.description AS description, kb.created_at AS created_at
    """
    try:
        result = session.run(query, name=kb.name, description=kb.description)
        record = result.single()
        if not record:
            raise HTTPException(status_code=500, detail="Erro ao criar Knowledge Base")
        
        return KnowledgeBaseResponse(
            id=record["id"],
            name=record["name"],
            description=record["description"],
            created_at=str(record["created_at"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no Neo4j: {str(e)}")

@router.get("", response_model=List[KnowledgeBaseResponse])
async def list_knowledge_bases(session: Neo4jSession = Depends(get_neo4j_session)):
    """Lista todas as Knowledge Bases do Neo4j."""
    query = """
    MATCH (kb:KnowledgeBase) 
    RETURN kb.id AS id, kb.name AS name, kb.description AS description, kb.created_at AS created_at 
    ORDER BY kb.created_at DESC
    """
    try:
        result = session.run(query)
        kbs = []
        for record in result:
            kbs.append(KnowledgeBaseResponse(
                id=record["id"],
                name=record["name"],
                description=record["description"],
                created_at=str(record["created_at"])
            ))
        return kbs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar Knowledge Bases: {str(e)}")

@router.get("/{kb_id}/documents", response_model=List[KnowledgeBaseDocumentResponse])
async def list_documents(kb_id: str, session: Neo4jSession = Depends(get_neo4j_session)):
    """Lista documentos de uma base."""
    query = """
    MATCH (d:Document)-[:BELONGS_TO]->(kb:KnowledgeBase {id: $kb_id})
    RETURN d.id AS id, d.filename AS filename, d.size AS size, d.created_at AS created_at
    ORDER BY d.created_at DESC
    """
    try:
        result = session.run(query, kb_id=kb_id)
        docs = []
        for record in result:
            docs.append(KnowledgeBaseDocumentResponse(
                id=record["id"],
                filename=record["filename"],
                size=record.get("size"),
                created_at=str(record["created_at"])
            ))
        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar documentos: {str(e)}")

@router.post("/{kb_id}/documents", response_model=List[KnowledgeBaseDocumentResponse])
async def upload_documents(
    kb_id: str, 
    files: List[UploadFile] = File(...), 
    session: Neo4jSession = Depends(get_neo4j_session)
):
    """Faz upload de documentos e vincula à base no Neo4j."""
    
    # 0. Verifica se há modelo de embedding configurado
    with Session(engine) as db_session:
        embedding_config = get_embedding_model_config(db_session)
        if not embedding_config.get("api_key"):
            raise HTTPException(
                status_code=400, 
                detail="Embedding Model not configured. Please set a default embedding model in AI Settings first."
            )

    saved_docs = []
    
    # Verifica se a KB existe
    check_kb = session.run("MATCH (kb:KnowledgeBase {id: $kb_id}) RETURN kb", kb_id=kb_id)
    if not check_kb.single():
        raise HTTPException(status_code=404, detail="Knowledge Base não encontrada")

    # Cria diretório específico para a KB se não existir
    kb_upload_dir = os.path.join(UPLOAD_DIR, kb_id)
    os.makedirs(kb_upload_dir, exist_ok=True)

    for file in files:
        file_path = os.path.join(kb_upload_dir, file.filename)
        
        # Salva o arquivo em sua pasta dedicada
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Pega o tamanho
        file_size = os.path.getsize(file_path)

        # Cria no Neo4j
        query = """
        MATCH (kb:KnowledgeBase {id: $kb_id})
        CREATE (d:Document {
            id: randomUUID(),
            filename: $filename,
            size: $size,
            created_at: datetime()
        })-[:BELONGS_TO]->(kb)
        RETURN d.id AS id, d.filename AS filename, d.size AS size, d.created_at AS created_at
        """
        try:
            result = session.run(query, kb_id=kb_id, filename=file.filename, size=file_size)
            record = result.single()
            if record:
                saved_docs.append(KnowledgeBaseDocumentResponse(
                    id=record["id"],
                    filename=record["filename"],
                    size=record["size"],
                    created_at=str(record["created_at"])
                ))
                
                # Se for ZIP, trata como repositório (Extração Permanente)
                if file.filename.lower().endswith('.zip'):
                    extracted_files = ingest_repository_zip(kb_id, file_path, kb_upload_dir)
                    
                    for f_info in extracted_files:
                        f_doc_id = str(uuid.uuid4())
                        f_rel_path = f_info['rel_path']
                        # Salva cada arquivo como um Documento individual no Neo4j
                        f_query = """
                        MATCH (kb:KnowledgeBase {id: $kb_id})
                        CREATE (d:Document {
                            id: $doc_id,
                            filename: $filename,
                            path: $path,
                            created_at: datetime()
                        })
                        MERGE (d)-[:BELONGS_TO]->(kb)
                        RETURN d
                        """
                        session.run(f_query, 
                            kb_id=kb_id, 
                            doc_id=f_doc_id, 
                            filename=f_rel_path, # Nome amigável com path relativo
                            path=f_info['abs_path']
                        )
                        
                        # Indexa o arquivo individualmente
                        process_document(kb_id, f_info['abs_path'], doc_id=f_doc_id)
                else:
                    # Inicia o Indexador Padrão
                    process_document(kb_id, file_path, doc_id=record["id"])
        except Exception as e:
            # Em produção aqui removeríamos o arquivo físico se o Neo4j falhar
            print(f"Erro ao salvar no Neo4j: {e}")
            continue

    return saved_docs

@router.delete("/{kb_id}/documents/{doc_id}")
async def delete_document(
    kb_id: str,
    doc_id: str,
    session: Neo4jSession = Depends(get_neo4j_session)
):
    """Exclui um documento, seus chunks e o arquivo físico."""
    # 1. Busca informações do documento (Priorizando o path absoluto)
    query_find = """
    MATCH (d:Document {id: $doc_id})-[:BELONGS_TO]->(kb:KnowledgeBase {id: $kb_id}) 
    RETURN d.filename AS filename, d.path AS path
    """
    result = session.run(query_find, doc_id=doc_id, kb_id=kb_id)
    record = result.single()
    
    if not record:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    filename = record["filename"]
    abs_path = record.get("path")
    
    # 2. Determina o caminho físico real
    # Fallback para o modo antigo se path não estiver no Neo4j
    if not abs_path:
        abs_path = os.path.join(UPLOAD_DIR, kb_id, filename)
    
    # 3. Deleta Chunks vinculados
    # Se for um diretório, removemos chunks de TODOS os arquivos dentro dele? 
    # Melhor: se o nó de Documento for deletado, seus chunks vão junto.
    query_del_chunks = "MATCH (c:Chunk)-[:FROM_DOCUMENT]->(d:Document {id: $doc_id}) DETACH DELETE c"
    session.run(query_del_chunks, doc_id=doc_id)
    
    # 4. Se for diretório (como um ZIP extraído), removemos tudo físico e limpamos os documentos órfãos no Neo4j
    if os.path.exists(abs_path):
        try:
            if os.path.isdir(abs_path):
                # Deleta todos os CHUNKS de documentos que estão dentro desta pasta
                query_del_children_chunks = """
                MATCH (d:Document)-[:BELONGS_TO]->(kb:KnowledgeBase {id: $kb_id})
                WHERE d.path STARTS WITH $folder_path
                MATCH (c:Chunk)-[:FROM_DOCUMENT]->(d)
                DETACH DELETE c
                """
                session.run(query_del_children_chunks, kb_id=kb_id, folder_path=abs_path)
                
                # Deleta todos os DOCUMENTOS que estão dentro desta pasta (exceto o que será deletado no fim)
                query_del_children_docs = """
                MATCH (d:Document)-[:BELONGS_TO]->(kb:KnowledgeBase {id: $kb_id})
                WHERE d.path STARTS WITH $folder_path AND d.id <> $doc_id
                DETACH DELETE d
                """
                session.run(query_del_children_docs, kb_id=kb_id, folder_path=abs_path, doc_id=doc_id)
                
                shutil.rmtree(abs_path)
            else:
                os.remove(abs_path)
            print(f"DEBUG: Arquivo/Pasta deletado com sucesso: {abs_path}")
        except Exception as e:
            print(f"DEBUG: Erro ao deletar no disco: {e}")

    # 5. Deleta o Nó do Documento no Neo4j
    query_del_doc = "MATCH (d:Document {id: $doc_id}) DETACH DELETE d"
    session.run(query_del_doc, doc_id=doc_id)
            
    return {"message": "Documento e arquivos físicos excluídos com sucesso"}
    
@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: str,
    session: Neo4jSession = Depends(get_neo4j_session)
):
    """Exclui uma Knowledge Base inteira, todos os seus documentos, chunks e arquivos físicos."""
    
    # 1. Verifica se a KB existe e busca o nome (opcional, para log)
    query_check = "MATCH (kb:KnowledgeBase {id: $kb_id}) RETURN kb.name AS name"
    result = session.run(query_check, kb_id=kb_id)
    record = result.single()
    
    if not record:
        raise HTTPException(status_code=404, detail="Knowledge Base não encontrada")
    
    kb_name = record["name"]

    # 2. Deleção em Cascata no Neo4j (KB, Documentos e Chunks vinculados)
    # Usamos DETACH DELETE para garantir que relacionamentos também sejam removidos.
    query_cascade_del = """
    MATCH (kb:KnowledgeBase {id: $kb_id})
    OPTIONAL MATCH (kb)<-[:BELONGS_TO]-(d:Document)
    OPTIONAL MATCH (d)<-[:FROM_DOCUMENT]-(c:Chunk)
    DETACH DELETE kb, d, c
    """
    try:
        session.run(query_cascade_del, kb_id=kb_id)
        print(f"DEBUG: Neo4j cascade delete complete for KB: {kb_name} ({kb_id})")
    except Exception as e:
        print(f"DEBUG: Erro na deleção Neo4j: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao deletar no Neo4j: {str(e)}")

    # 3. Limpeza do Sistema de Arquivos
    kb_dir = os.path.join(UPLOAD_DIR, kb_id)
    if os.path.exists(kb_dir):
        try:
            shutil.rmtree(kb_dir)
            print(f"DEBUG: Diretório {kb_dir} removido com sucesso.")
        except Exception as e:
            print(f"DEBUG: Erro ao remover diretório {kb_dir}: {e}")
            # Não falhamos o request se o arquivo físico falhar, mas logamos
            
    return {"message": f"Knowledge Base '{kb_name}' e todos os seus dados foram excluídos com sucesso."}
