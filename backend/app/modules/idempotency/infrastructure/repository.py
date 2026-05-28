import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.infrastructure.models import IdempotencyKeyModel


class SQLAlchemyIdempotencyRepository(IIdempotencyRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find(self, user_id: UUID, key: str) -> IdempotencyRecord | None:
        result = await self._session.execute(
            select(IdempotencyKeyModel).where(
                IdempotencyKeyModel.user_id == user_id,
                IdempotencyKeyModel.key == key,
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return IdempotencyRecord(
            user_id=model.user_id,
            key=model.key,
            status_code=model.status_code,
            response_body=model.response_body,
            created_at=model.created_at,
        )

    async def save(self, record: IdempotencyRecord) -> None:
        self._session.add(
            IdempotencyKeyModel(
                id=uuid.uuid4(),
                user_id=record.user_id,
                key=record.key,
                status_code=record.status_code,
                response_body=record.response_body,
                created_at=record.created_at,
            )
        )
        await self._session.flush()
