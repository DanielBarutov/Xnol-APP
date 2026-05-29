from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.deposits.domain.entities import Deposit
from app.modules.deposits.domain.interfaces import IDepositRepository
from app.modules.deposits.infrastructure.models import DepositModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: DepositModel) -> Deposit:
    return Deposit(
        id=m.id, user_id=m.user_id, name=m.name, bank_name=m.bank_name,
        amount=m.amount, interest_rate=m.interest_rate, interest_type=m.interest_type,
        open_date=m.open_date, close_date=m.close_date,
        early_closure_rate=m.early_closure_rate, auto_renew=m.auto_renew,
        currency=m.currency, balance=m.balance, status=m.status,
        actual_close_date=m.actual_close_date, created_at=m.created_at,
    )


class SQLAlchemyDepositRepository(IDepositRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: UUID) -> list[Deposit]:
        result = await self._session.execute(
            select(DepositModel)
            .where(DepositModel.user_id == user_id, DepositModel.status == "active")
            .order_by(DepositModel.created_at.asc())
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, deposit_id: UUID) -> Deposit | None:
        result = await self._session.execute(
            select(DepositModel).where(DepositModel.id == deposit_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, deposit: Deposit) -> Deposit:
        model = DepositModel(
            id=deposit.id, user_id=deposit.user_id, name=deposit.name,
            bank_name=deposit.bank_name, amount=deposit.amount,
            interest_rate=deposit.interest_rate, interest_type=deposit.interest_type,
            open_date=deposit.open_date, close_date=deposit.close_date,
            early_closure_rate=deposit.early_closure_rate, auto_renew=deposit.auto_renew,
            currency=deposit.currency, balance=deposit.balance, status=deposit.status,
            actual_close_date=deposit.actual_close_date, created_at=deposit.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, deposit: Deposit) -> Deposit:
        result = await self._session.execute(
            select(DepositModel).where(DepositModel.id == deposit.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Deposit", str(deposit.id))
        model.name = deposit.name
        model.bank_name = deposit.bank_name
        model.amount = deposit.amount
        model.interest_rate = deposit.interest_rate
        model.interest_type = deposit.interest_type
        model.open_date = deposit.open_date
        model.close_date = deposit.close_date
        model.early_closure_rate = deposit.early_closure_rate
        model.auto_renew = deposit.auto_renew
        model.balance = deposit.balance
        await self._session.flush()
        return _to_entity(model)

    async def close(self, deposit_id: UUID, status: Literal["closed", "early_closed"], actual_close_date: date) -> None:
        result = await self._session.execute(
            select(DepositModel).where(DepositModel.id == deposit_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Deposit", str(deposit_id))
        model.status = status
        model.actual_close_date = actual_close_date
        await self._session.flush()

    async def update_balance(self, deposit_id: UUID, delta: Decimal) -> None:
        result = await self._session.execute(
            sa_update(DepositModel)
            .where(DepositModel.id == deposit_id)
            .values(balance=DepositModel.balance + delta)
        )
        await self._session.flush()
        if result.rowcount == 0:
            raise NotFoundError("Deposit", str(deposit_id))

    async def update_amount(self, deposit_id: UUID, delta: Decimal) -> None:
        result = await self._session.execute(
            sa_update(DepositModel)
            .where(DepositModel.id == deposit_id)
            .values(amount=DepositModel.amount + delta)
        )
        await self._session.flush()
        if result.rowcount == 0:
            raise NotFoundError("Deposit", str(deposit_id))
