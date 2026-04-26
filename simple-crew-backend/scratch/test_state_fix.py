import operator
from typing import Dict, Any, Type, List, Optional, Annotated, TypedDict
from pydantic import BaseModel, Field

# Mock necessary parts
def add_messages(left, right):
    return left + right

class StateField(BaseModel):
    key: str
    type: str
    reducer: str
    defaultValue: Optional[Any] = None

class StateNodeData(BaseModel):
    fields: List[StateField] = []

class Node(BaseModel):
    id: str
    type: str
    data: StateNodeData

# TYPE_MAP from the engine
TYPE_MAP = {
    "string": str, "integer": int, "float": float, 
    "boolean": bool, "list": list, "dict": dict, "any": Any
}

def test_build_state_schema(state_fields):
    state_annotations = {}
    for field in state_fields:
        field_type_raw = (field.type or "any").lower()
        base_type = TYPE_MAP.get(field_type_raw, Any)

        # The new reducer logic
        if field.reducer in ["add", "append"]:
            reducer_fn = add_messages if field.key == "messages" else operator.add
            state_annotations[field.key] = Annotated[base_type, reducer_fn]
        else:
            state_annotations[field.key] = base_type
    
    return TypedDict("StateTest", state_annotations)

# Test cases
fields = [
    StateField(key="tema", type="string", reducer="overwrite", defaultValue="Bill Gates"),
    StateField(key="messages", type="list", reducer="append"),
    StateField(key="count", type="integer", reducer="append")
]

print("--- Testing State Schema Compilation ---")
schema = test_build_state_schema(fields)
annotations = schema.__annotations__

print(f"tema in annotations: {'tema' in annotations}")
print(f"messages in annotations: {'messages' in annotations}")
print(f"count in annotations: {'count' in annotations}")

# Check reducers (Annotated vs direct)
import typing
is_annotated = lambda t: typing.get_origin(t) is typing.Annotated
print(f"tema is direct: {not is_annotated(annotations['tema'])}")
print(f"messages is Annotated: {is_annotated(annotations['messages'])}")
print(f"count is Annotated: {is_annotated(annotations['count'])}")

if all(['tema' in annotations, 'messages' in annotations, 'count' in annotations,
        not is_annotated(annotations['tema']), is_annotated(annotations['messages'])]):
    print("PASS: Schema built correctly with 'append' mapping.")
else:
    print("FAIL: Schema built incorrectly.")

print("\n--- Testing Initial State Injection ---")
import json
def inject_defaults(fields, inputs):
    initial_state = {}
    initial_state.update(inputs)
    for field in fields:
        if field.defaultValue and field.key not in initial_state:
            val = field.defaultValue
            if isinstance(val, str) and val.strip():
                s_val = val.strip()
                if (s_val.startswith('[') and s_val.endswith(']')) or \
                   (s_val.startswith('{') and s_val.endswith('}')):
                    try: val = json.loads(s_val)
                    except: pass
            initial_state[field.key] = val
    return initial_state

inputs = {}
res = inject_defaults(fields, inputs)
print(f"Default 'tema' injected: {res.get('tema') == 'Bill Gates'}")

inputs = {"tema": "Steve Jobs"}
res = inject_defaults(fields, inputs)
print(f"Provided 'tema' overrides default: {res.get('tema') == 'Steve Jobs'}")

if res.get("tema") == "Steve Jobs":
    print("PASS: Injection logic works correctly.")
else:
    print("FAIL: Injection logic works incorrectly.")
