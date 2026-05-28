from uuid import UUID

from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository


class FakeIdempotencyRepository(IIdempotencyRepository):
    def __init__(self) -> None:
        self._store: dict[tuple[UUID, str], IdempotencyRecord] = {}

    async def find(self, user_id: UUID, key: str) -> IdempotencyRecord | None:
        return self._store.get((user_id, key))

    async def save(self, record: IdempotencyRecord) -> None:
        # First write wins — subsequent saves with same (user_id, key) are no-ops
        if (record.user_id, record.key) not in self._store:
            self._store[(record.user_id, record.key)] = record
