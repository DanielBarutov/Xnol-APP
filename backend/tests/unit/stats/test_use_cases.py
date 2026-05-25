from decimal import Decimal
from datetime import date
from uuid import uuid4

from app.modules.stats.application.use_cases import (
    GetAccountStatsUseCase,
    GetCategoryStatsUseCase,
    GetTimelineUseCase,
)
from app.modules.stats.domain.entities import RawAccountRow, RawCategoryRow, RawTimelineRow
from app.modules.stats.infrastructure.fake_repository import FakeStatsRepository


async def test_category_stats_splits_income_expense() -> None:
    repo = FakeStatsRepository()
    cat_income = uuid4()
    cat_expense = uuid4()
    repo.seed_category_rows([
        RawCategoryRow(category_id=cat_income, category_name="Зарплата", type="income", amount=Decimal("100000.00")),
        RawCategoryRow(category_id=cat_expense, category_name="Еда", type="expense", amount=Decimal("30000.00")),
    ])
    result = await GetCategoryStatsUseCase(repo).execute(uuid4(), date(2026, 5, 1), date(2026, 5, 31))
    assert result.total_income == Decimal("100000.00")
    assert result.total_expense == Decimal("30000.00")
    assert result.net == Decimal("70000.00")
    assert len(result.income_by_category) == 1
    assert result.income_by_category[0].category_name == "Зарплата"
    assert len(result.expense_by_category) == 1
    assert result.expense_by_category[0].category_name == "Еда"


async def test_category_stats_empty_period() -> None:
    repo = FakeStatsRepository()
    result = await GetCategoryStatsUseCase(repo).execute(uuid4(), date(2026, 5, 1), date(2026, 5, 31))
    assert result.total_income == Decimal("0.00")
    assert result.total_expense == Decimal("0.00")
    assert result.net == Decimal("0.00")
    assert result.income_by_category == []
    assert result.expense_by_category == []


async def test_timeline_fills_missing_months() -> None:
    repo = FakeStatsRepository()
    repo.seed_timeline_rows([
        RawTimelineRow(period="2026-01", type="income", amount=Decimal("100000.00")),
        RawTimelineRow(period="2026-03", type="expense", amount=Decimal("50000.00")),
    ])
    result = await GetTimelineUseCase(repo).execute(
        uuid4(), date(2026, 1, 1), date(2026, 3, 31), "month"
    )
    assert len(result.periods) == 3
    assert result.periods[0].period == "2026-01"
    assert result.periods[0].income == Decimal("100000.00")
    assert result.periods[0].expense == Decimal("0.00")
    assert result.periods[0].net == Decimal("100000.00")
    assert result.periods[1].period == "2026-02"
    assert result.periods[1].income == Decimal("0.00")
    assert result.periods[1].expense == Decimal("0.00")
    assert result.periods[1].net == Decimal("0.00")
    assert result.periods[2].period == "2026-03"
    assert result.periods[2].income == Decimal("0.00")
    assert result.periods[2].expense == Decimal("50000.00")
    assert result.periods[2].net == Decimal("-50000.00")


async def test_timeline_day_granularity_fills_missing_days() -> None:
    repo = FakeStatsRepository()
    repo.seed_timeline_rows([
        RawTimelineRow(period="2026-05-01", type="income", amount=Decimal("5000.00")),
        RawTimelineRow(period="2026-05-03", type="expense", amount=Decimal("1000.00")),
    ])
    result = await GetTimelineUseCase(repo).execute(
        uuid4(), date(2026, 5, 1), date(2026, 5, 3), "day"
    )
    assert len(result.periods) == 3
    assert result.periods[0].period == "2026-05-01"
    assert result.periods[0].income == Decimal("5000.00")
    assert result.periods[1].period == "2026-05-02"
    assert result.periods[1].income == Decimal("0.00")
    assert result.periods[1].expense == Decimal("0.00")
    assert result.periods[2].period == "2026-05-03"
    assert result.periods[2].expense == Decimal("1000.00")


async def test_account_stats_merges_income_expense() -> None:
    repo = FakeStatsRepository()
    acc_id = uuid4()
    repo.seed_account_rows([
        RawAccountRow(account_id=acc_id, account_name="Сбербанк", type="income", amount=Decimal("50000.00")),
        RawAccountRow(account_id=acc_id, account_name="Сбербанк", type="expense", amount=Decimal("20000.00")),
    ])
    result = await GetAccountStatsUseCase(repo).execute(uuid4(), date(2026, 5, 1), date(2026, 5, 31))
    assert len(result.accounts) == 1
    assert result.accounts[0].account_name == "Сбербанк"
    assert result.accounts[0].income == Decimal("50000.00")
    assert result.accounts[0].expense == Decimal("20000.00")
    assert result.accounts[0].net == Decimal("30000.00")


async def test_account_stats_empty_period() -> None:
    repo = FakeStatsRepository()
    result = await GetAccountStatsUseCase(repo).execute(uuid4(), date(2026, 5, 1), date(2026, 5, 31))
    assert result.accounts == []
