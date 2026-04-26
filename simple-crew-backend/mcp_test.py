import asyncio
import traceback
from mcp_adapter import MCPServerAdapter
from mcp import StdioServerParameters

async def main():
    try:
        params = StdioServerParameters(command="npx", args=["-y", "@modelcontextprotocol/server-github"])
        adapter = MCPServerAdapter(params, connect_timeout=15)
        tools = adapter.tools
        
        # CrewAI ToolCollection stores tools in a list or exposes them via iteration?
        # Let's convert it to a list
        tools_list = list(tools)
        print("Tools length:", len(tools_list))
        print("Tools names:", [t.name for t in tools_list])
        
        t = next(t for t in tools_list if "request_read" in t.name or "issue" in t.name or "github" in t.name)
        print("Found Tool:", t.name)
        
        print("\n--- Test 1: .invoke({ ... }) ---")
        try:
            # Let's try to get me (no args)
            t_me = next(t for t in tools_list if "get_me" in t.name)
            res2 = t_me.invoke({})
            print("Invoke dict run limit 100:", str(res2)[:100])
        except Exception as e:
            print("Invoke dict failed:", traceback.format_exc())

    except Exception:
        print("Exception:", traceback.format_exc())

asyncio.run(main())
