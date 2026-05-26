import calendar
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from httpx import AsyncClient

from app.modules.stats.domain.entities import RawAccountRow, RawCategoryRow, RawTimelineRow
from app.modules.stats.infrastructure.fake_repository import FakeStatsRepository

CATEGORIES_URL = "/api/v1/stats/categories"
TIMELINE_URL = "/api/v1/stats/timeline"
ACCOUNTS_URL = "/api/v1/stats/accounts"


async def test_categories_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(CATEGORIES_URL)
    assert resp.status_code == 403


async def test_timeline_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(TIMELINE_URL)
    assert resp.status_code == 403


async def test_accounts_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(ACCOUNTS_URL)
    assert resp.status_code == 403


async def test_categories_returns_correct_data(
    client: AsyncClient, auth_headers: dict, fake_stats_repo: FakeStatsRepository
) -> None:
    cat_income = uuid4()
    cat_expense = uuid4()
    fake_stats_repo.seed_category_rows([
        RawCategoryRow(category_id=cat_income, category_name="Зарплата", type="income", amount=Decimal("100000.00")),
        RawCategoryRow(category_id=cat_expense, category_name="Еда", type="expense", amount=Decimal("30000.00")),
    ])
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_income"] == "100000.00"
    assert data["total_expense"] == "30000.00"
    assert data["net"] == "70000.00"
    assert len(data["income_by_category"]) == 1
    assert data["income_by_category"][0]["category_name"] == "Зарплата"
    assert len(data["expense_by_category"]) == 1
    assert data["expense_by_category"][0]["category_name"] == "Еда"


async def test_categories_empty_returns_zeros(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_income"] == "0.00"
    assert data["total_expense"] == "0.00"
    assert data["net"] == "0.00"
    assert data["income_by_category"] == []
    assert data["expense_by_category"] == []


async def test_categories_default_period_is_this_month(
    client: AsyncClient, auth_headers: dict
) -> None:
    today = date.today()
    expected_from = date(today.year, today.month, 1).isoformat()
    expected_to = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1]).isoformat()
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["date_from"] == expected_from
    assert data["date_to"] == expected_to


async def test_categories_period_this_month(
    client: AsyncClient, auth_headers: dict
) -> None:
    today = date.today()
    expected_from = date(today.year, today.month, 1).isoformat()
    resp = await client.get(CATEGORIES_URL, headers=auth_headers, params={"period": "this_month"})
    assert resp.status_code == 200
    assert resp.json()["date_from"] == expected_from


async def test_categories_period_this_year(
    client: AsyncClient, auth_headers: dict
) -> None:
    today = date.today()
    resp = await client.get(CATEGORIES_URL, headers=auth_headers, params={"period": "this_year"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["date_from"] == f"{today.year}-01-01"
    assert data["date_to"] == f"{today.year}-12-31"


async def test_categories_date_range_filter(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.get(
        CATEGORIES_URL, headers=auth_headers,
        params={"date_from": "2026-01-01", "date_to": "2026-03-31"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["date_from"] == "2026-01-01"
    assert data["date_to"] == "2026-03-31"


async def test_period_and_date_range_conflict_returns_422(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.get(
        CATEGORIES_URL, headers=auth_headers,
        params={"period": "this_month", "date_from": "2026-01-01", "date_to": "2026-01-31"}
    )
    assert resp.status_code == 422


async def test_date_from_greater_than_date_to_returns_422(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.get(
        CATEGORIES_URL, headers=auth_headers,
        params={"date_from": "2026-06-01", "date_to": "2026-01-01"}
    )
    assert resp.status_code == 422


async def test_invalid_period_returns_422(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.get(CATEGORIES_URL, headers=auth_headers, params={"period": "last_week"})
    assert resp.status_code == 422


async def test_timeline_monthly_by_default(
    client: AsyncClient, auth_headers: dict, fake_stats_repo: FakeStatsRepository
) -> None:
    fake_stats_repo.seed_timeline_rows([
        RawTimelineRow(period="2026-05", type="income", amount=Decimal("50000.00")),
        RawTimelineRow(period="2026-05", type="expense", amount=Decimal("20000.00")),
    ])
    resp = await client.get(
        TIMELINE_URL, headers=auth_headers,
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["granularity"] == "month"
    assert len(data["periods"]) == 1
    assert data["periods"][0]["period"] == "2026-05"
    assert data["periods"][0]["income"] == "50000.00"
    assert data["periods"][0]["expense"] == "20000.00"
    assert data["periods"][0]["net"] == "30000.00"


async def test_timeline_day_granularity(
    client: AsyncClient, auth_headers: dict, fake_stats_repo: FakeStatsRepository
) -> None:
    fake_stats_repo.seed_timeline_rows([
        RawTimelineRow(period="2026-05-01", type="income", amount=Decimal("5000.00")),
    ])
    resp = await client.get(
        TIMELINE_URL, headers=auth_headers,
        params={"date_from": "2026-05-01", "date_to": "2026-05-02", "granularity": "day"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["granularity"] == "day"
    assert len(data["periods"]) == 2
    assert data["periods"][0]["period"] == "2026-05-01"
    assert data["periods"][1]["period"] == "2026-05-02"
    assert data["periods"][1]["income"] == "0.00"


async def test_accounts_returns_correct_data(
    client: AsyncClient, auth_headers: dict, fake_stats_repo: FakeStatsRepository
) -> None:
    acc_id = uuid4()
    fake_stats_repo.seed_account_rows([
        RawAccountRow(account_id=acc_id, account_name="Сбербанк", type="income", amount=Decimal("50000.00")),
        RawAccountRow(account_id=acc_id, account_name="Сбербанк", type="expense", amount=Decimal("20000.00")),
    ])
    resp = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["accounts"]) == 1
    assert data["accounts"][0]["account_name"] == "Сбербанк"
    assert data["accounts"][0]["income"] == "50000.00"
    assert data["accounts"][0]["expense"] == "20000.00"
    assert data["accounts"][0]["net"] == "30000.00"


async def test_accounts_empty_period(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["accounts"] == []
