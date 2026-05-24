from uuid import UUID

from app.modules.transfers.domain.entities import Transfer
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.shared.exceptions import NotFoundError


class FakeTransferRepository(ITransferRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Transfer] = {}

    async def list_for_user(self, user_id: UUID) -> list[Transfer]:
        txfrs = [t for t in self._store.values() if t.user_id == user_id]
        return sorted(txfrs, key=lambda t: (t.date, t.created_at), reverse=True)

    async def find_by_id(self, transfer_id: UUID) -> Transfer | None:
        return self._store.get(transfer_id)

    async def create(self, transfer: Transfer) -> Transfer:
        self._store[transfer.id] = transfer
        return transfer

    async def update(self, transfer: Transfer) -> Transfer:
        if transfer.id not in self._store:
            raise NotFoundError("Transfer", str(transfer.id))
        self._store[transfer.id] = transfer
        return transfer

    async def delete(self, transfer_id: UUID) -> None:
        if transfer_id not in self._store:
            raise NotFoundError("Transfer", str(transfer_id))
        del self._store[transfer_id]
