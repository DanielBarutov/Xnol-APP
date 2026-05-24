from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.entities import Account


class IAccountRepository(ABC):
    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Account]:
        """Returns active accounts (deleted_at IS NULL) for the user."""
        ...

    @abstractmethod
    async def find_by_id(self, account_id: UUID) -> Account | None:
        """Returns account regardless of deleted_at status."""
        ...

    @abstractmethod
    async def create(self, account: Account) -> Account: ...

    @abstractmethod
    async def update(self, account: Account) -> Account:
        """Updates name, bank_name, balance only. Preserves currency/user_id/created_at."""
        ...

    @abstractmethod
    async def soft_delete(self, account_id: UUID, deleted_at: datetime) -> None: ...

    @abstractmethod
    async def update_balance(self, account_id: UUID, delta: Decimal) -> None:
        """Atomically adds delta to balance (delta can be negative)."""
        ...
