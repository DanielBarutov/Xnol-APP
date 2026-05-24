from datetime import datetime
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.categories.domain.entities import Category
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.categories.infrastructure.models import CategoryModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: CategoryModel) -> Category:
    return Category(
        id=m.id,
        user_id=m.user_id,
        parent_id=m.parent_id,
        name=m.name,
        type=m.type,
        icon=m.icon,
        color=m.color,
        is_system=m.is_system,
        deleted_at=m.deleted_at,
    )


class SQLAlchemyCategoryRepository(ICategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: UUID) -> list[Category]:
        result = await self._session.execute(
            select(CategoryModel).where(
                CategoryModel.deleted_at.is_(None),
                (CategoryModel.user_id.is_(None)) | (CategoryModel.user_id == user_id),
            )
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, category_id: UUID) -> Category | None:
        result = await self._session.execute(
            select(CategoryModel).where(CategoryModel.id == category_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, category: Category) -> Category:
        model = CategoryModel(
            id=category.id,
            user_id=category.user_id,
            parent_id=category.parent_id,
            name=category.name,
            type=category.type,
            icon=category.icon,
            color=category.color,
            is_system=category.is_system,
            deleted_at=category.deleted_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, category: Category) -> Category:
        result = await self._session.execute(
            select(CategoryModel).where(CategoryModel.id == category.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Category", str(category.id))
        model.name = category.name
        model.icon = category.icon
        model.color = category.color
        await self._session.flush()
        return _to_entity(model)

    async def soft_delete(self, category_id: UUID, deleted_at: datetime) -> None:
        result = await self._session.execute(
            select(CategoryModel).where(CategoryModel.id == category_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Category", str(category_id))
        model.deleted_at = deleted_at
        await self._session.flush()

    async def has_active_children(self, category_id: UUID) -> bool:
        result = await self._session.execute(
            select(CategoryModel).where(
                CategoryModel.parent_id == category_id,
                CategoryModel.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none() is not None

    async def count_transactions(self, category_id: UUID) -> int:
        result = await self._session.execute(
            text("SELECT COUNT(*) FROM transactions WHERE category_id = :id"),
            {"id": category_id},
        )
        return result.scalar_one()
