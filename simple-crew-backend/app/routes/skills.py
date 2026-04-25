from fastapi import APIRouter, HTTPException, Depends, File, UploadFile

from sqlmodel import Session, select
from typing import List
import httpx
import yaml
import re
from ..database import get_session
from ..models import AgentSkill
from ..schemas import AgentSkillRead, SkillImportRequest

router = APIRouter()

# For now, following project pattern:
ROOT_USER_ID = "00000000-0000-0000-0000-000000000000"

def convert_github_url(url: str) -> str:
    """
    Converte URLs do GitHub (blob) para o formato raw.
    Ex: https://github.com/user/repo/blob/main/skill.md -> https://raw.githubusercontent.com/user/repo/main/skill.md
    """
    if "github.com" in url and "/blob/" in url:
        return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
    return url

def parse_npx_command(command: str) -> List[str]:
    """
    Parses 'npx skills add <url> --skill <name>' and returns a list of potential raw URLs.
    """
    # Regex para capturar a URL do repo e o nome da skill
    match = re.search(r'npx skills add\s+(https?://github\.com/[^/\s]+/[^/\s]+)(?:.*?--skill\s+([^\s]+))?', command)
    if not match:
        return []
    
    base_url = match.group(1).rstrip('/')
    skill_name = match.group(2)
    
    if not skill_name:
        return []

    # Extrai owner e repo de https://github.com/owner/repo
    repo_path = base_url.replace("https://github.com/", "")
    parts = repo_path.split("/")
    if len(parts) < 2:
        return []
    
    owner, repo = parts[0], parts[1]
    
    # Padrões comuns do skills.sh (agora suportando SKILL.md e master branch)
    branches = ["main", "master"]
    filenames = ["SKILL.md", "skill.md"]
    
    urls = []
    for branch in branches:
        for filename in filenames:
            urls.append(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/skills/{skill_name}/{filename}")
            urls.append(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{skill_name}/{filename}")
        # Também tenta {skill_name}.md diretamente
        urls.append(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{skill_name}.md")
        
    return urls


def parse_and_validate_skill(raw_markdown: str) -> dict:
    """
    Parses YAML frontmatter and validates structure.
    Raises HTTPException if format is invalid.
    """
    # Regex para encontrar YAML frontmatter entre ---
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', raw_markdown, re.DOTALL)
    if not match:
        raise HTTPException(
            status_code=400, 
            detail="Invalid Skill Format: Missing YAML frontmatter (---)."
        )
    
    try:
        frontmatter = yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid Skill Format: YAML Error: {str(e)}"
        )
        
    if not frontmatter or "name" not in frontmatter:
        raise HTTPException(
            status_code=400, 
            detail="Invalid Skill Format: Frontmatter must include a 'name' field."
        )
        
    return {
        "name": frontmatter["name"],
        "description": frontmatter.get("description", ""),
        "content": match.group(2).strip()
    }



@router.post("/import", response_model=AgentSkillRead)
async def import_skill(request: SkillImportRequest, session: Session = Depends(get_session)):
    input_str = request.url.strip()
    potential_urls = []
    
    if input_str.startswith("npx skills add"):
        potential_urls = parse_npx_command(input_str)
        if not potential_urls:
            raise HTTPException(status_code=400, detail="Formato de comando npx inválido. Esperado: npx skills add <url> --skill <nome>")
    else:
        potential_urls = [convert_github_url(input_str)]
    
    failed_urls: list[str] = []
    raw_text = None

    async with httpx.AsyncClient(timeout=15.0) as client:
        for url in potential_urls:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    raw_text = response.text
                    break
                else:
                    failed_urls.append(f"{url} (HTTP {response.status_code})")
            except Exception as e:
                failed_urls.append(f"{url} (error: {e})")
                continue

    if not raw_text:
        tried = "\n".join(f"  • {u}" for u in failed_urls[:5])
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not fetch skill content. None of the {len(failed_urls)} candidate URLs returned a valid file.\n"
                f"Check that the repository and skill name are correct.\n"
                f"URLs tried:\n{tried}"
            )
        )

    # Validação Estrita
    skill_data = parse_and_validate_skill(raw_text)

    new_skill = AgentSkill(
        name=skill_data["name"],
        description=skill_data["description"],
        content=skill_data["content"],
        source_url=request.url,
        user_id=ROOT_USER_ID
    )
    session.add(new_skill)
    session.commit()
    session.refresh(new_skill)
    return new_skill

@router.post("/upload", response_model=AgentSkillRead)
async def upload_skill(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """
    Upload a local .md skill file.
    """
    try:
        content_bytes = await file.read()
        raw_markdown = content_bytes.decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Validação Estrita
    skill_data = parse_and_validate_skill(raw_markdown)

    new_skill = AgentSkill(
        name=skill_data["name"],
        description=skill_data["description"],
        content=skill_data["content"],
        source_url=f"uploaded://{file.filename}",
        user_id=ROOT_USER_ID
    )
    session.add(new_skill)
    session.commit()
    session.refresh(new_skill)
    return new_skill


@router.get("", response_model=List[AgentSkillRead])
async def list_skills(session: Session = Depends(get_session)):
    statement = select(AgentSkill).where(AgentSkill.user_id == ROOT_USER_ID).order_by(AgentSkill.created_at.desc())
    skills = session.exec(statement).all()
    return skills

@router.delete("/{skill_id}")
async def delete_skill(skill_id: str, session: Session = Depends(get_session)):
    skill = session.get(AgentSkill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill não encontrada")
    session.delete(skill)
    session.commit()
    return {"message": "Skill removida com sucesso"}
