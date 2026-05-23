import secrets
import string

def generate_temp_password(length: int = 10) -> str:
    """
    Generates a secure random temporary password containing at least:
    - 1 lowercase letter
    - 1 uppercase letter
    - 2 digits
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and sum(c.isdigit() for c in password) >= 2):
            return password
