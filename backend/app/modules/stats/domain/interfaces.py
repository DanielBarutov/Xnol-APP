from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID

from app.modules.stats.domain.entities import RawAccountRow, RawCategoryRow, RawTimelineRow


class IStatsRepository(ABC):
    @abstractmethod
    async def get_category_rows(
        self, user_id: UUID, date_from: date, date_to: date
    ) -> list[RawCategoryRow]:
        """Returns one row per (category, type) with sum of amounts."""
        ...

    @abstractmethod
    async def get_timeline_rows(
        self, user_id: UUID, date_from: date, date_to: date, granularity: str
    ) -> list[RawTimelineRow]:
        """Returns one row per (period, type) ordered by period asc. granularity: 'month'|'day'."""
        ...

    @abstractmethod
    async def get_account_rows(
        self, user_id: UUID, date_from: date, date_to: date
    ) -> list[RawAccountRow]:
        """Returns one row per (account, type) with sum of amounts. Excludes soft-deleted accounts."""
        ...
