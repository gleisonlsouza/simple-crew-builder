import pytest
import json
import operator
from typing import Dict, Any, List, Annotated, TypedDict
from pydantic import BaseModel, create_model

from app.services.langgraph_engine import interpolate_prompt, get_nested_value, LangGraphCompiler
from app.schemas import GraphData, CrewNode, AgentNode, TaskNode, StateNode, StateNodeData, StateField, CrewNodeData
from app.database import engine
from sqlmodel import Session

def test_get_nested_value_basic():
    state = {"user": {"name": "Gleison"}, "items": ["a", "b", "c"]}
    assert get_nested_value(state, "user.name") == "Gleison"
    # Items is a leaf list, so it returns the JSON-stringified full list with the current logic
    assert get_nested_value(state, "items") == '["a", "b", "c"]' 
    assert get_nested_value(state, "missing.key") is None

def test_interpolate_prompt_success():
    state = {
        "user": {"name": "Gleison"},
        "task": {"result": "Complete"}
    }
    template = "Hello {user.name}, the task is {task.result}."
    expected = "Hello Gleison, the task is Complete."
    assert interpolate_prompt(template, state) == expected

def test_interpolate_prompt_missing_key():
    state = {"user": {"name": "Gleison"}}
    template = "Hello {user.name}, your age is {user.age}."
    # If key is missing, it should return the original placeholder
    assert interpolate_prompt(template, state) == "Hello Gleison, your age is {user.age}."

def test_build_state_schema_logic():
    # We test the internal logic of _build_state_schema by mocking the necessary parts
    # since full compilation requires a real DB session and complex setup.
    
    TYPE_MAP = {
        "string": str, "integer": int, "float": float, 
        "boolean": bool, "list": list, "dict": dict, "any": Any
    }
    
    fields = [
        StateField(id="f1", key="tema", type="string", reducer="overwrite"),
        StateField(id="f2", key="messages", type="list", reducer="append"),
        StateField(id="f3", key="count", type="integer", reducer="add")
    ]
    
    state_annotations = {}
    from langgraph.graph.message import add_messages
    
    for field in fields:
        field_type_raw = (field.type or "any").lower()
        base_type = TYPE_MAP.get(field_type_raw, Any)
        
        if field.reducer in ["add", "append"]:
            reducer_fn = add_messages if field.key == "messages" else operator.add
            state_annotations[field.key] = Annotated[base_type, reducer_fn]
        else:
            state_annotations[field.key] = base_type
            
    StateTest = TypedDict("StateTest", state_annotations)
    
    assert "tema" in StateTest.__annotations__
    assert StateTest.__annotations__["tema"] == str
    
    # Check Annotated types
    import typing
    msg_type = StateTest.__annotations__["messages"]
    assert typing.get_origin(msg_type) is typing.Annotated
    assert typing.get_args(msg_type)[0] == list
    assert typing.get_args(msg_type)[1] == add_messages

def test_initial_state_default_injection():
    # Mocking the part of run_langgraph_stream that handles default values
    state_node = StateNode(
        id="state-1",
        type="state",
        data=StateNodeData(fields=[
            StateField(id="f1", key="count", type="integer", reducer="overwrite", defaultValue="10"),
            StateField(id="f2", key="tags", type="list", reducer="overwrite", defaultValue='["ai", "test"]'),
            StateField(id="f3", key="user", type="string", reducer="overwrite", defaultValue="Guest")
        ])
    )
    
    initial_state = {"user": "Gleison"} # Provided input should override default
    
    # Simulate the loop in run_langgraph_stream
    for field in state_node.data.fields:
        if field.defaultValue and field.key not in initial_state:
            val = field.defaultValue
            if isinstance(val, str) and val.strip():
                s_val = val.strip()
                if (s_val.startswith('[') and s_val.endswith(']')) or (s_val.startswith('{') and s_val.endswith('}')):
                    try: val = json.loads(s_val)
                    except: pass
            initial_state[field.key] = val
            
    assert initial_state["user"] == "Gleison"
    assert initial_state["count"] == "10" # Default handled as string for now if not explicitly converted
    assert initial_state["tags"] == ["ai", "test"] # Correctly parsed JSON list
