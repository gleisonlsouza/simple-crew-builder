from typing import Optional
from crewai import LLM
from sqlmodel import Session, select
from .models import AppSettings, LLMModel, Credential, ModelType
from .database import engine
import os

ROOT_USER_ID = "00000000-0000-0000-0000-000000000000"

def get_embedding_key(session: Session) -> Optional[str]:
    """Recupera a API Key do modelo de embedding configurado no sistema."""
    settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
    if not settings or not settings.embedding_model_id:
        return os.getenv("OPENAI_API_KEY")
        
    model = session.get(LLMModel, settings.embedding_model_id)
    if not model:
        return os.getenv("OPENAI_API_KEY")
        
    credential = session.get(Credential, model.credential_id)
    return credential.key if credential else os.getenv("OPENAI_API_KEY")

def get_embedding_model_config(session: Session) -> dict:
    """Retorna a configuração completa (key, model_name e base_url) do embedding."""
    settings = session.exec(select(AppSettings).where(AppSettings.user_id == ROOT_USER_ID)).first()
    
    # Defaults (No fallback to env var to allow "Safety Lock" when not selected)
    api_key = None
    model_name = "text-embedding-3-small"
    base_url = None
    
    if settings and settings.embedding_model_id:
        model = session.get(LLMModel, settings.embedding_model_id)
        if model:
            model_name = model.model_name
            # Fallback para None se for "default" para não quebrar o cliente OpenAI
            base_url = model.base_url if model.base_url and model.base_url != "default" else None
            credential = session.get(Credential, model.credential_id)
            if credential:
                api_key = credential.key
                
    return {"api_key": api_key, "model_name": model_name, "base_url": base_url}

def get_system_llm(session: Session, root_user_id: str) -> Optional[LLM]:
    # 1. Pega o ID do modelo nas configurações
    settings = session.exec(select(AppSettings).where(AppSettings.user_id == root_user_id)).first()
    model_id = settings.system_ai_model_id if settings else None
    
    # 2. Busca o modelo (específico ou default)
    llm_config = None
    if model_id:
        llm_config = session.get(LLMModel, model_id)
    
    if not llm_config:
        llm_config = session.exec(select(LLMModel).where(LLMModel.is_default == True)).first()
        
    if not llm_config:
        return None
        
    # 3. Busca a credencial
    credential = session.get(Credential, llm_config.credential_id)
    if not credential:
        return None
        
    # 4. Configura o LLM do CrewAI
    llm_params = {
        "model": llm_config.model_name,
        "api_key": credential.key,
    }
    if llm_config.temperature is not None: llm_params["temperature"] = llm_config.temperature
    if llm_config.max_tokens is not None: llm_params["max_tokens"] = llm_config.max_tokens
    if llm_config.max_completion_tokens is not None: llm_params["max_completion_tokens"] = llm_config.max_completion_tokens
    if llm_config.base_url and llm_config.base_url != "default": llm_params["base_url"] = llm_config.base_url
    if credential.provider: llm_params["provider"] = credential.provider
    
    return LLM(**llm_params)

def generate_suggestion(
    field: str,
    agent_name: str,
    workflow_name: Optional[str],
    workflow_description: Optional[str],
    current_value: Optional[str],
    root_user_id: str
) -> str:
    with Session(engine) as session:
        llm = get_system_llm(session, root_user_id)
        if not llm:
            return "Error: No System AI model configured."
            
        # Prompts baseados no campo
        context = f"Workflow: {workflow_name or 'Unnamed'}\nDescription: {workflow_description or 'No description'}\nAgent Name: {agent_name}"
        if current_value:
            context += f"\nCurrent {field.capitalize()}: {current_value}"
            
        prompts = {
            "role": f"Suggest a 'Role' for this CrewAI Agent. Return ONLY the role title, no prefixes like 'Role:', no quotes, and no extra text. Example: 'Senior Market Analyst'.\nIMPORTANT: Detect the language of the context below and respond in that same language.\nContext:\n{context}",
            "goal": f"Suggest a 'Goal' for this CrewAI Agent. Return ONLY the goal description, no prefixes like 'Goal:', no quotes, and no extra text.\nIMPORTANT: Detect the language of the context below and respond in that same language.\nContext:\n{context}",
            "backstory": f"Suggest a 'Backstory' for this CrewAI Agent. Return ONLY the backstory text, no prefixes like 'Backstory:', no quotes, and no extra text.\nIMPORTANT: Detect the language of the context below and respond in that same language.\nContext:\n{context}",
            "description": f"Suggest a 'Description' for this CrewAI Task. Return ONLY the description text, no prefixes like 'Description:', no quotes, and no extra text.\nIMPORTANT: Detect the language of the context below and respond in that same language.\nContext:\n{context}",
            "expected_output": f"Suggest an 'Expected Output' for this CrewAI Task. Return ONLY the expected output text, no prefixes like 'Expected Output:', no quotes, and no extra text.\nIMPORTANT: Detect the language of the context below and respond in that same language.\nContext:\n{context}"
        }
        
        prompt = prompts.get(field, f"Suggest content for the field {field}. Return ONLY the content. Context:\n{context}")
        
        try:
            # O invoke do CrewAI LLM retorna a string da resposta
            response = llm.call([{"role": "user", "content": prompt}])
            if not response:
                return "No suggestion generated."
            
            # Post-processing to remove common prefixes just in case
            suggestion = response.strip()
            prefixes_to_remove = [
                "Role:", "Goal:", "Backstory:", "Description:", "Expected Output:",
                "role:", "goal:", "backstory:", "description:", "expected_output:"
            ]
            for p in prefixes_to_remove:
                if suggestion.lower().startswith(p.lower()):
                    suggestion = suggestion[len(p):].strip()
            
            # Remove leading/trailing quotes if the LLM added them
            if suggestion.startswith('"') and suggestion.endswith('"'):
                suggestion = suggestion[1:-1].strip()
                
            return suggestion
        except Exception as e:
            return f"Error invoking AI: {str(e)}"

def generate_bulk_suggestion(
    agent_name: str,
    workflow_name: str,
    workflow_description: str,
    current_values: dict,
    root_user_id: str
) -> dict:
    """
    Generates suggestions for Role, Goal, and Backstory in a single LLM call.
    Returns a dictionary with 'role', 'goal', and 'backstory'.
    """
    with Session(engine) as session:
        llm = get_system_llm(session, root_user_id)
        if not llm:
            return {
                "role": "LLM not configured.",
                "goal": "LLM not configured.",
                "backstory": "LLM not configured."
            }

    context = f"Workflow: {workflow_name}\nDescription: {workflow_description}\nAgent Name: {agent_name}"
    if current_values:
        context += f"\nCurrent Values: {current_values}"

    prompt = f"""
    You are an expert CrewAI assistant. Suggest a 'Role', 'Goal', and 'Backstory' for the following Agent.
    
    {context}
    
    RULES:
    1. Respond ONLY with a valid JSON object.
    2. JSON structure: {{"role": "...", "goal": "...", "backstory": "..."}}
    3. Do NOT include any prefixes like 'Role:', 'Goal:', or 'Backstory:' in the values.
    4. IMPORTANT: Detect the language of the context and respond in that SAME language, be careful not to confuse Portuguese with Spanish.     
    5. Be concise and professional.
    """

    try:
        response = llm.call([{"role": "user", "content": prompt}])
        if not response:
            return {"role": "", "goal": "", "backstory": ""}
        
        # Clean the response to ensure it's just JSON
        content = response.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            # Try to find the second line if it starts with ```json or just ```
            lines = content.splitlines()
            if lines[0].startswith("```"):
                content = "\n".join(lines[1:-1]).strip()
        
        import json
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: try to find the first { and last }
            import re
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise ValueError(f"LLM response is not a valid JSON: {content}")
        
        # Ensure all fields exist
        return {
            "role": str(data.get("role", "")).strip(),
            "goal": str(data.get("goal", "")).strip(),
            "backstory": str(data.get("backstory", "")).strip()
        }
    except Exception as e:
        import traceback
        print(f"Error in bulk AI: {e}")
        # traceback.print_exc()
        return {
            "role": f"Error: {str(e)}",
            "goal": "",
            "backstory": ""
        }

def generate_task_bulk_suggestion(
    task_name: str,
    agent_name: Optional[str],
    workflow_name: str,
    workflow_description: str,
    current_values: dict,
    root_user_id: str
) -> dict:
    """
    Generates suggestions for Task Description and Expected Output in a single LLM call.
    Returns a dictionary with 'description' and 'expected_output'.
    """
    with Session(engine) as session:
        llm = get_system_llm(session, root_user_id)
        if not llm:
            return {
                "description": "LLM not configured.",
                "expected_output": "LLM not configured."
            }

    context = f"Workflow: {workflow_name}\nWorkflow Description: {workflow_description}\nTask Name: {task_name}"
    if agent_name:
        context += f"\nAssigned Agent: {agent_name}"
    if current_values:
        context += f"\nCurrent Values: {current_values}"

    prompt = f"""
    You are an expert CrewAI assistant. Suggest a 'Description' and 'Expected Output' for the following Task.
    
    {context}
    
    RULES:
    1. Respond ONLY with a valid JSON object.
    2. JSON structure: {{"description": "...", "expected_output": "..."}}
    3. Do NOT include any prefixes like 'Description:' or 'Expected Output:' in the values.
    4. IMPORTANT: Detect the language of the context and respond in that SAME language. 
       Be careful NOT to confuse Portuguese with Spanish. Respond in Portuguese if the context is in Portuguese.
    5. Be concise and professional.
    """

    try:
        response = llm.call([{"role": "user", "content": prompt}])
        if not response:
            return {"description": "", "expected_output": ""}
        
        content = response.strip()
        
        # Remove markdown code blocks
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                content = "\n".join(lines[1:-1]).strip()
        
        import json
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise ValueError(f"LLM response is not a valid JSON: {content}")
        
        return {
            "description": str(data.get("description", "")).strip(),
            "expected_output": str(data.get("expected_output", "")).strip()
        }
    except Exception as e:
        print(f"Error in task bulk AI: {e}")
        return {
            "description": f"Error: {str(e)}",
            "expected_output": ""
        }
