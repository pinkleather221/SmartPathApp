from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import settings
from supabase_db import get_user_by_id, get_user_by_email

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

import secrets

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False)

def generate_reset_token() -> str:
    """Generate a secure password reset token."""
    return secrets.token_urlsafe(32)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    # Ensure password is bytes before checking length for truncation
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Warning: Truncating password is not ideal for security but required for bcrypt
        # A better approach in prod is to hash with SHA256 first, then bcrypt
        truncated_password = password_bytes[:72]
        return pwd_context.hash(truncated_password)
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[Dict[str, Any]]:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    # Convert string user_id back to int for database query
    try:
        user_id: int = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_exception

    if not user.get('is_active', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get current active user (additional check for active status)."""
    if not current_user.get('is_active', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate a user by email and password."""
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user['password_hash']):
        return None
    return user


def require_user_type(*allowed_types: str):
    """Dependency factory to require specific user types."""
    async def user_type_checker(current_user: Dict[str, Any] = Depends(get_current_active_user)) -> Dict[str, Any]:
        user_type = current_user.get('user_type', '').upper()
        if user_type not in [t.upper() for t in allowed_types]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required user types: {', '.join(allowed_types)}"
            )
        return current_user
    return user_type_checker

