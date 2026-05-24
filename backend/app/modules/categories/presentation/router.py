from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_category_repository, get_current_user_id
from app.modules.categories.application.dtos import CreateCategoryDTO, UpdateCategoryDTO
from app.modules.categories.application.use_cases import (
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
    UpdateCategoryUseCase,
)
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.categories.presentation.schemas import (
    CategoryResponse,
    CreateCategoryRequest,
    UpdateCategoryRequest,
)
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


def _map_dto(dto) -> CategoryResponse:
    return CategoryResponse(
        id=dto.id,
        user_id=dto.user_id,
        parent_id=dto.parent_id,
        name=dto.name,
        type=dto.type,
        icon=dto.icon,
        color=dto.color,
        is_system=dto.is_system,
        children=[_map_dto(c) for c in dto.children],
    )


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    user_id: UUID = Depends(get_current_user_id),
    repo: ICategoryRepository = Depends(get_category_repository),
) -> list[CategoryResponse]:
    dtos = await ListCategoriesUseCase(repo).execute(user_id)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CreateCategoryRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ICategoryRepository = Depends(get_category_repository),
) -> CategoryResponse:
    try:
        dto = await CreateCategoryUseCase(repo).execute(
            CreateCategoryDTO(
                user_id=user_id,
                name=body.name,
                type=body.type,
                icon=body.icon,
                color=body.color,
                parent_id=body.parent_id,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except (AuthorizationError, ConflictError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    body: UpdateCategoryRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ICategoryRepository = Depends(get_category_repository),
) -> CategoryResponse:
    try:
        dto = await UpdateCategoryUseCase(repo).execute(
            UpdateCategoryDTO(
                category_id=category_id,
                user_id=user_id,
                name=body.name,
                icon=body.icon,
                color=body.color,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except AuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: ICategoryRepository = Depends(get_category_repository),
) -> None:
    try:
        await DeleteCategoryUseCase(repo).execute(category_id, user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except AuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
