import os
import sys
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

# Ensure app modules can be imported
from app.database import SessionLocal
from app.utils.security import hash_password

def get_masked_password(prompt="Password: "):
    sys.stdout.write(prompt)
    sys.stdout.flush()
    password = ""
    
    if os.name == "nt":
        import msvcrt
        while True:
            char = msvcrt.getch()
            if char in (b'\r', b'\n'):
                sys.stdout.write('\n')
                break
            elif char == b'\x03': # Ctrl+C
                raise KeyboardInterrupt
            elif char == b'\x08': # Backspace
                if len(password) > 0:
                    password = password[:-1]
                    sys.stdout.write('\b \b')
                    sys.stdout.flush()
            else:
                try:
                    decoded = char.decode('utf-8')
                    password += decoded
                    sys.stdout.write('*')
                    sys.stdout.flush()
                except UnicodeDecodeError:
                    pass
    else:
        import tty, termios
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            while True:
                char = sys.stdin.read(1)
                if char in ('\r', '\n'):
                    break
                elif char == '\x03': # Ctrl+C
                    raise KeyboardInterrupt
                elif char in ('\x7f', '\x08'): # Backspace
                    if len(password) > 0:
                        password = password[:-1]
                        sys.stdout.write('\b \b')
                        sys.stdout.flush()
                else:
                    password += char
                    sys.stdout.write('*')
                    sys.stdout.flush()
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            sys.stdout.write('\n')
            
    return password

def create_admin():
    print("--- Hospitum Core: Admin Bootstrap ---")
    
    name = input("Enter admin name: ").strip()
    if not name:
        print("Error: Name cannot be empty.")
        sys.exit(1)
        
    email = input("Enter admin email: ").strip()
    if not email:
        print("Error: Email cannot be empty.")
        sys.exit(1)
        
    password = get_masked_password("Enter admin password: ")
    if not password:
        print("Error: Password cannot be empty.")
        sys.exit(1)
        
    confirm_password = get_masked_password("Confirm admin password: ")
    if password != confirm_password:
        print("Error: Passwords do not match.")
        sys.exit(1)
        
    hashed_pw = hash_password(password)
    
    db = SessionLocal()
    try:
        # Check if email exists
        existing = db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        
        if existing:
            print("⚠️ Admin email already exists.")
            sys.exit(1)
            
        # Insert admin user
        db.execute(
            text("""
                INSERT INTO users (name, email, password_hash, role)
                VALUES (:name, :email, :password_hash, 'admin')
            """),
            {"name": name, "email": email, "password_hash": hashed_pw}
        )
        db.commit()
        print("✅ Admin account created successfully.")
    except IntegrityError:
        print("⚠️ Admin email already exists.")
        db.rollback()
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
