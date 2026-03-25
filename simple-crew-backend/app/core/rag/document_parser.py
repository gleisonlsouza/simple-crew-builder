import os
from pypdf import PdfReader
from docx import Document
from .enterprise_code_parser import EXTENSION_TO_LANGUAGE

def extract_text_from_file(file_path: str) -> str:
    """
    Extrai o texto de um arquivo com base na sua extensão.
    Suporta: .pdf, .docx, .txt, .md
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == '.pdf':
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        
        elif ext == '.docx':
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs]).strip()
        
        elif ext in ['.txt', '.md'] or ext in EXTENSION_TO_LANGUAGE:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        
        else:
            raise ValueError(f"Extensão de arquivo não suportada: {ext}")
            
    except Exception as e:
        print(f"Erro ao extrair texto de {file_path}: {e}")
        # Retorna string vazia ou levanta exceção dependendo da política de erro
        raise e
