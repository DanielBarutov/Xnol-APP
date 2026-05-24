from datetime import date
from uuid import UUID

from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.transactions.application.dtos import (
    CreateTransactionDTO,
    TransactionDTO,
    UpdateTransactionDTO,
)
from app.modules.transactions.domain.entities import Transaction
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError


def _to_dto(t: Transaction) -> TransactionDTO:
    return TransactionDTO(
        id=t.id,
        user_id=t.user_id,
        category_id=t.category_id,
        type=t.type,
        amount=t.amount,
        date=t.date,
        description=t.description,
        created_at=t.created_at,
    )


async def _validate_category(
    cat_repo: ICategoryRepository,
    category_id: UUID,
    user_id: UUID,
) -> None:
    cat = await cat_repo.find_by_id(category_id)
    if cat is None:
        raise NotFoundError("Category", str(category_id))
    if cat.deleted_at is not None:
        raise ConflictError("Category is deleted")
    if cat.user_id is not None and cat.user_id != user_id:
        raise ConflictError("Category is not accessible")


class ListTransactionsUseCase:
    def __init__(self, repo: ITransactionRepository) -> None:
        self._repo = repo

    async def execute(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[TransactionDTO]:
        txns = await self._repo.list_for_user(user_id, date_from, date_to)
        return [_to_dto(t) for t in txns]


class CreateTransactionUseCase:
    def __init__(self, repo: ITransactionRepository, cat_repo: ICategoryRepository) -> None:
        self._repo = repo
        self._cat_repo = cat_repo

    async def execute(self, dto: CreateTransactionDTO) -> TransactionDTO:
        await _validate_category(self._cat_repo, dto.category_id, dto.user_id)
        txn = Transaction(
            user_id=dto.user_id,
            category_id=dto.category_id,
            type=dto.type,
            amount=dto.amount,
            date=dto.date,
            description=dto.description,
        )
        saved = await self._repo.create(txn)
        return _to_dto(saved)


class UpdateTransactionUseCase:
    def __init__(self, repo: ITransactionRepository, cat_repo: ICategoryRepository) -> None:
        self._repo = repo
        self._cat_repo = cat_repo

    async def execute(self, dto: UpdateTransactionDTO) -> TransactionDTO:
        txn = await self._repo.find_by_id(dto.transaction_id)
        if txn is None:
            raise NotFoundError("Transaction", str(dto.transaction_id))
        if txn.user_id != dto.user_id:
            raise AuthorizationError()
        new_category_id = dto.category_id if dto.category_id is not None else txn.category_id
        if dto.category_id is not None:
            await _validate_category(self._cat_repo, dto.category_id, dto.user_id)
        updated = Transaction(
            id=txn.id,
            user_id=txn.user_id,
            category_id=new_category_id,
            type=dto.type if dto.type is not None else txn.type,
            amount=dto.amount if dto.amount is not None else txn.amount,
            date=dto.date if dto.date is not None else txn.date,
            description=dto.description if dto.description is not None else txn.description,
            created_at=txn.created_at,
        )
        saved = await self._repo.update(updated)
        return _to_dto(saved)


class DeleteTransactionUseCase:
    def __init__(self, repo: ITransactionRepository) -> None:
        self._repo = repo

    async def execute(self, transaction_id: UUID, user_id: UUID) -> None:
        txn = await self._repo.find_by_id(transaction_id)
        if txn is None:
            raise NotFoundError("Transaction", str(transaction_id))
        if txn.user_id != user_id:
            raise AuthorizationError()
        await self._repo.delete(transaction_id)
