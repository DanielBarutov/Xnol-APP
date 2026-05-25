from datetime import date
from decimal import Decimal
from uuid import UUID

from app.modules.deposits.domain.entities import Deposit
from app.modules.deposits.domain.interfaces import IDepositRepository
from app.shared.exceptions import NotFoundError


class FakeDepositRepository(IDepositRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Deposit] = {}

    async def list_for_user(self, user_id: UUID) -> list[Deposit]:
        return [
            d for d in self._store.values()
            if d.user_id == user_id and d.status == "active"
        ]

    async def find_by_id(self, deposit_id: UUID) -> Deposit | None:
        return self._store.get(deposit_id)

    async def create(self, deposit: Deposit) -> Deposit:
        self._store[deposit.id] = deposit
        return deposit

    async def update(self, deposit: Deposit) -> Deposit:
        if deposit.id not in self._store:
            raise NotFoundError("Deposit", str(deposit.id))
        self._store[deposit.id] = deposit
        return deposit

    async def close(self, deposit_id: UUID, status: str, actual_close_date: date) -> None:
        if deposit_id not in self._store:
            raise NotFoundError("Deposit", str(deposit_id))
        old = self._store[deposit_id]
        self._store[deposit_id] = Deposit(
            id=old.id, user_id=old.user_id, name=old.name, bank_name=old.bank_name,
            amount=old.amount, interest_rate=old.interest_rate, interest_type=old.interest_type,
            open_date=old.open_date, close_date=old.close_date,
            early_closure_rate=old.early_closure_rate, auto_renew=old.auto_renew,
            currency=old.currency, balance=old.balance, created_at=old.created_at,
            status=status, actual_close_date=actual_close_date,
        )

    async def update_balance(self, deposit_id: UUID, delta: Decimal) -> None:
        if deposit_id not in self._store:
            raise NotFoundError("Deposit", str(deposit_id))
        old = self._store[deposit_id]
        self._store[deposit_id] = Deposit(
            id=old.id, user_id=old.user_id, name=old.name, bank_name=old.bank_name,
            amount=old.amount, interest_rate=old.interest_rate, interest_type=old.interest_type,
            open_date=old.open_date, close_date=old.close_date,
            early_closure_rate=old.early_closure_rate, auto_renew=old.auto_renew,
            currency=old.currency, balance=old.balance + delta, created_at=old.created_at,
            status=old.status, actual_close_date=old.actual_close_date,
        )
