from datetime import date
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.transactions.domain.entities import Transaction
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.modules.transactions.infrastructure.models import TransactionModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: TransactionModel) -> Transaction:
    return Transaction(
        id=m.id,
        user_id=m.user_id,
        category_id=m.category_id,
        type=m.type,
        amount=m.amount,
        date=m.date,
        description=m.description,
        created_at=m.created_at,
    )


class SQLAlchemyTransactionRepository(ITransactionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Transaction]:
        q = select(TransactionModel).where(TransactionModel.user_id == user_id)
        if date_from:
            q = q.where(TransactionModel.date >= date_from)
        if date_to:
            q = q.where(TransactionModel.date <= date_to)
        q = q.order_by(TransactionModel.date.desc(), TransactionModel.created_at.desc())
        result = await self._session.execute(q)
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, transaction_id: UUID) -> Transaction | None:
        result = await self._session.execute(
            select(TransactionModel).where(TransactionModel.id == transaction_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, transaction: Transaction) -> Transaction:
        model = TransactionModel(
            id=transaction.id,
            user_id=transaction.user_id,
            category_id=transaction.category_id,
            type=transaction.type,
            amount=transaction.amount,
            date=transaction.date,
            description=transaction.description,
            created_at=transaction.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, transaction: Transaction) -> Transaction:
        result = await self._session.execute(
            select(TransactionModel).where(TransactionModel.id == transaction.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Transaction", str(transaction.id))
        model.category_id = transaction.category_id
        model.type = transaction.type
        model.amount = transaction.amount
        model.date = transaction.date
        model.description = transaction.description
        await self._session.flush()
        return _to_entity(model)

    async def delete(self, transaction_id: UUID) -> None:
        result = await self._session.execute(
            select(TransactionModel).where(TransactionModel.id == transaction_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Transaction", str(transaction_id))
        await self._session.delete(model)
        await self._session.flush()
