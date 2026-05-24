from datetime import date
from uuid import UUID

from app.modules.transactions.domain.entities import Transaction
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.shared.exceptions import NotFoundError


class FakeTransactionRepository(ITransactionRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Transaction] = {}

    async def list_for_user(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Transaction]:
        txns = [t for t in self._store.values() if t.user_id == user_id]
        if date_from:
            txns = [t for t in txns if t.date >= date_from]
        if date_to:
            txns = [t for t in txns if t.date <= date_to]
        return sorted(txns, key=lambda t: (t.date, t.created_at), reverse=True)

    async def find_by_id(self, transaction_id: UUID) -> Transaction | None:
        return self._store.get(transaction_id)

    async def create(self, transaction: Transaction) -> Transaction:
        self._store[transaction.id] = transaction
        return transaction

    async def update(self, transaction: Transaction) -> Transaction:
        if transaction.id not in self._store:
            raise NotFoundError("Transaction", str(transaction.id))
        self._store[transaction.id] = transaction
        return transaction

    async def delete(self, transaction_id: UUID) -> None:
        if transaction_id not in self._store:
            raise NotFoundError("Transaction", str(transaction_id))
        del self._store[transaction_id]
