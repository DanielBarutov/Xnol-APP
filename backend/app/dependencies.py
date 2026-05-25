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
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.categories.infrastructure.repository import SQLAlchemyCategoryRepository
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.modules.transactions.infrastructure.repository import SQLAlchemyTransactionRepository
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.accounts.infrastructure.repository import SQLAlchemyAccountRepository
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository
from app.modules.transfers.infrastructure.repository import SQLAlchemyTransferRepository
from app.modules.deposits.domain.interfaces import IDepositRepository
from app.modules.deposits.infrastructure.fake_repository import FakeDepositRepository
from app.modules.deposits.infrastructure.repository import SQLAlchemyDepositRepository
from app.modules.stats.domain.interfaces import IStatsRepository
from app.modules.stats.infrastructure.fake_repository import FakeStatsRepository
from app.modules.stats.infrastructure.repository import SQLAlchemyStatsRepository

_bearer = HTTPBearer()

_fake_user_repo = FakeUserRepository()
_fake_category_repo = FakeCategoryRepository()
_fake_transaction_repo = FakeTransactionRepository()
_fake_account_repo = FakeAccountRepository()
_fake_transfer_repo = FakeTransferRepository()
_fake_deposit_repo = FakeDepositRepository()
_fake_stats_repo = FakeStatsRepository()


def get_user_repository(db: AsyncSession = Depends(get_db)) -> IUserRepository:
    if settings.use_fake_repo:
        return _fake_user_repo
    return SQLAlchemyUserRepository(db)


def get_category_repository(db: AsyncSession = Depends(get_db)) -> ICategoryRepository:
    if settings.use_fake_repo:
        return _fake_category_repo
    return SQLAlchemyCategoryRepository(db)


def get_transaction_repository(db: AsyncSession = Depends(get_db)) -> ITransactionRepository:
    if settings.use_fake_repo:
        return _fake_transaction_repo
    return SQLAlchemyTransactionRepository(db)


def get_account_repository(db: AsyncSession = Depends(get_db)) -> IAccountRepository:
    if settings.use_fake_repo:
        return _fake_account_repo
    return SQLAlchemyAccountRepository(db)


def get_transfer_repository(db: AsyncSession = Depends(get_db)) -> ITransferRepository:
    if settings.use_fake_repo:
        return _fake_transfer_repo
    return SQLAlchemyTransferRepository(db)


def get_deposit_repository(db: AsyncSession = Depends(get_db)) -> IDepositRepository:
    if settings.use_fake_repo:
        return _fake_deposit_repo
    return SQLAlchemyDepositRepository(db)


def get_stats_repository(db: AsyncSession = Depends(get_db)) -> IStatsRepository:
    if settings.use_fake_repo:
        return _fake_stats_repo
    return SQLAlchemyStatsRepository(db)


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
