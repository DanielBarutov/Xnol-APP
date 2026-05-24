from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.transfers.domain.entities import Transfer
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.modules.transfers.infrastructure.models import TransferModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: TransferModel) -> Transfer:
    return Transfer(
        id=m.id,
        user_id=m.user_id,
        source_type=m.source_type,
        source_id=m.source_id,
        source_label=m.source_label,
        dest_type=m.dest_type,
        dest_id=m.dest_id,
        dest_label=m.dest_label,
        amount=m.amount,
        currency=m.currency,
        date=m.date,
        description=m.description,
        created_at=m.created_at,
    )


class SQLAlchemyTransferRepository(ITransferRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: UUID) -> list[Transfer]:
        result = await self._session.execute(
            select(TransferModel)
            .where(TransferModel.user_id == user_id)
            .order_by(TransferModel.date.desc(), TransferModel.created_at.desc())
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, transfer_id: UUID) -> Transfer | None:
        result = await self._session.execute(
            select(TransferModel).where(TransferModel.id == transfer_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, transfer: Transfer) -> Transfer:
        model = TransferModel(
            id=transfer.id,
            user_id=transfer.user_id,
            source_type=transfer.source_type,
            source_id=transfer.source_id,
            source_label=transfer.source_label,
            dest_type=transfer.dest_type,
            dest_id=transfer.dest_id,
            dest_label=transfer.dest_label,
            amount=transfer.amount,
            currency=transfer.currency,
            date=transfer.date,
            description=transfer.description,
            created_at=transfer.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, transfer: Transfer) -> Transfer:
        result = await self._session.execute(
            select(TransferModel).where(TransferModel.id == transfer.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Transfer", str(transfer.id))
        model.source_type = transfer.source_type
        model.source_id = transfer.source_id
        model.source_label = transfer.source_label
        model.dest_type = transfer.dest_type
        model.dest_id = transfer.dest_id
        model.dest_label = transfer.dest_label
        model.amount = transfer.amount
        model.currency = transfer.currency
        model.date = transfer.date
        model.description = transfer.description
        await self._session.flush()
        return _to_entity(model)

    async def delete(self, transfer_id: UUID) -> None:
        result = await self._session.execute(
            select(TransferModel).where(TransferModel.id == transfer_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Transfer", str(transfer_id))
        await self._session.delete(model)
        await self._session.flush()
