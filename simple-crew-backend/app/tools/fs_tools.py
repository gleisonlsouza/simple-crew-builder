import os

def get_file_read_tool(workspace_path: str, framework: str = 'crewai'):
    def file_read(file_path: str) -> str:
        """
        Reads the contents of a specified file.
        Args:
            file_path (str): The path to the file to read, relative to the workspace.
        """
        if not workspace_path:
            return "Error: Workspace path is required to read files."
            
        abs_workspace = os.path.abspath(workspace_path)
        full_path = file_path if os.path.isabs(file_path) else os.path.join(abs_workspace, file_path.lstrip('./\\'))
        
        if not full_path.startswith(abs_workspace):
            return "Error: Cannot read files outside the workspace."
            
        if not os.path.exists(full_path):
            # Smart fallback: Find matching file recursively if agent provided partial path
            matches = []
            snippet_forward = file_path.replace("\\", "/")
            if not snippet_forward.startswith("/"):
                snippet_forward = "/" + snippet_forward
                
            for root, dirs, files in os.walk(abs_workspace):
                for f in files:
                    candidate = os.path.join(root, f)
                    candidate_forward = candidate.replace("\\", "/")
                    if candidate_forward.endswith(snippet_forward) or candidate_forward.endswith("/" + file_path.split("/")[-1]):
                        # If the snippet exactly matches the end of the candidate path, record it
                        if candidate_forward.endswith(snippet_forward):
                            matches.append(candidate)
            
            if len(matches) == 1:
                full_path = matches[0]
                print(f"[file_read] Smart resolved '{file_path}' to '{full_path}'")
            elif len(matches) > 1:
                rel_matches = [os.path.relpath(m, abs_workspace) for m in matches[:5]]
                return f"Error: '{file_path}' is ambiguous. Provide the full relative path. Matches found: {', '.join(rel_matches)}"
            else:
                return f"Error: File '{file_path}' does not exist."
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"
            
    if framework == 'langgraph':
        from langchain_core.tools import StructuredTool
        return StructuredTool.from_function(func=file_read, name="file_read", description=file_read.__doc__)
    else:
        from crewai.tools import tool
        return tool("file_read")(file_read)


def get_directory_read_tool(workspace_path: str, framework: str = 'crewai'):
    def directory_read(directory_path: str = ".") -> str:
        """
        Lists all files and folders in a specified directory.
        Args:
            directory_path (str): The path to the directory to read, defaults to workspace root.
        """
        if not workspace_path:
            return "Error: Workspace path is required to read directories."
            
        abs_workspace = os.path.abspath(workspace_path)
        full_path = directory_path if os.path.isabs(directory_path) else os.path.join(abs_workspace, directory_path.lstrip('./\\'))
        
        if not full_path.startswith(abs_workspace):
            return "Error: Cannot read directories outside the workspace."
            
        if not os.path.exists(full_path):
            return f"Error: Directory '{directory_path}' does not exist."
            
        try:
            items = os.listdir(full_path)
            return f"Contents of {directory_path}:\n" + "\n".join(items) if items else f"Directory '{directory_path}' is empty."
        except Exception as e:
            return f"Error reading directory: {str(e)}"

    if framework == 'langgraph':
        from langchain_core.tools import StructuredTool
        return StructuredTool.from_function(func=directory_read, name="directory_read", description=directory_read.__doc__)
    else:
        from crewai.tools import tool
        return tool("directory_read")(directory_read)


def get_file_write_tool(workspace_path: str, framework: str = 'crewai'):
    def file_write(filename: str, content: str, directory: str = ".") -> str:
        """
        Writes content to a specific file.
        Args:
            filename (str): Name of the file to write.
            content (str): The content to write into the file.
            directory (str): The directory where to write, defaults to workspace root.
        """
        if not workspace_path:
            return "Error: Workspace path is required to write files."
            
        abs_workspace = os.path.abspath(workspace_path)
        target_dir = directory if os.path.isabs(directory) else os.path.join(abs_workspace, directory.lstrip('./\\'))
        
        full_path = os.path.join(target_dir, filename)
        
        if not full_path.startswith(abs_workspace):
            return "Error: Cannot write files outside the workspace."
            
        os.makedirs(target_dir, exist_ok=True)
        
        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return f"Successfully wrote to {filename} in {target_dir}."
        except Exception as e:
            return f"Error writing file: {str(e)}"

    if framework == 'langgraph':
        from langchain_core.tools import StructuredTool
        return StructuredTool.from_function(func=file_write, name="file_write", description=file_write.__doc__)
    else:
        from crewai.tools import tool
        return tool("file_write")(file_write)
