import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.dependencies import get_account_repository, get_current_user_id, get_idempotency_repository
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.presentation.dependency import IdempotencyContext, get_idempotency_context
from app.modules.accounts.application.dtos import CreateAccountDTO, UpdateAccountDTO
from app.modules.accounts.application.use_cases import (
    CreateAccountUseCase,
    DeleteAccountUseCase,
    ListAccountsUseCase,
    UpdateAccountUseCase,
)
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.presentation.schemas import (
    AccountResponse,
    CreateAccountRequest,
    UpdateAccountRequest,
)
from app.shared.exceptions import NotFoundError

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


def _map_dto(dto) -> AccountResponse:
    return AccountResponse(
        id=dto.id,
        user_id=dto.user_id,
        name=dto.name,
        bank_name=dto.bank_name,
        balance=dto.balance,
        currency=dto.currency,
        created_at=dto.created_at,
        is_deleted=dto.deleted_at is not None,
    )


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    include_deleted: bool = Query(False),
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> list[AccountResponse]:
    dtos = await ListAccountsUseCase(repo).execute(user_id, include_deleted=include_deleted)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    body: CreateAccountRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
    idempotency: IdempotencyContext = Depends(get_idempotency_context),
    idempotency_repo: IIdempotencyRepository = Depends(get_idempotency_repository),
) -> AccountResponse:
    if idempotency.cached:
        return JSONResponse(
            content=idempotency.cached.response_body,
            status_code=idempotency.cached.status_code,
        )
    dto = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(
            id=body.id,
            user_id=user_id,
            name=body.name,
            bank_name=body.bank_name,
            currency=body.currency,
            balance=body.balance,
        )
    )
    result = _map_dto(dto)
    if idempotency.key:
        await idempotency_repo.save(IdempotencyRecord(
            user_id=user_id,
            key=idempotency.key,
            status_code=status.HTTP_201_CREATED,
            response_body=json.loads(result.model_dump_json()),
        ))
    return result


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID,
    body: UpdateAccountRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> AccountResponse:
    try:
        dto = await UpdateAccountUseCase(repo).execute(
            UpdateAccountDTO(
                account_id=account_id,
                user_id=user_id,
                name=body.name,
                bank_name=body.bank_name,
                balance=body.balance,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> None:
    try:
        await DeleteAccountUseCase(repo).execute(account_id, user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
