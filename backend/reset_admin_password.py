
from getpass import getpass

from app.database import SessionLocal
from app.models import AdminUser
from app.auth import hash_password


def reset_password():
    db = SessionLocal()

    try:
        username = input("Administrator username: ").strip()

        admin = (
            db.query(AdminUser)
            .filter(AdminUser.username == username)
            .first()
        )

        if admin is None:
            print("Administrator account not found.")
            return

        password = getpass("Enter new password: ")

        if len(password) < 12 or len(password) > 128:
            print("Password must be between 12 and 128 characters.")
            return

        confirm = getpass("Confirm new password: ")

        if password != confirm:
            print("Passwords do not match.")
            return

        admin.hashed_password = hash_password(password)
        db.commit()

        print("Administrator password updated successfully.")

    except Exception as error:
        db.rollback()
        print(f"Password update failed: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    reset_password()
