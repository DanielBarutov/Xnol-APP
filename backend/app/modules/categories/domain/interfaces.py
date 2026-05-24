from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.modules.categories.domain.entities import Category


class ICategoryRepository(ABC):
    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Category]:
        """Returns system categories + user's own, excluding soft-deleted."""
        ...

    @abstractmethod
    async def find_by_id(self, category_id: UUID) -> Category | None:
        """Returns category regardless of deleted_at status."""
        ...

    @abstractmethod
    async def create(self, category: Category) -> Category: ...

    @abstractmethod
    async def update(self, category: Category) -> Category: ...

    @abstractmethod
    async def soft_delete(self, category_id: UUID, deleted_at: datetime) -> None: ...

    @abstractmethod
    async def has_active_children(self, category_id: UUID) -> bool:
        """True if any non-deleted child categories exist."""
        ...

    @abstractmethod
    async def count_transactions(self, category_id: UUID) -> int:
        """Count transactions referencing this category (cross-table query in SQL impl)."""
        ...
