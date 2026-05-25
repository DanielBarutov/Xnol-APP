from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from httpx import AsyncClient

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository

ACCOUNTS_URL = "/api/v1/accounts"
TRANSACTIONS_URL = "/api/v1/transactions"


async def _make_account(client: AsyncClient, headers: dict, balance: str = "10000.00") -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": "Test", "bank_name": "Bank", "currency": "RUB", "balance": balance,
    })
    assert resp.status_code == 201
    return resp.json()["id"]


async def _make_cat(repo: FakeCategoryRepository) -> str:
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await repo.create(cat)
    return str(cat.id)


async def _get_balance(client: AsyncClient, headers: dict, account_id: str) -> str:
    accounts = {a["id"]: a for a in (await client.get(ACCOUNTS_URL, headers=headers)).json()}
    return accounts[account_id]["balance"]


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(TRANSACTIONS_URL)
    assert resp.status_code == 403


async def test_create_transaction_returns_201(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "1500.00", "date": "2026-05-01",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == "1500.00"
    assert data["account_id"] == acc_id


async def test_create_expense_decreases_account_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "5000.00")
    cat_id = await _make_cat(fake_category_repo)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "1200.00", "date": "2026-05-01",
    })
    assert await _get_balance(client, auth_headers, acc_id) == "3800.00"


async def test_create_income_increases_account_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "2000.00")
    income_cat = Category(name="Зарплата", type="income", icon="cash", color="#22c55e", is_system=True)
    await fake_category_repo.create(income_cat)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": str(income_cat.id),
        "type": "income", "amount": "3000.00", "date": "2026-05-01",
    })
    assert await _get_balance(client, auth_headers, acc_id) == "5000.00"


async def test_list_returns_transactions(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "income", "amount": "200", "date": "2026-05-02",
    })
    resp = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_date_filter_filters_correctly(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    for d in ["2026-04-15", "2026-05-15", "2026-06-15"]:
        await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
            "account_id": acc_id, "category_id": cat_id,
            "type": "expense", "amount": "100", "date": d,
        })
    resp = await client.get(
        TRANSACTIONS_URL, headers=auth_headers,
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["date"] == "2026-05-15"


async def test_update_amount_recalculates_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "10000.00")
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "200.00", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    # balance = 9800; update amount to 500 → balance should become 9500
    await client.put(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers, json={"amount": "500.00"})
    assert await _get_balance(client, auth_headers, acc_id) == "9500.00"


async def test_update_account_id_reverts_old_and_updates_new(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_a = await _make_account(client, auth_headers, "10000.00")
    acc_b = await _make_account(client, auth_headers, "5000.00")
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_a, "category_id": cat_id,
        "type": "expense", "amount": "300.00", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    # acc_a = 9700; move transaction to acc_b → acc_a reverts to 10000, acc_b = 4700
    await client.put(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers, json={"account_id": acc_b})
    assert await _get_balance(client, auth_headers, acc_a) == "10000.00"
    assert await _get_balance(client, auth_headers, acc_b) == "4700.00"


async def test_delete_transaction_reverts_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "8000.00")
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "500.00", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    assert await _get_balance(client, auth_headers, acc_id) == "8000.00"


async def test_create_with_nonexistent_account_returns_404(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": str(uuid4()), "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 404


async def test_create_with_foreign_account_returns_404(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository,
    fake_account_repo: FakeAccountRepository,
) -> None:
    foreign = Account(user_id=uuid4(), name="Чужой", bank_name="Bank", currency="RUB", balance=Decimal("1000"))
    await fake_account_repo.create(foreign)
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": str(foreign.id), "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 404


async def test_create_with_deleted_account_returns_409(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    await client.delete(f"{ACCOUNTS_URL}/{acc_id}", headers=auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 409


async def test_create_with_deleted_category_returns_409(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat = Category(name="Удалена", type="expense", icon="x", color="#fff", is_system=True)
    await fake_category_repo.create(cat)
    await fake_category_repo.soft_delete(cat.id, datetime.now(timezone.utc))
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": str(cat.id),
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 409


async def test_delete_transaction_returns_204(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    resp = await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_deleted_transaction_gone(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    resp = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert all(t["id"] != txn_id for t in resp.json())


async def test_delete_nonexistent_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.delete(f"{TRANSACTIONS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_other_user_transaction_returns_404(
    client: AsyncClient, fake_category_repo: FakeCategoryRepository
) -> None:
    await client.post("/api/v1/auth/register", json={
        "email": "user_a@example.com", "password": "pass1234",
        "full_name": "User A", "primary_currency": "RUB",
    })
    resp_a = await client.post("/api/v1/auth/login", json={"email": "user_a@example.com", "password": "pass1234"})
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}

    await client.post("/api/v1/auth/register", json={
        "email": "user_b@example.com", "password": "pass1234",
        "full_name": "User B", "primary_currency": "RUB",
    })
    resp_b = await client.post("/api/v1/auth/login", json={"email": "user_b@example.com", "password": "pass1234"})
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}

    acc_id = await _make_account(client, headers_a)
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=headers_a, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "500", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    resp = await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=headers_b)
    assert resp.status_code == 404
