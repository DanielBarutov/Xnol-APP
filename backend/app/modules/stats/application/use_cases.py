from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from app.modules.stats.application.dtos import (
    AccountStatDTO,
    AccountStatsDTO,
    CategoryStatDTO,
    CategoryStatsDTO,
    TimelineDTO,
    TimelinePeriodDTO,
)
from app.modules.stats.domain.interfaces import IStatsRepository


def _iter_months(date_from: date, date_to: date) -> list[str]:
    months = []
    current = date(date_from.year, date_from.month, 1)
    end = date(date_to.year, date_to.month, 1)
    while current <= end:
        months.append(current.strftime("%Y-%m"))
        current = date(current.year + (current.month // 12), (current.month % 12) + 1, 1)
    return months


def _iter_days(date_from: date, date_to: date) -> list[str]:
    days = []
    current = date_from
    while current <= date_to:
        days.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return days


class GetCategoryStatsUseCase:
    def __init__(self, repo: IStatsRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID, date_from: date, date_to: date) -> CategoryStatsDTO:
        rows = await self._repo.get_category_rows(user_id, date_from, date_to)
        total_income = Decimal("0.00")
        total_expense = Decimal("0.00")
        income_by_category: list[CategoryStatDTO] = []
        expense_by_category: list[CategoryStatDTO] = []
        for row in rows:
            if row.type == "income":
                total_income += row.amount
                income_by_category.append(CategoryStatDTO(
                    category_id=row.category_id,
                    category_name=row.category_name,
                    amount=row.amount,
                ))
            else:
                total_expense += row.amount
                expense_by_category.append(CategoryStatDTO(
                    category_id=row.category_id,
                    category_name=row.category_name,
                    amount=row.amount,
                ))
        return CategoryStatsDTO(
            date_from=date_from,
            date_to=date_to,
            total_income=total_income,
            total_expense=total_expense,
            net=total_income - total_expense,
            income_by_category=income_by_category,
            expense_by_category=expense_by_category,
        )


class GetTimelineUseCase:
    def __init__(self, repo: IStatsRepository) -> None:
        self._repo = repo

    async def execute(
        self, user_id: UUID, date_from: date, date_to: date, granularity: str
    ) -> TimelineDTO:
        rows = await self._repo.get_timeline_rows(user_id, date_from, date_to, granularity)
        income_map: dict[str, Decimal] = {}
        expense_map: dict[str, Decimal] = {}
        for row in rows:
            if row.type == "income":
                income_map[row.period] = income_map.get(row.period, Decimal("0.00")) + row.amount
            else:
                expense_map[row.period] = expense_map.get(row.period, Decimal("0.00")) + row.amount
        all_periods = _iter_months(date_from, date_to) if granularity == "month" else _iter_days(date_from, date_to)
        periods = []
        for p in all_periods:
            income = income_map.get(p, Decimal("0.00"))
            expense = expense_map.get(p, Decimal("0.00"))
            periods.append(TimelinePeriodDTO(
                period=p,
                income=income,
                expense=expense,
                net=income - expense,
            ))
        return TimelineDTO(
            date_from=date_from,
            date_to=date_to,
            granularity=granularity,
            periods=periods,
        )


class GetAccountStatsUseCase:
    def __init__(self, repo: IStatsRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID, date_from: date, date_to: date) -> AccountStatsDTO:
        rows = await self._repo.get_account_rows(user_id, date_from, date_to)
        name_map: dict[UUID, str] = {}
        income_map: dict[UUID, Decimal] = {}
        expense_map: dict[UUID, Decimal] = {}
        for row in rows:
            name_map[row.account_id] = row.account_name
            if row.type == "income":
                income_map[row.account_id] = income_map.get(row.account_id, Decimal("0.00")) + row.amount
            else:
                expense_map[row.account_id] = expense_map.get(row.account_id, Decimal("0.00")) + row.amount
        all_ids = sorted(set(income_map) | set(expense_map))
        accounts = []
        for acc_id in all_ids:
            income = income_map.get(acc_id, Decimal("0.00"))
            expense = expense_map.get(acc_id, Decimal("0.00"))
            accounts.append(AccountStatDTO(
                account_id=acc_id,
                account_name=name_map[acc_id],
                income=income,
                expense=expense,
                net=income - expense,
            ))
        return AccountStatsDTO(date_from=date_from, date_to=date_to, accounts=accounts)
