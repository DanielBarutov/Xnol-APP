from datetime import datetime
from uuid import UUID

from app.modules.categories.domain.entities import Category
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.shared.exceptions import NotFoundError


class FakeCategoryRepository(ICategoryRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Category] = {}
        self._transaction_counts: dict[UUID, int] = {}

    async def list_for_user(self, user_id: UUID) -> list[Category]:
        return [
            c for c in self._store.values()
            if c.deleted_at is None and (c.user_id is None or c.user_id == user_id)
        ]

    async def find_by_id(self, category_id: UUID) -> Category | None:
        return self._store.get(category_id)

    async def create(self, category: Category) -> Category:
        self._store[category.id] = category
        return category

    async def update(self, category: Category) -> Category:
        if category.id not in self._store:
            raise NotFoundError("Category", str(category.id))
        old = self._store[category.id]
        updated = Category(
            id=old.id,
            user_id=old.user_id,
            parent_id=old.parent_id,
            name=category.name,
            type=old.type,
            icon=category.icon,
            color=category.color,
            is_system=old.is_system,
            deleted_at=old.deleted_at,
        )
        self._store[category.id] = updated
        return updated

    async def soft_delete(self, category_id: UUID, deleted_at: datetime) -> None:
        if category_id not in self._store:
            raise NotFoundError("Category", str(category_id))
        cat = self._store[category_id]
        self._store[category_id] = Category(
            id=cat.id,
            user_id=cat.user_id,
            parent_id=cat.parent_id,
            name=cat.name,
            type=cat.type,
            icon=cat.icon,
            color=cat.color,
            is_system=cat.is_system,
            deleted_at=deleted_at,
        )

    async def has_active_children(self, category_id: UUID) -> bool:
        return any(
            c.parent_id == category_id and c.deleted_at is None
            for c in self._store.values()
        )

    async def count_transactions(self, category_id: UUID) -> int:
        return self._transaction_counts.get(category_id, 0)
