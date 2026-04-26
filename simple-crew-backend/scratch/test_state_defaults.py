import json
from typing import List, Optional, Any
from pydantic import BaseModel, Field

# Mock the schemas
class StateField(BaseModel):
    key: str
    defaultValue: Optional[Any] = Field(default=None, alias="defaultValue")

class StateNodeData(BaseModel):
    fields: List[StateField] = []

class Node(BaseModel):
    type: str
    data: Optional[StateNodeData] = None

class GraphData(BaseModel):
    nodes: List[Node] = []

# Mock the injection logic
def inject_defaults(graph_data, initial_state):
    state_node = next((n for n in graph_data.nodes if n.type == 'state'), None)
    if state_node and state_node.data:
        for field in getattr(state_node.data, 'fields', []):
            if field.defaultValue and field.key not in initial_state:
                val = field.defaultValue
                if isinstance(val, str) and val.strip():
                    s_val = val.strip()
                    if (s_val.startswith('[') and s_val.endswith(']')) or \
                       (s_val.startswith('{') and s_val.endswith('}')):
                        try:
                            val = json.loads(s_val)
                        except Exception:
                            pass
                initial_state[field.key] = val
    return initial_state

# Test Cases
nodes = [
    Node(type="state", data=StateNodeData(fields=[
        StateField(key="count", defaultValue="0"),
        StateField(key="items", defaultValue="[]"),
        StateField(key="config", defaultValue='{"active": true}'),
        StateField(key="name", defaultValue="Guest")
    ]))
]
graph_data = GraphData(nodes=nodes)

print("--- Starting Default Value Injection Tests ---")

# Case 1: Empty initial state
initial_state = {}
result = inject_defaults(graph_data, initial_state.copy())
expected = {"count": "0", "items": [], "config": {"active": True}, "name": "Guest"}
print(f"Test 1 (Empty): {'PASS' if result == expected else 'FAIL'}")
if result != expected: print(f"  Result: {result}\n  Expect: {expected}")

# Case 2: Partial overlap
initial_state = {"name": "Gleison"}
result = inject_defaults(graph_data, initial_state.copy())
expected = {"count": "0", "items": [], "config": {"active": True}, "name": "Gleison"}
print(f"Test 2 (Partial Overlap): {'PASS' if result == expected else 'FAIL'}")
if result != expected: print(f"  Result: {result}\n  Expect: {expected}")

# Case 3: Invalid JSON string
nodes_invalid = [
    Node(type="state", data=StateNodeData(fields=[
        StateField(key="broken", defaultValue="[1, 2")
    ]))
]
graph_data_invalid = GraphData(nodes=nodes_invalid)
initial_state = {}
result = inject_defaults(graph_data_invalid, initial_state.copy())
expected = {"broken": "[1, 2"}
print(f"Test 3 (Invalid JSON): {'PASS' if result == expected else 'FAIL'}")
