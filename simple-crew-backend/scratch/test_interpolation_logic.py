import sys
import os

# Mock necessary parts to test interpolate_prompt in isolation
def get_nested_value(state, path_string):
    import json
    try:
        if not path_string: return None
        clean_path = path_string.replace('{{', '').replace('}}', '').strip()
        if clean_path.startswith('$json.'):
            clean_path = clean_path.replace('$json.', '', 1)
        
        keys = clean_path.split('.')
        current_val = state
        
        for key in keys:
            if current_val is None: return None
            if isinstance(current_val, list) and current_val:
                current_val = current_val[-1]
            if hasattr(current_val, 'model_dump'):
                current_val = current_val.model_dump()
            elif hasattr(current_val, 'dict') and callable(getattr(current_val, 'dict')):
                 current_val = current_val.dict()
            if isinstance(current_val, dict):
                current_val = current_val.get(key)
            else:
                current_val = getattr(current_val, key, None)
        return current_val
    except Exception as e:
        print(f"Error: {e}")
        return None

def interpolate_prompt(text, state):
    import re
    if not text or not isinstance(text, str): return text
    def replace_match(match):
        path = match.group(1).strip()
        val = get_nested_value(state, path)
        return str(val) if val is not None else match.group(0)
    return re.sub(r'\{([^}]+)\}', replace_match, text)

# Test Cases
state = {
    "messages": ["Hello"],
    "poema": [
        {"result": "Old Poem"},
        {"result": "New Poem"}
    ],
    "user": {
        "name": "Gleison"
    }
}

test_cases = [
    ("Hello {user.name}!", "Hello Gleison!"),
    ("Look at this: {poema.result}", "Look at this: New Poem"),
    ("Missing: {missing.key}", "Missing: {missing.key}"),
    ("Mixed: {user.name} wrote {poema.result}", "Mixed: Gleison wrote New Poem"),
    ("{messages}", "Hello"), # messages[-1] is "Hello"
]

print("--- Starting Interpolation Logic Tests ---")
success = True
for text, expected in test_cases:
    result = interpolate_prompt(text, state)
    if result == expected:
        print(f"PASS: '{text}' -> '{result}'")
    else:
        print(f"FAIL: '{text}' -> Expected '{expected}', got '{result}'")
        success = False

if success:
    print("\nAll tests passed!")
else:
    print("\nSome tests failed.")
    sys.exit(1)
