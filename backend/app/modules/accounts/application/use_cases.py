from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.modules.accounts.application.dtos import AccountDTO, CreateAccountDTO, UpdateAccountDTO
from app.modules.accounts.domain.entities import Account
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.shared.exceptions import NotFoundError


def _to_dto(a: Account) -> AccountDTO:
    return AccountDTO(
        id=a.id,
        user_id=a.user_id,
        name=a.name,
        bank_name=a.bank_name,
        balance=a.balance,
        currency=a.currency,
        created_at=a.created_at,
        deleted_at=a.deleted_at,
    )


class ListAccountsUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID, include_deleted: bool = False) -> list[AccountDTO]:
        accounts = await self._repo.list_for_user(user_id, include_deleted=include_deleted)
        return [_to_dto(a) for a in accounts]


class CreateAccountUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, dto: CreateAccountDTO) -> AccountDTO:
        account = Account(
            id=dto.id if dto.id is not None else uuid4(),
            user_id=dto.user_id,
            name=dto.name,
            bank_name=dto.bank_name,
            currency=dto.currency,
            balance=dto.balance,
        )
        saved = await self._repo.create(account)
        return _to_dto(saved)


class UpdateAccountUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, dto: UpdateAccountDTO) -> AccountDTO:
        account = await self._repo.find_by_id(dto.account_id)
        if account is None or account.deleted_at is not None:
            raise NotFoundError("Account", str(dto.account_id))
        if account.user_id != dto.user_id:
            raise NotFoundError("Account", str(dto.account_id))
        updated = Account(
            id=account.id,
            user_id=account.user_id,
            currency=account.currency,
            created_at=account.created_at,
            deleted_at=account.deleted_at,
            name=dto.name if dto.name is not None else account.name,
            bank_name=dto.bank_name if dto.bank_name is not None else account.bank_name,
            balance=dto.balance if dto.balance is not None else account.balance,
        )
        saved = await self._repo.update(updated)
        return _to_dto(saved)


class DeleteAccountUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, account_id: UUID, user_id: UUID) -> None:
        account = await self._repo.find_by_id(account_id)
        if account is None or account.deleted_at is not None:
            raise NotFoundError("Account", str(account_id))
        if account.user_id != user_id:
            raise NotFoundError("Account", str(account_id))
        await self._repo.soft_delete(account_id, datetime.now(timezone.utc))
