import pytest
import json
import queue
from unittest.mock import patch, MagicMock
import uuid

from app.schemas import GraphData, Node, NodeData, Edge
from app.models import MCPServer, User, AppSettings

# Para facilitar a chamada, precisamos do run_crew_stream
from app.crew_builder import run_crew_stream

def create_mock_graph():
    return GraphData(
        nodes=[
            Node(
                id="crew-1",
                type="crew",
                position={"x": 0, "y": 0},
                data=NodeData(name="Main Crew")
            ),
            Node(
                id="agent-1",
                type="agent",
                position={"x": 0, "y": 0},
                data=NodeData(
                    name="Test Agent",
                    role="Tester",
                    goal="Test the SSE",
                    backstory="Just a test agent",
                    mcpServerIds=["mocked-mcp-id"]
                )
            ),
            Node(
                id="task-1",
                type="task",
                position={"x": 0, "y": 0},
                data=NodeData(
                    name="Test Task",
                    description="Do something",
                    expected_output="Done"
                )
            )
        ],
        edges=[
            Edge(id="e1", source="agent-1", target="task-1")
        ]
    )

@patch("app.crew_builder.Session")
@patch("app.crew_builder.MCPServerAdapter")
def test_mcp_sse_success(mock_mcp_adapter, mock_session):
    # Setup Mocks
    mock_db = MagicMock()
    mock_session.return_value.__enter__.return_value = mock_db
    
    # Mock para get 
    def mock_get(model, item_id):
        if model == MCPServer and str(item_id) == "mocked-mcp-id":
            return MCPServer(
                id=uuid.UUID(int=1),
                name="TestSSE",
                transport_type="sse",
                url="http://real-remote-sse-url/mcp",
                headers={"Authorization": "Bearer super-secret-token"},
                user_id=uuid.UUID(int=0)
            )
        return None
    mock_db.get.side_effect = mock_get
    
    # Mock Adapter
    adapter_instance = MagicMock()
    # Simula a reponsável do __enter__ no contexto
    adapter_instance.__enter__.return_value = [MagicMock(name="RemoteTool1")]
    mock_mcp_adapter.return_value = adapter_instance

    graph = create_mock_graph()
    
    stream_generator = run_crew_stream(graph)
    
    # We just run the generator until it finishes or errors
    # In this run, the crew has no actual LLMs mocked correctly, so it might fail downstream
    # but we just want to observe if the MCP was called properly up to the agent setup.
    outputs = []
    try:
        for output in stream_generator:
            outputs.append(output)
    except Exception as e:
        # Expected to fail somewhere in LLM initialization or task kick-off
        # but the tools setup should have succeeded
        pass
        
    # Verificar se MCPServerAdapter foi instanciado corretamente
    mock_mcp_adapter.assert_called_once()
    args, kwargs = mock_mcp_adapter.call_args
    assert args[0]["transport"] == "sse"
    assert args[0]["url"] == "http://real-remote-sse-url/mcp"
    assert args[0]["headers"]["Authorization"] == "Bearer super-secret-token"

@patch("app.crew_builder.Session")
@patch("app.crew_builder.MCPServerAdapter")
def test_mcp_sse_connection_timeout(mock_mcp_adapter, mock_session):
    # Setup Mocks
    mock_db = MagicMock()
    mock_session.return_value.__enter__.return_value = mock_db
    
    def mock_get(model, item_id):
        if model == MCPServer and str(item_id) == "mocked-mcp-id":
            mcp_uuid = uuid.UUID(int=9)
            # The backend tests against `str(mcp_record.id)` so we must make sure the mocked ID works
            mock_server = MCPServer(
                id=mcp_uuid,
                name="FailingSSE",
                transport_type="sse",
                url="http://remote-sse-timeout",
                user_id=uuid.UUID(int=0)
            )
            # monkeypatch as uuid logic above returns an int sometimes in tests, forcing string
            mock_server.id = "mocked-mcp-id" 
            return mock_server
        return None
    mock_db.get.side_effect = mock_get
    
    adapter_instance = MagicMock()
    # Força uma exceção no context manager simulando Timeout/401 HTTP real
    adapter_instance.__enter__.side_effect = Exception("401 Unauthorized Server Error")
    mock_mcp_adapter.return_value = adapter_instance

    graph = create_mock_graph()
    stream_generator = run_crew_stream(graph)
    
    # Exceção deve quebrar o gerador no momento do enter_context do tools mapper
    # a saída no queue deve conter o status de error para o agente.
    outputs = []
    
    # Ao iterar o gerador, ele vai engolir a exceção na função worker thread e emitir 
    # pro queue. Eventualmente o generator dá yield nos buffers.
    try:
        for output in stream_generator:
            outputs.append(output)
    except Exception:
        pass

    # A check that "agent-1" got an "error" status
    has_error_status = False
    for line in outputs:
        # A thread joga na queue, line is a JSON string
        try:
            msg = json.loads(line.strip())
            if msg.get("type") == "status" and msg.get("nodeId") == "agent-1" and msg.get("status") == "error":
                has_error_status = True
        except:
            pass
            
    assert has_error_status, "O status de error não foi emitido para o agente 1 quando o MCP falhou"
@patch("app.crew_builder.Session")
@patch("app.crew_builder.MCPServerAdapter")
def test_mcp_hybrid_fallback_success(mock_mcp_adapter, mock_session):
    # Setup Mocks
    mock_db = MagicMock()
    mock_session.return_value.__enter__.return_value = mock_db
    
    def mock_get(model, item_id):
        if model == MCPServer and str(item_id) == "mocked-mcp-id":
            return MCPServer(
                id=uuid.UUID(int=1),
                name="HybridMCP",
                transport_type="sse", # Originalmente marcado como SSE
                url="https://api.githubcopilot.com/mcp",
                user_id=uuid.UUID(int=0)
            )
        return None
    mock_db.get.side_effect = mock_get
    
    # 1. SSE sem barra -> 405
    # 2. SSE com barra -> 405
    # 3. Streamable HTTP -> Sucesso
    adapter_fail1 = MagicMock()
    adapter_fail1.__enter__.side_effect = Exception("405 Method Not Allowed")
    
    adapter_fail2 = MagicMock()
    adapter_fail2.__enter__.side_effect = Exception("405 Method Not Allowed")
    
    adapter_success = MagicMock()
    adapter_success.__enter__.return_value = [MagicMock(name="HttpTool")]
    
    mock_mcp_adapter.side_effect = [adapter_fail1, adapter_fail2, adapter_success]

    graph = create_mock_graph()
    stream_generator = run_crew_stream(graph)
    
    for _ in stream_generator: pass
        
    # Verificar se foi chamado 3 vezes (Tentativa 1, 2 e 3)
    assert mock_mcp_adapter.call_count == 3
    
    # Conferir se a terceira tentativa usou streamable-http
    call3 = mock_mcp_adapter.call_args_list[2]
    assert call3.args[0]["transport"] == "streamable-http"
    assert call3.args[0]["url"] == "https://api.githubcopilot.com/mcp"

@patch("app.crew_builder.Session")
@patch("app.crew_builder.MCPServerAdapter")
def test_mcp_direct_http_success(mock_mcp_adapter, mock_session):
    # Setup Mocks
    mock_db = MagicMock()
    mock_session.return_value.__enter__.return_value = mock_db
    
    def mock_get(model, item_id):
        if model == MCPServer and str(item_id) == "mocked-mcp-id":
            return MCPServer(
                id=uuid.UUID(int=1),
                name="DirectHTTP",
                transport_type="streamable-http", # Especialmente HTTP
                url="https://api.githubcopilot.com/mcp",
                user_id=uuid.UUID(int=0)
            )
        return None
    mock_db.get.side_effect = mock_get
    
    adapter_success = MagicMock()
    adapter_success.__enter__.return_value = [MagicMock(name="HttpTool")]
    
    mock_mcp_adapter.return_value = adapter_success

    graph = create_mock_graph()
    stream_generator = run_crew_stream(graph)
    
    for _ in stream_generator: pass
        
    # Deve ser chamado apenas uma vez (Direto no HTTP)
    assert mock_mcp_adapter.call_count == 1
    
    call = mock_mcp_adapter.call_args_list[0]
    assert call.args[0]["transport"] == "streamable-http"
    assert call.args[0]["url"] == "https://api.githubcopilot.com/mcp"
