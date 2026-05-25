from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.deposits.domain.interfaces import IDepositRepository
from app.modules.transfers.application.dtos import CreateTransferDTO, TransferDTO, UpdateTransferDTO
from app.modules.transfers.domain.entities import Transfer
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.shared.exceptions import ConflictError, NotFoundError


def _to_dto(t: Transfer) -> TransferDTO:
    return TransferDTO(
        id=t.id, user_id=t.user_id, source_type=t.source_type, source_id=t.source_id,
        source_label=t.source_label, dest_type=t.dest_type, dest_id=t.dest_id,
        dest_label=t.dest_label, amount=t.amount, currency=t.currency, date=t.date,
        description=t.description, created_at=t.created_at,
    )


async def _validate_endpoint(
    account_repo: IAccountRepository,
    deposit_repo: IDepositRepository,
    endpoint_type: str,
    endpoint_id: UUID | None,
    user_id: UUID,
) -> None:
    """Validates a savings_account or deposit endpoint. No-op for external."""
    if endpoint_type == "savings_account":
        account = await account_repo.find_by_id(endpoint_id)  # type: ignore[arg-type]
        if account is None or account.user_id != user_id:
            raise NotFoundError("Account", str(endpoint_id))
        if account.deleted_at is not None:
            raise ConflictError("Account is deleted")
    elif endpoint_type == "deposit":
        deposit = await deposit_repo.find_by_id(endpoint_id)  # type: ignore[arg-type]
        if deposit is None or deposit.user_id != user_id:
            raise NotFoundError("Deposit", str(endpoint_id))
        if deposit.status != "active":
            raise ConflictError("Deposit is closed")


async def _adjust_balances(
    account_repo: IAccountRepository,
    deposit_repo: IDepositRepository,
    source_type: str,
    source_id: UUID | None,
    dest_type: str,
    dest_id: UUID | None,
    amount: Decimal,
) -> None:
    """Applies balance effect. Pass negative amount to revert."""
    if source_type == "savings_account" and source_id is not None:
        await account_repo.update_balance(source_id, -amount)
    if dest_type == "savings_account" and dest_id is not None:
        await account_repo.update_balance(dest_id, amount)
    if source_type == "deposit" and source_id is not None:
        await deposit_repo.update_balance(source_id, -amount)
    if dest_type == "deposit" and dest_id is not None:
        await deposit_repo.update_balance(dest_id, amount)


class ListTransfersUseCase:
    def __init__(self, repo: ITransferRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[TransferDTO]:
        return [_to_dto(t) for t in await self._repo.list_for_user(user_id)]


class CreateTransferUseCase:
    def __init__(
        self,
        repo: ITransferRepository,
        account_repo: IAccountRepository,
        deposit_repo: IDepositRepository,
    ) -> None:
        self._repo = repo
        self._account_repo = account_repo
        self._deposit_repo = deposit_repo

    async def execute(self, dto: CreateTransferDTO) -> TransferDTO:
        await _validate_endpoint(self._account_repo, self._deposit_repo, dto.source_type, dto.source_id, dto.user_id)
        await _validate_endpoint(self._account_repo, self._deposit_repo, dto.dest_type, dto.dest_id, dto.user_id)
        transfer = Transfer(
            user_id=dto.user_id, source_type=dto.source_type, source_id=dto.source_id,
            source_label=dto.source_label, dest_type=dto.dest_type, dest_id=dto.dest_id,
            dest_label=dto.dest_label, amount=dto.amount, currency=dto.currency,
            date=dto.date, description=dto.description,
        )
        saved = await self._repo.create(transfer)
        await _adjust_balances(
            self._account_repo, self._deposit_repo,
            saved.source_type, saved.source_id, saved.dest_type, saved.dest_id, saved.amount,
        )
        return _to_dto(saved)


class UpdateTransferUseCase:
    def __init__(
        self,
        repo: ITransferRepository,
        account_repo: IAccountRepository,
        deposit_repo: IDepositRepository,
    ) -> None:
        self._repo = repo
        self._account_repo = account_repo
        self._deposit_repo = deposit_repo

    async def execute(self, dto: UpdateTransferDTO) -> TransferDTO:
        old = await self._repo.find_by_id(dto.transfer_id)
        if old is None or old.user_id != dto.user_id:
            raise NotFoundError("Transfer", str(dto.transfer_id))

        new_source_type = dto.source_type if dto.source_type is not None else old.source_type
        new_dest_type = dto.dest_type if dto.dest_type is not None else old.dest_type

        if dto.source_type is not None:
            new_source_id = dto.source_id if new_source_type in ("savings_account", "deposit") else None
        else:
            new_source_id = old.source_id

        if dto.dest_type is not None:
            new_dest_id = dto.dest_id if new_dest_type in ("savings_account", "deposit") else None
        else:
            new_dest_id = old.dest_id

        new_source_label = dto.source_label if dto.source_label is not None else old.source_label
        new_dest_label = dto.dest_label if dto.dest_label is not None else old.dest_label
        new_amount = dto.amount if dto.amount is not None else old.amount
        new_currency = dto.currency if dto.currency is not None else old.currency
        new_date = dto.date if dto.date is not None else old.date
        new_description = dto.description if dto.description is not None else old.description

        await _validate_endpoint(self._account_repo, self._deposit_repo, new_source_type, new_source_id, dto.user_id)
        await _validate_endpoint(self._account_repo, self._deposit_repo, new_dest_type, new_dest_id, dto.user_id)

        # Revert old balance effect, then apply new
        await _adjust_balances(
            self._account_repo, self._deposit_repo,
            old.source_type, old.source_id, old.dest_type, old.dest_id, -old.amount,
        )

        updated = Transfer(
            id=old.id, user_id=old.user_id, source_type=new_source_type, source_id=new_source_id,
            source_label=new_source_label, dest_type=new_dest_type, dest_id=new_dest_id,
            dest_label=new_dest_label, amount=new_amount, currency=new_currency,
            date=new_date, description=new_description, created_at=old.created_at,
        )
        saved = await self._repo.update(updated)

        await _adjust_balances(
            self._account_repo, self._deposit_repo,
            saved.source_type, saved.source_id, saved.dest_type, saved.dest_id, saved.amount,
        )
        return _to_dto(saved)


class DeleteTransferUseCase:
    def __init__(
        self,
        repo: ITransferRepository,
        account_repo: IAccountRepository,
        deposit_repo: IDepositRepository,
    ) -> None:
        self._repo = repo
        self._account_repo = account_repo
        self._deposit_repo = deposit_repo

    async def execute(self, transfer_id: UUID, user_id: UUID) -> None:
        transfer = await self._repo.find_by_id(transfer_id)
        if transfer is None or transfer.user_id != user_id:
            raise NotFoundError("Transfer", str(transfer_id))
        await _adjust_balances(
            self._account_repo, self._deposit_repo,
            transfer.source_type, transfer.source_id,
            transfer.dest_type, transfer.dest_id,
            -transfer.amount,
        )
        await self._repo.delete(transfer_id)
