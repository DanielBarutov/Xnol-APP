from abc import ABC, abstractmethod
from uuid import UUID

from app.modules.idempotency.domain.entities import IdempotencyRecord


class IIdempotencyRepository(ABC):
    @abstractmethod
    async def find(self, user_id: UUID, key: str) -> IdempotencyRecord | None: ...

    @abstractmethod
    async def save(self, record: IdempotencyRecord) -> None: ...
