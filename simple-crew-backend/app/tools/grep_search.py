import os


def get_grep_search_tool(workspace_path: str, framework: str = 'crewai'):
    """
    Factory that returns a grep-search tool compatible with the requested
    framework ('crewai' or 'langgraph').
    """

    def grep_search(search_query: str) -> str:
        """
        Search for an exact string recursively in the workspace files.
        Returns file paths, line numbers, and the content of matching lines.
        Useful for finding where a function, variable, or text is used.

        Args:
            search_query (str): The exact string to search for.
        """
        if not search_query:
            return "Error: search_query is required."

        results = []
        ignore_dirs = {
            'node_modules', '.git', 'dist', 'venv', '.venv',
            '__pycache__', 'build', '.next', '.cache', 'target', '.idea', '.vscode'
        }
        ignore_extensions = {
            '.pyc', '.pyo', '.exe', '.dll', '.so', '.dylib',
            '.node', '.jpg', '.jpeg', '.png', '.gif', '.svg',
            '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4',
            '.mp3', '.wav', '.zip', '.tar', '.gz', '.7z', '.pdf',
            '.lock', '.map'
        }

        abs_workspace = os.path.abspath(workspace_path)

        if not os.path.exists(abs_workspace):
            return f"Error: Workspace path '{abs_workspace}' does not exist."

        try:
            for root, dirs, files in os.walk(abs_workspace):
                # Filter directories to skip ignored ones
                dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]

                for file in files:
                    if any(file.endswith(ext) for ext in ignore_extensions):
                        continue

                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, abs_workspace)

                    try:
                        # Check file size to avoid loading huge files (e.g. > 1MB)
                        if os.path.getsize(file_path) > 1024 * 1024:
                            continue

                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            for lineno, line in enumerate(f, 1):
                                if search_query in line:
                                    results.append(f"{rel_path}:{lineno}: {line.strip()}")

                                    # Limit results to 50 matches to avoid overwhelming the model
                                    if len(results) >= 50:
                                        return (
                                            "MATCHES FOUND (first 50):\n" + "\n".join(results) +
                                            "\n\n[Showing 50 matches. Please use a more specific query if you need more precise results.]"
                                        )
                    except Exception:
                        continue

            if not results:
                return f"No results found for '{search_query}' in workspace."

            return "MATCHES FOUND:\n" + "\n".join(results)

        except Exception as e:
            return f"Error during grep search: {str(e)}"

    # Return the native tool based on the requested framework
    if framework == 'langgraph':
        from langchain_core.tools import StructuredTool
        return StructuredTool.from_function(
            func=grep_search,
            name="grep_search",
            description=grep_search.__doc__
        )
    else:
        from crewai.tools import tool
        return tool("grep_search")(grep_search)
