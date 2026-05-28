from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header

from app.dependencies import get_current_user_id, get_idempotency_repository
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository


@dataclass
class IdempotencyContext:
    key: str | None
    cached: IdempotencyRecord | None


async def get_idempotency_context(
    x_idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
    user_id: UUID = Depends(get_current_user_id),
    repo: IIdempotencyRepository = Depends(get_idempotency_repository),
) -> IdempotencyContext:
    if not x_idempotency_key:
        return IdempotencyContext(key=None, cached=None)
    cached = await repo.find(user_id, x_idempotency_key)
    return IdempotencyContext(key=x_idempotency_key, cached=cached)
