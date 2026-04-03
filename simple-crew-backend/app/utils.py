import os
import sys

def normalize_command(command: str) -> str:
    """
    Normaliza o comando baseado no sistema operacional atual.
    - Se for Windows (nt): Garante .cmd para npx/npm e .exe se apropriado.
    - Se não for Windows (posix): Remove .cmd ou .exe.
    """
    if not command:
        return command
    
    is_windows = os.name == "nt"
    
    # 1. Caso NPX/NPM (Os mais comuns que causam erro)
    if command.lower() in ["npx", "npm"]:
        if is_windows:
            return f"{command}.cmd"
        return command
        
    # 2. Caso o comando já venha com extensão de Windows mas estamos em Linux
    if not is_windows:
        if command.lower().endswith(".cmd") or command.lower().endswith(".exe"):
            # node.exe -> node, npx.cmd -> npx
            return os.path.splitext(command)[0]
    
    # 3. Caso o comando não tenha extensão mas estamos em Windows (Opcional, mas seguro para npx/npm)
    # No entanto, se o usuário digitou 'python', 'node', etc., o Windows resolve sem .exe geralmente.
    # Mas npx e npm PRECISAM de .cmd no subprocess do Python se shell=False (que é o padrão do MCP Adapter).
    
    return command
