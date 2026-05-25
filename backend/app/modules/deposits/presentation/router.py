from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user_id, get_deposit_repository
from app.modules.deposits.application.dtos import (
    CloseDepositDTO,
    CreateDepositDTO,
    UpdateDepositDTO,
)
from app.modules.deposits.application.use_cases import (
    CloseDepositUseCase,
    CreateDepositUseCase,
    ListDepositsUseCase,
    UpdateDepositUseCase,
)
from app.modules.deposits.domain.interfaces import IDepositRepository
from app.modules.deposits.presentation.schemas import (
    CloseDepositRequest,
    CreateDepositRequest,
    DepositResponse,
    UpdateDepositRequest,
)
from app.shared.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/api/v1/deposits", tags=["deposits"])


def _map_dto(dto) -> DepositResponse:
    return DepositResponse(
        id=dto.id, user_id=dto.user_id, name=dto.name, bank_name=dto.bank_name,
        amount=dto.amount, interest_rate=dto.interest_rate, interest_type=dto.interest_type,
        open_date=dto.open_date, close_date=dto.close_date,
        early_closure_rate=dto.early_closure_rate, auto_renew=dto.auto_renew,
        currency=dto.currency, balance=dto.balance, status=dto.status,
        actual_close_date=dto.actual_close_date, created_at=dto.created_at,
    )


@router.get("", response_model=list[DepositResponse])
async def list_deposits(
    user_id: UUID = Depends(get_current_user_id),
    repo: IDepositRepository = Depends(get_deposit_repository),
) -> list[DepositResponse]:
    dtos = await ListDepositsUseCase(repo).execute(user_id)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
async def create_deposit(
    body: CreateDepositRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IDepositRepository = Depends(get_deposit_repository),
) -> DepositResponse:
    dto = await CreateDepositUseCase(repo).execute(
        CreateDepositDTO(
            user_id=user_id, name=body.name, bank_name=body.bank_name,
            amount=body.amount, interest_rate=body.interest_rate,
            interest_type=body.interest_type, open_date=body.open_date,
            close_date=body.close_date, currency=body.currency,
            balance=body.balance if body.balance is not None else body.amount,
            auto_renew=body.auto_renew, early_closure_rate=body.early_closure_rate,
        )
    )
    return _map_dto(dto)


@router.put("/{deposit_id}", response_model=DepositResponse)
async def update_deposit(
    deposit_id: UUID,
    body: UpdateDepositRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IDepositRepository = Depends(get_deposit_repository),
) -> DepositResponse:
    try:
        dto = await UpdateDepositUseCase(repo).execute(
            UpdateDepositDTO(
                deposit_id=deposit_id, user_id=user_id, name=body.name,
                bank_name=body.bank_name, amount=body.amount,
                interest_rate=body.interest_rate, interest_type=body.interest_type,
                open_date=body.open_date, close_date=body.close_date,
                early_closure_rate=body.early_closure_rate, auto_renew=body.auto_renew,
                balance=body.balance,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{deposit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def close_deposit(
    deposit_id: UUID,
    body: CloseDepositRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IDepositRepository = Depends(get_deposit_repository),
) -> None:
    try:
        await CloseDepositUseCase(repo).execute(
            CloseDepositDTO(
                deposit_id=deposit_id, user_id=user_id,
                close_type=body.close_type, actual_close_date=body.actual_close_date,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
