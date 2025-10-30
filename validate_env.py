
import os
from dotenv import load_dotenv

load_dotenv()

def validate_env():
    """Validate that all required environment variables are set"""
    
    required_vars = {
        'SECRET_KEY': 'Flask secret key',
        'JWT_SECRET_KEY': 'JWT secret key',
        'AZURE_OPENAI_API_KEY': 'Azure OpenAI API key',
        'AZURE_OPENAI_ENDPOINT': 'Azure OpenAI endpoint',
        'AZURE_OPENAI_DEPLOYMENT_NAME': 'Azure OpenAI deployment name',
    }
    
    optional_vars = {
        'DATABASE_URL': 'Database connection string',
        'MAIL_USERNAME': 'Email username for notifications',
        'MAIL_PASSWORD': 'Email password for notifications',
        'FRONTEND_URL': 'Frontend application URL',
        'BACKEND_URL': 'Backend API URL',
    }
    
    missing_required = []
    missing_optional = []
    
    print("=" * 60)
    print("ENVIRONMENT VARIABLES VALIDATION")
    print("=" * 60)
    
    # Check required variables
    print("\n✓ REQUIRED VARIABLES:")
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value:
            missing_required.append(var)
            print(f"  ✗ {var}: MISSING - {description}")
        else:
            # Mask sensitive values
            masked_value = value[:4] + '*' * (len(value) - 4) if len(value) > 4 else '****'
            print(f"  ✓ {var}: {masked_value}")
    
    # Check optional variables
    print("\n✓ OPTIONAL VARIABLES:")
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if not value:
            missing_optional.append(var)
            print(f"  ⚠ {var}: NOT SET - {description}")
        else:
            # Mask sensitive values for passwords
            if 'PASSWORD' in var or 'KEY' in var:
                masked_value = '****'
            else:
                masked_value = value
            print(f"  ✓ {var}: {masked_value}")
    
    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    
    if missing_required:
        print(f"\n❌ CRITICAL: {len(missing_required)} required variable(s) missing:")
        for var in missing_required:
            print(f"   - {var}")
        print("\nPlease set these variables in your .env file before running the application.")
        return False
    else:
        print("\n✅ All required variables are set!")
    
    if missing_optional:
        print(f"\n⚠️  WARNING: {len(missing_optional)} optional variable(s) not set:")
        for var in missing_optional:
            print(f"   - {var}")
        print("\nThe application will use default values for these.")
    
    print("\n" + "=" * 60)
    return True


if __name__ == '__main__':
    is_valid = validate_env()
    exit(0 if is_valid else 1)
