
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import AdminUser


# =========================================================
# ENVIRONMENT CONFIGURATION
# =========================================================

load_dotenv()

JWT_SECRET_KEY = os.getenv("JfHVhULPXxuWJEinFAEUe1Zczoterqx2Dn9DASSuO2sP")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# =========================================================
# PASSWORD SECURITY
# =========================================================

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty.")

    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    if not plain_password or not hashed_password:
        return False

    return password_hash.verify(plain_password, hashed_password)


# =========================================================
# JWT TOKEN CREATION
# =========================================================

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None
) -> str:

    if not JWT_SECRET_KEY:
        raise RuntimeError(
            "JWT_SECRET_KEY is missing. Configure it in backend/.env."
        )

    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    expire = now + (
        expires_delta
        or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "iat": now
    })

    return jwt.encode(
        to_encode,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


# =========================================================
# JWT TOKEN VERIFICATION
# =========================================================

def decode_access_token(token: str) -> dict:

    if not JWT_SECRET_KEY:
        raise RuntimeError(
            "JWT_SECRET_KEY is missing. Configure it in backend/.env."
        )

    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM]
    )


# =========================================================
# AUTHENTICATION DEPENDENCY
# =========================================================

security = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
) -> AdminUser:

    authentication_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    if credentials is None:
        raise authentication_error

    try:
        payload = decode_access_token(credentials.credentials)
        admin_id = payload.get("sub")

        if admin_id is None:
            raise authentication_error

        admin_id = int(admin_id)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise authentication_error

    admin = (
        db.query(AdminUser)
        .filter(AdminUser.id == admin_id)
        .first()
    )

    if admin is None or not admin.is_active:
        raise authentication_error

    return admin
