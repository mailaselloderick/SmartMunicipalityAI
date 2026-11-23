
from getpass import getpass

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AdminUser
from app.auth import hash_password


def create_admin():
    db: Session = SessionLocal()

    try:
        print("=" * 50)
        print("SMART MUNICIPALITY AI")
        print("ADMINISTRATOR ACCOUNT SETUP")
        print("=" * 50)

        username = input("Enter administrator username: ").strip()

        if len(username) < 3 or len(username) > 80:
            print("Username must be between 3 and 80 characters.")
            return

        existing_admin = (
            db.query(AdminUser)
            .filter(AdminUser.username == username)
            .first()
        )

        if existing_admin:
            print("An administrator with this username already exists.")
            return

        full_name = input("Enter administrator full name: ").strip()

        if not full_name or len(full_name) > 120:
            print("Please enter a valid full name (maximum 120 characters).")
            return

        password = getpass("Enter administrator password: ")

        if len(password) < 8 or len(password) > 128:
            print("Password must be between 8 and 128 characters.")
            return

        confirm_password = getpass("Confirm administrator password: ")

        if password != confirm_password:
            print("Passwords do not match.")
            return

        admin = AdminUser(
            username=username,
            full_name=full_name,
            hashed_password=hash_password(password),
            is_active=True
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\nAdministrator account created successfully!")
        print(f"Administrator ID: {admin.id}")
        print(f"Username: {admin.username}")
        print(f"Full name: {admin.full_name}")

    except Exception as error:
        db.rollback()
        print(f"\nAccount creation failed: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
