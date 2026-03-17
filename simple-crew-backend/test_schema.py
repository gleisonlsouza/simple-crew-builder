from app.schemas import LLMModelCreate
from pydantic import ValidationError
import uuid

def test_validation():
    credential_id = uuid.uuid4()
    
    # Test with None
    try:
        m = LLMModelCreate(
            name="Test",
            model_name="gpt-4",
            credential_id=credential_id,
            max_tokens=None,
            max_completion_tokens=None
        )
        print("Validation successful with None")
    except ValidationError as e:
        print(f"Validation failed with None: {e}")

    # Test with missing fields
    try:
        m = LLMModelCreate(
            name="Test",
            model_name="gpt-4",
            credential_id=credential_id
        )
        print("Validation successful with missing fields")
    except ValidationError as e:
        print(f"Validation failed with missing fields: {e}")

    # Test with empty string
    try:
        m = LLMModelCreate(
            name="Test",
            model_name="gpt-4",
            credential_id=credential_id,
            max_tokens=""
        )
        print("Validation successful with empty string")
    except ValidationError as e:
        print(f"Validation failed with empty string: {e}")

if __name__ == "__main__":
    test_validation()
