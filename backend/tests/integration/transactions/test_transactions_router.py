from uuid import uuid4
from httpx import AsyncClient
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository

TRANSACTIONS_URL = "/api/v1/transactions"


async def _make_cat(repo: FakeCategoryRepository) -> str:
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await repo.create(cat)
    return str(cat.id)


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(TRANSACTIONS_URL)
    assert resp.status_code == 403


async def test_create_transaction_returns_201(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": cat_id, "type": "expense",
        "amount": "1500.00", "date": "2026-05-01",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == "1500.00"
    assert data["category_id"] == cat_id


async def test_list_returns_transactions(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": cat_id, "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": cat_id, "type": "income", "amount": "200", "date": "2026-05-02",
    })
    resp = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_date_filter_filters_correctly(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    for d in ["2026-04-15", "2026-05-15", "2026-06-15"]:
        await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
            "category_id": cat_id, "type": "expense", "amount": "100", "date": d,
        })
    resp = await client.get(
        TRANSACTIONS_URL, headers=auth_headers,
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["date"] == "2026-05-15"


async def test_create_with_deleted_category_returns_409(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    from datetime import datetime, timezone
    cat = Category(name="Удалена", type="expense", icon="x", color="#fff", is_system=True)
    await fake_category_repo.create(cat)
    await fake_category_repo.soft_delete(cat.id, datetime.now(timezone.utc))
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": str(cat.id), "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 409


async def test_update_transaction(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": cat_id, "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    resp = await client.put(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers, json={"amount": "999"})
    assert resp.status_code == 200
    assert resp.json()["amount"] == "999"


async def test_delete_transaction_returns_204(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": cat_id, "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    resp = await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_deleted_transaction_gone(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "category_id": cat_id, "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    resp = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert all(t["id"] != txn_id for t in resp.json())


async def test_delete_nonexistent_returns_404(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.delete(f"{TRANSACTIONS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404
