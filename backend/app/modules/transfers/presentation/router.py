from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_account_repository, get_current_user_id, get_transfer_repository
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.transfers.application.dtos import CreateTransferDTO, UpdateTransferDTO
from app.modules.transfers.application.use_cases import (
    CreateTransferUseCase,
    DeleteTransferUseCase,
    ListTransfersUseCase,
    UpdateTransferUseCase,
)
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.modules.transfers.presentation.schemas import (
    CreateTransferRequest,
    TransferResponse,
    UpdateTransferRequest,
)
from app.shared.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/api/v1/transfers", tags=["transfers"])


def _map_dto(dto) -> TransferResponse:
    return TransferResponse(
        id=dto.id,
        user_id=dto.user_id,
        source_type=dto.source_type,
        source_id=dto.source_id,
        source_label=dto.source_label,
        dest_type=dto.dest_type,
        dest_id=dto.dest_id,
        dest_label=dto.dest_label,
        amount=dto.amount,
        currency=dto.currency,
        date=dto.date,
        description=dto.description,
        created_at=dto.created_at,
    )


@router.get("", response_model=list[TransferResponse])
async def list_transfers(
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
) -> list[TransferResponse]:
    dtos = await ListTransfersUseCase(repo).execute(user_id)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    body: CreateTransferRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransferResponse:
    try:
        dto = await CreateTransferUseCase(repo, account_repo).execute(
            CreateTransferDTO(
                user_id=user_id,
                source_type=body.source_type,
                source_id=body.source_id,
                source_label=body.source_label,
                dest_type=body.dest_type,
                dest_id=body.dest_id,
                dest_label=body.dest_label,
                amount=body.amount,
                currency=body.currency,
                date=body.date,
                description=body.description,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.put("/{transfer_id}", response_model=TransferResponse)
async def update_transfer(
    transfer_id: UUID,
    body: UpdateTransferRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransferResponse:
    try:
        dto = await UpdateTransferUseCase(repo, account_repo).execute(
            UpdateTransferDTO(
                transfer_id=transfer_id,
                user_id=user_id,
                source_type=body.source_type,
                source_id=body.source_id,
                source_label=body.source_label,
                dest_type=body.dest_type,
                dest_id=body.dest_id,
                dest_label=body.dest_label,
                amount=body.amount,
                currency=body.currency,
                date=body.date,
                description=body.description,
            )
        )
    except (NotFoundError, ConflictError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transfer(
    transfer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> None:
    try:
        await DeleteTransferUseCase(repo, account_repo).execute(transfer_id, user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
