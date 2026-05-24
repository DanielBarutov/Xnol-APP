from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.modules.auth.application.services import JWTService
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.auth.infrastructure.repository import SQLAlchemyUserRepository

_bearer = HTTPBearer()


def get_user_repository(db: AsyncSession = Depends(get_db)) -> IUserRepository:
    if settings.use_fake_repo:
        return FakeUserRepository()
    return SQLAlchemyUserRepository(db)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> UUID:
    try:
        payload = JWTService.decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        return UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
