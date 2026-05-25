from datetime import date
from uuid import UUID

from app.modules.stats.domain.entities import RawAccountRow, RawCategoryRow, RawTimelineRow
from app.modules.stats.domain.interfaces import IStatsRepository


class FakeStatsRepository(IStatsRepository):
    def __init__(self) -> None:
        self._category_rows: list[RawCategoryRow] = []
        self._timeline_rows: list[RawTimelineRow] = []
        self._account_rows: list[RawAccountRow] = []

    def seed_category_rows(self, rows: list[RawCategoryRow]) -> None:
        self._category_rows = list(rows)

    def seed_timeline_rows(self, rows: list[RawTimelineRow]) -> None:
        self._timeline_rows = list(rows)

    def seed_account_rows(self, rows: list[RawAccountRow]) -> None:
        self._account_rows = list(rows)

    async def get_category_rows(self, user_id: UUID, date_from: date, date_to: date) -> list[RawCategoryRow]:
        return list(self._category_rows)

    async def get_timeline_rows(self, user_id: UUID, date_from: date, date_to: date, granularity: str) -> list[RawTimelineRow]:
        return list(self._timeline_rows)

    async def get_account_rows(self, user_id: UUID, date_from: date, date_to: date) -> list[RawAccountRow]:
        return list(self._account_rows)
