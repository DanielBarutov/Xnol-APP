from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.infrastructure.models import AccountModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: AccountModel) -> Account:
    return Account(
        id=m.id,
        user_id=m.user_id,
        name=m.name,
        bank_name=m.bank_name,
        balance=m.balance,
        currency=m.currency,
        deleted_at=m.deleted_at,
        created_at=m.created_at,
    )


class SQLAlchemyAccountRepository(IAccountRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: UUID) -> list[Account]:
        result = await self._session.execute(
            select(AccountModel)
            .where(AccountModel.user_id == user_id, AccountModel.deleted_at.is_(None))
            .order_by(AccountModel.created_at.asc())
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, account_id: UUID) -> Account | None:
        result = await self._session.execute(
            select(AccountModel).where(AccountModel.id == account_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, account: Account) -> Account:
        model = AccountModel(
            id=account.id,
            user_id=account.user_id,
            name=account.name,
            bank_name=account.bank_name,
            balance=account.balance,
            currency=account.currency,
            created_at=account.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, account: Account) -> Account:
        result = await self._session.execute(
            select(AccountModel).where(AccountModel.id == account.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Account", str(account.id))
        model.name = account.name
        model.bank_name = account.bank_name
        model.balance = account.balance
        await self._session.flush()
        return _to_entity(model)

    async def soft_delete(self, account_id: UUID, deleted_at: datetime) -> None:
        result = await self._session.execute(
            select(AccountModel).where(AccountModel.id == account_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Account", str(account_id))
        model.deleted_at = deleted_at
        await self._session.flush()

    async def update_balance(self, account_id: UUID, delta: Decimal) -> None:
        result = await self._session.execute(
            sa_update(AccountModel)
            .where(AccountModel.id == account_id)
            .values(balance=AccountModel.balance + delta)
        )
        await self._session.flush()
        if result.rowcount == 0:
            raise NotFoundError("Account", str(account_id))
