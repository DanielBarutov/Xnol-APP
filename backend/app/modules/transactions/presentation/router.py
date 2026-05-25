from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_current_user_id,
    get_transaction_repository,
)
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.transactions.application.dtos import CreateTransactionDTO, UpdateTransactionDTO
from app.modules.transactions.application.use_cases import (
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    UpdateTransactionUseCase,
)
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.modules.transactions.presentation.schemas import (
    CreateTransactionRequest,
    TransactionResponse,
    UpdateTransactionRequest,
)
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


def _map_dto(dto) -> TransactionResponse:
    return TransactionResponse(
        id=dto.id,
        user_id=dto.user_id,
        account_id=dto.account_id,
        category_id=dto.category_id,
        type=dto.type,
        amount=dto.amount,
        date=dto.date,
        description=dto.description,
        created_at=dto.created_at,
    )


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
) -> list[TransactionResponse]:
    dtos = await ListTransactionsUseCase(repo).execute(user_id, date_from, date_to)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: CreateTransactionRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    cat_repo: ICategoryRepository = Depends(get_category_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransactionResponse:
    try:
        dto = await CreateTransactionUseCase(repo, cat_repo, account_repo).execute(
            CreateTransactionDTO(
                user_id=user_id,
                account_id=body.account_id,
                category_id=body.category_id,
                type=body.type,
                amount=body.amount,
                date=body.date,
                description=body.description,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    body: UpdateTransactionRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    cat_repo: ICategoryRepository = Depends(get_category_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransactionResponse:
    try:
        dto = await UpdateTransactionUseCase(repo, cat_repo, account_repo).execute(
            UpdateTransactionDTO(
                transaction_id=transaction_id,
                user_id=user_id,
                account_id=body.account_id,
                category_id=body.category_id,
                type=body.type,
                amount=body.amount,
                date=body.date,
                description=body.description,
            )
        )
    except (NotFoundError, AuthorizationError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> None:
    try:
        await DeleteTransactionUseCase(repo, account_repo).execute(transaction_id, user_id)
    except (NotFoundError, AuthorizationError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
