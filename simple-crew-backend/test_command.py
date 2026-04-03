import os
import sys
from app.utils import normalize_command

def test_normalize():
    print(f"Testing on OS: {os.name}, Platform: {sys.platform}")
    
    # Test cases: (Input, Expected on this OS)
    if os.name == "nt":
        cases = [
            ("npx", "npx.cmd"),
            ("npm", "npm.cmd"),
            ("node", "node"),
            ("npx.cmd", "npx.cmd"),
        ]
    else:
        cases = [
            ("npx", "npx"),
            ("npm", "npm"),
            ("npx.cmd", "npx"),
            ("node.exe", "node"),
        ]
        
    for inp, expected in cases:
        result = normalize_command(inp)
        print(f"Input: {inp} | Expected: {expected} | Result: {result}")
        assert result == expected

if __name__ == "__main__":
    test_normalize()
