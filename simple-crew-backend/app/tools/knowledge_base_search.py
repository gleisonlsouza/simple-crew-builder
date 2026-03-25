from crewai.tools import tool
from openai import OpenAI
from ..database import engine
from ..ai_service import get_embedding_model_config
from sqlmodel import Session
import os

def get_search_knowledge_base_tool(kb_id: str):
    @tool("company_knowledge_search")
    def search_knowledge_base(query: str, limit: int = 5, offset: int = 0):
        """
        Search the company knowledge base for technical documentation, code snippets, and project rules.
        Use this for ANY question about system architecture, framework details, or specific files.

        Args:
            query (str): The search string or question to look for in the knowledge base.
            limit (int): Maximum number of chunks to return (default: 5). Use this to control result density.
            offset (int): Number of chunks to skip from the beginning (default: 0). Use this for pagination.
        """
        
        # 1. Recupera Configuração do Modelo do Banco de Dados
        with Session(engine) as db_session:
            embedding_config = get_embedding_model_config(db_session)
            api_key = embedding_config.get("api_key")
            model_name = embedding_config.get("model_name")
            
        if not api_key:
            return "Erro: OpenAI API Key não configurada para embeddings."
            
        # 2. Gera o Embedding da Query via Cliente Nativo da OpenAI
        try:
            client = OpenAI(api_key=api_key)
            response = client.embeddings.create(
                input=query,
                model=model_name
            )
            query_vector = response.data[0].embedding
        except Exception as e:
            return f"Erro ao gerar embedding com OpenAI: {str(e)}"
            
        # 3. Busca Vetorial no Neo4j via Driver Oficial
        from ..core.database.neo4j_db import neo4j_manager
        driver = neo4j_manager.driver
        
        # O parâmetro topK deve ser dinâmico para garantir uma pool de candidatos segura antes do filtro do kb_id
        top_k = limit + offset + 20
        
        cypher = """
        MATCH (kb:KnowledgeBase {id: $kb_id})
        CALL db.index.vector.queryNodes('kb_vector_index', $top_k, $query_vector)
        YIELD node AS chunk, score
        MATCH (chunk)-[:BELONGS_TO]->(kb)
        RETURN chunk.text AS text, score
        ORDER BY score DESC
        SKIP $offset
        LIMIT $limit
        """
        
        try:
            print(f"DEBUG: Executing Neo4j RAG search for KB: {kb_id} using query: {query}")
            with driver.session() as neo4j_session:
                result = neo4j_session.run(
                    cypher, 
                    kb_id=kb_id, 
                    query_vector=query_vector,
                    top_k=top_k,
                    offset=offset,
                    limit=limit
                )
                
                context_chunks = []
                for record in result:
                    text = record.get("text")
                    if text:
                        context_chunks.append(text)
                
                print(f"DEBUG: Found {len(context_chunks)} chunks for KB: {kb_id}")
                
                if not context_chunks:
                    return f"Nenhum contexto relevante encontrado para a base {kb_id}."
                    
                return "\n\n---\n\n".join(context_chunks)
                
        except Exception as e:
            print(f"DEBUG: Error in Neo4j RAG search: {str(e)}")
            return f"Erro na consulta ao Neo4j: {str(e)}"

    return search_knowledge_base
