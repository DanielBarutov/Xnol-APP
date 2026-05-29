from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.shared.exceptions import NotFoundError


class FakeAccountRepository(IAccountRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Account] = {}

    async def list_for_user(self, user_id: UUID, include_deleted: bool = False) -> list[Account]:
        return [
            a for a in self._store.values()
            if a.user_id == user_id and (include_deleted or a.deleted_at is None)
        ]

    async def find_by_id(self, account_id: UUID) -> Account | None:
        return self._store.get(account_id)

    async def create(self, account: Account) -> Account:
        self._store[account.id] = account
        return account

    async def update(self, account: Account) -> Account:
        if account.id not in self._store:
            raise NotFoundError("Account", str(account.id))
        old = self._store[account.id]
        self._store[account.id] = Account(
            id=old.id,
            user_id=old.user_id,
            currency=old.currency,
            created_at=old.created_at,
            deleted_at=old.deleted_at,
            name=account.name,
            bank_name=account.bank_name,
            balance=account.balance,
        )
        return self._store[account.id]

    async def soft_delete(self, account_id: UUID, deleted_at: datetime) -> None:
        if account_id not in self._store:
            raise NotFoundError("Account", str(account_id))
        old = self._store[account_id]
        self._store[account_id] = Account(
            id=old.id,
            user_id=old.user_id,
            name=old.name,
            bank_name=old.bank_name,
            balance=old.balance,
            currency=old.currency,
            created_at=old.created_at,
            deleted_at=deleted_at,
        )

    async def update_balance(self, account_id: UUID, delta: Decimal) -> None:
        if account_id not in self._store:
            raise NotFoundError("Account", str(account_id))
        old = self._store[account_id]
        self._store[account_id] = Account(
            id=old.id,
            user_id=old.user_id,
            name=old.name,
            bank_name=old.bank_name,
            balance=old.balance + delta,
            currency=old.currency,
            created_at=old.created_at,
            deleted_at=old.deleted_at,
        )
