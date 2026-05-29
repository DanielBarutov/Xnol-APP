from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from app.modules.deposits.domain.entities import Deposit


class IDepositRepository(ABC):
    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Deposit]:
        """Returns active deposits (status='active') for the user."""
        ...

    @abstractmethod
    async def find_by_id(self, deposit_id: UUID) -> Deposit | None:
        """Returns deposit regardless of status."""
        ...

    @abstractmethod
    async def create(self, deposit: Deposit) -> Deposit: ...

    @abstractmethod
    async def update(self, deposit: Deposit) -> Deposit:
        """Updates all editable fields. Caller merges fields before calling."""
        ...

    @abstractmethod
    async def close(self, deposit_id: UUID, status: Literal["closed", "early_closed"], actual_close_date: date) -> None:
        """Sets status to 'closed' or 'early_closed' and sets actual_close_date."""
        ...

    @abstractmethod
    async def update_balance(self, deposit_id: UUID, delta: Decimal) -> None:
        """Atomically adds delta to balance (delta can be negative)."""
        ...

    @abstractmethod
    async def update_amount(self, deposit_id: UUID, delta: Decimal) -> None:
        """Atomically adds delta to amount (principal). Used when transfers top up / draw from a deposit."""
        ...
