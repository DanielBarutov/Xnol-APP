from abc import ABC, abstractmethod
from uuid import UUID

from app.modules.transfers.domain.entities import Transfer


class ITransferRepository(ABC):
    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Transfer]:
        """Returns all user's transfers ordered by date DESC, created_at DESC."""
        ...

    @abstractmethod
    async def find_by_id(self, transfer_id: UUID) -> Transfer | None: ...

    @abstractmethod
    async def create(self, transfer: Transfer) -> Transfer: ...

    @abstractmethod
    async def update(self, transfer: Transfer) -> Transfer: ...

    @abstractmethod
    async def delete(self, transfer_id: UUID) -> None: ...
