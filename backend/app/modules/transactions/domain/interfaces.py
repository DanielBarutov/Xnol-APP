from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from app.modules.transactions.domain.entities import Transaction


class ITransactionRepository(ABC):
    @abstractmethod
    async def list_for_user(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Transaction]: ...

    @abstractmethod
    async def find_by_id(self, transaction_id: UUID) -> Transaction | None: ...

    @abstractmethod
    async def create(self, transaction: Transaction) -> Transaction: ...

    @abstractmethod
    async def update(self, transaction: Transaction) -> Transaction: ...

    @abstractmethod
    async def delete(self, transaction_id: UUID) -> None: ...
