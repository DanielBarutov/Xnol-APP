from uuid import UUID

from app.modules.deposits.application.dtos import (
    CloseDepositDTO,
    CreateDepositDTO,
    DepositDTO,
    UpdateDepositDTO,
)
from app.modules.deposits.domain.entities import Deposit
from app.modules.deposits.domain.interfaces import IDepositRepository
from app.shared.exceptions import ConflictError, NotFoundError


def _to_dto(d: Deposit) -> DepositDTO:
    return DepositDTO(
        id=d.id, user_id=d.user_id, name=d.name, bank_name=d.bank_name,
        amount=d.amount, interest_rate=d.interest_rate, interest_type=d.interest_type,
        open_date=d.open_date, close_date=d.close_date,
        early_closure_rate=d.early_closure_rate, auto_renew=d.auto_renew,
        currency=d.currency, balance=d.balance, status=d.status,
        actual_close_date=d.actual_close_date, created_at=d.created_at,
    )


class ListDepositsUseCase:
    def __init__(self, repo: IDepositRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[DepositDTO]:
        return [_to_dto(d) for d in await self._repo.list_for_user(user_id)]


class CreateDepositUseCase:
    def __init__(self, repo: IDepositRepository) -> None:
        self._repo = repo

    async def execute(self, dto: CreateDepositDTO) -> DepositDTO:
        deposit = Deposit(
            user_id=dto.user_id, name=dto.name, bank_name=dto.bank_name,
            amount=dto.amount, interest_rate=dto.interest_rate, interest_type=dto.interest_type,
            open_date=dto.open_date, close_date=dto.close_date,
            early_closure_rate=dto.early_closure_rate, auto_renew=dto.auto_renew,
            currency=dto.currency, balance=dto.balance,
        )
        return _to_dto(await self._repo.create(deposit))


class UpdateDepositUseCase:
    def __init__(self, repo: IDepositRepository) -> None:
        self._repo = repo

    async def execute(self, dto: UpdateDepositDTO) -> DepositDTO:
        deposit = await self._repo.find_by_id(dto.deposit_id)
        if deposit is None or deposit.user_id != dto.user_id:
            raise NotFoundError("Deposit", str(dto.deposit_id))
        if deposit.status != "active":
            raise ConflictError("Deposit is closed")
        updated = Deposit(
            id=deposit.id, user_id=deposit.user_id,
            currency=deposit.currency,
            status=deposit.status,
            actual_close_date=deposit.actual_close_date,
            created_at=deposit.created_at,
            name=dto.name if dto.name is not None else deposit.name,
            bank_name=dto.bank_name if dto.bank_name is not None else deposit.bank_name,
            amount=dto.amount if dto.amount is not None else deposit.amount,
            interest_rate=dto.interest_rate if dto.interest_rate is not None else deposit.interest_rate,
            interest_type=dto.interest_type if dto.interest_type is not None else deposit.interest_type,
            open_date=dto.open_date if dto.open_date is not None else deposit.open_date,
            close_date=dto.close_date if dto.close_date is not None else deposit.close_date,
            early_closure_rate=dto.early_closure_rate if dto.early_closure_rate is not None else deposit.early_closure_rate,
            auto_renew=dto.auto_renew if dto.auto_renew is not None else deposit.auto_renew,
            balance=dto.balance if dto.balance is not None else deposit.balance,
        )
        return _to_dto(await self._repo.update(updated))


class CloseDepositUseCase:
    def __init__(self, repo: IDepositRepository) -> None:
        self._repo = repo

    async def execute(self, dto: CloseDepositDTO) -> None:
        deposit = await self._repo.find_by_id(dto.deposit_id)
        if deposit is None or deposit.user_id != dto.user_id:
            raise NotFoundError("Deposit", str(dto.deposit_id))
        if deposit.status != "active":
            raise ConflictError("Deposit is already closed")
        await self._repo.close(dto.deposit_id, dto.close_type, dto.actual_close_date)
