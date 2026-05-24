from datetime import datetime, timezone
from uuid import UUID

from app.modules.categories.application.dtos import CategoryDTO, CreateCategoryDTO, UpdateCategoryDTO
from app.modules.categories.domain.entities import Category
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError


def _to_dto(cat: Category) -> CategoryDTO:
    return CategoryDTO(
        id=cat.id,
        user_id=cat.user_id,
        parent_id=cat.parent_id,
        name=cat.name,
        type=cat.type,
        icon=cat.icon,
        color=cat.color,
        is_system=cat.is_system,
    )


def _build_tree(categories: list[Category]) -> list[CategoryDTO]:
    by_id: dict[UUID, CategoryDTO] = {c.id: _to_dto(c) for c in categories}
    roots: list[CategoryDTO] = []
    for c in categories:
        if c.parent_id is None:
            roots.append(by_id[c.id])
        elif c.parent_id in by_id:
            by_id[c.parent_id].children.append(by_id[c.id])
    return roots


class ListCategoriesUseCase:
    def __init__(self, repo: ICategoryRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[CategoryDTO]:
        categories = await self._repo.list_for_user(user_id)
        return _build_tree(categories)


class CreateCategoryUseCase:
    def __init__(self, repo: ICategoryRepository) -> None:
        self._repo = repo

    async def execute(self, dto: CreateCategoryDTO) -> CategoryDTO:
        if dto.parent_id is not None:
            parent = await self._repo.find_by_id(dto.parent_id)
            if parent is None or parent.deleted_at is not None:
                raise NotFoundError("Category", str(dto.parent_id))
            if parent.parent_id is not None:
                raise ConflictError("Cannot create subcategory under a subcategory")
            if parent.user_id is not None and parent.user_id != dto.user_id:
                raise AuthorizationError("Cannot create subcategory under another user's category")
        category = Category(
            user_id=dto.user_id,
            parent_id=dto.parent_id,
            name=dto.name,
            type=dto.type,
            icon=dto.icon,
            color=dto.color,
        )
        saved = await self._repo.create(category)
        return _to_dto(saved)


class UpdateCategoryUseCase:
    def __init__(self, repo: ICategoryRepository) -> None:
        self._repo = repo

    async def execute(self, dto: UpdateCategoryDTO) -> CategoryDTO:
        cat = await self._repo.find_by_id(dto.category_id)
        if cat is None:
            raise NotFoundError("Category", str(dto.category_id))
        if cat.is_system:
            raise AuthorizationError("Cannot modify system category")
        if cat.user_id != dto.user_id:
            raise AuthorizationError()
        updated = Category(
            id=cat.id,
            user_id=cat.user_id,
            parent_id=cat.parent_id,
            name=dto.name if dto.name is not None else cat.name,
            type=cat.type,
            icon=dto.icon if dto.icon is not None else cat.icon,
            color=dto.color if dto.color is not None else cat.color,
            is_system=cat.is_system,
            deleted_at=cat.deleted_at,
        )
        saved = await self._repo.update(updated)
        return _to_dto(saved)


class DeleteCategoryUseCase:
    def __init__(self, repo: ICategoryRepository) -> None:
        self._repo = repo

    async def execute(self, category_id: UUID, user_id: UUID) -> None:
        cat = await self._repo.find_by_id(category_id)
        if cat is None:
            raise NotFoundError("Category", str(category_id))
        if cat.is_system:
            raise AuthorizationError("Cannot delete system category")
        if cat.user_id != user_id:
            raise AuthorizationError()
        if await self._repo.has_active_children(category_id):
            raise ConflictError("Category has subcategories -- delete them first")
        if await self._repo.count_transactions(category_id) > 0:
            raise ConflictError("Category is used by transactions")
        await self._repo.soft_delete(category_id, datetime.now(timezone.utc))
