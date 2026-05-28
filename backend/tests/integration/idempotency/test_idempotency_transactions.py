from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository

ACCOUNTS_URL = "/api/v1/accounts"
TRANSACTIONS_URL = "/api/v1/transactions"


async def _make_account(client: AsyncClient, headers: dict) -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": "Main", "bank_name": "Bank", "currency": "RUB", "balance": "5000.00",
    })
    assert resp.status_code == 201
    return resp.json()["id"]


async def _make_cat(repo: FakeCategoryRepository, cat_type: str = "expense") -> str:
    cat = Category(name="Food", type=cat_type, icon="utensils", color="#f97316", is_system=True)
    await repo.create(cat)
    return str(cat.id)


@pytest.mark.asyncio
async def test_same_key_returns_identical_response(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    account_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    key = f"test-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "expense", "amount": "99.99", "date": "2026-05-28",
    }
    resp1 = await client.post(TRANSACTIONS_URL, headers=headers, json=payload)
    assert resp1.status_code == 201
    tx_id = resp1.json()["id"]

    resp2 = await client.post(TRANSACTIONS_URL, headers=headers, json=payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == tx_id


@pytest.mark.asyncio
async def test_same_key_does_not_create_duplicate(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    account_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    key = f"test-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "expense", "amount": "50.00", "date": "2026-05-28",
    }
    await client.post(TRANSACTIONS_URL, headers=headers, json=payload)
    await client.post(TRANSACTIONS_URL, headers=headers, json=payload)

    all_txns = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert len(all_txns.json()) == 1


@pytest.mark.asyncio
async def test_different_keys_create_separate_transactions(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    account_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "expense", "amount": "25.00", "date": "2026-05-28",
    }
    await client.post(
        TRANSACTIONS_URL,
        headers={**auth_headers, "X-Idempotency-Key": "key-1"},
        json=payload,
    )
    await client.post(
        TRANSACTIONS_URL,
        headers={**auth_headers, "X-Idempotency-Key": "key-2"},
        json=payload,
    )

    all_txns = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert len(all_txns.json()) == 2


@pytest.mark.asyncio
async def test_no_key_header_still_works(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    account_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo, cat_type="income")
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "income", "amount": "100.00", "date": "2026-05-28",
    }
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json=payload)
    assert resp.status_code == 201
