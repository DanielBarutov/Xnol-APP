from uuid import uuid4
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"
TRANSFERS_URL = "/api/v1/transfers"
DEPOSITS_URL = "/api/v1/deposits"


async def _make_account(client: AsyncClient, headers: dict, balance: str = "10000.00") -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": "Test", "bank_name": "Bank", "currency": "RUB", "balance": balance,
    })
    return resp.json()["id"]


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(TRANSFERS_URL)
    assert resp.status_code == 403


async def test_create_savings_to_savings_updates_balances(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc_a = await _make_account(client, auth_headers, "10000.00")
    acc_b = await _make_account(client, auth_headers, "5000.00")

    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc_a,
        "dest_type": "savings_account", "dest_id": acc_b,
        "amount": "3000.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 201

    accounts = {a["id"]: a for a in (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()}
    assert accounts[acc_a]["balance"] == "7000.00"
    assert accounts[acc_b]["balance"] == "8000.00"


async def test_list_transfers(client: AsyncClient, auth_headers: dict) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Cash",
        "dest_type": "savings_account", "dest_id": acc,
        "amount": "500.00", "currency": "RUB", "date": "2026-05-25",
    })
    resp = await client.get(TRANSFERS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_create_external_to_savings_updates_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "5000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Зарплата",
        "dest_type": "savings_account", "dest_id": acc,
        "amount": "15000.00", "currency": "RUB", "date": "2026-05-24",
    })
    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "20000.00"


async def test_delete_transfer_reverts_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    create_resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "3000.00", "currency": "RUB", "date": "2026-05-24",
    })
    transfer_id = create_resp.json()["id"]
    await client.delete(f"{TRANSFERS_URL}/{transfer_id}", headers=auth_headers)

    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "10000.00"


async def test_update_transfer_changes_amount_and_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc_a = await _make_account(client, auth_headers, "10000.00")
    acc_b = await _make_account(client, auth_headers, "5000.00")
    create_resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc_a,
        "dest_type": "savings_account", "dest_id": acc_b,
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    # A=9000, B=6000
    transfer_id = create_resp.json()["id"]
    resp = await client.put(f"{TRANSFERS_URL}/{transfer_id}", headers=auth_headers, json={
        "amount": "3000.00",
    })
    # Reverts: A=10000, B=5000; Applies: A=7000, B=8000
    assert resp.status_code == 200

    accounts = {a["id"]: a for a in (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()}
    assert accounts[acc_a]["balance"] == "7000.00"
    assert accounts[acc_b]["balance"] == "8000.00"


async def test_create_with_deleted_account_returns_409(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    await client.delete(f"{ACCOUNTS_URL}/{acc}", headers=auth_headers)  # soft delete
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 409


async def test_delete_nonexistent_transfer_returns_404(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.delete(f"{TRANSFERS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_other_user_transfer_returns_404(client: AsyncClient) -> None:
    # Register two users
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

    # user_a creates a transfer (external → external, no accounts needed)
    create_resp = await client.post(TRANSFERS_URL, headers=headers_a, json={
        "source_type": "external", "source_label": "A",
        "dest_type": "external", "dest_label": "B",
        "amount": "100.00", "currency": "RUB", "date": "2026-05-24",
    })
    transfer_id = create_resp.json()["id"]

    resp = await client.delete(f"{TRANSFERS_URL}/{transfer_id}", headers=headers_b)
    assert resp.status_code == 404


async def test_create_savings_to_external_updates_source_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "8000.00")
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "2000.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 201
    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "6000.00"


async def test_create_external_to_external_no_balance_change(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "5000.00")
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Wallet",
        "dest_type": "external", "dest_label": "Savings jar",
        "amount": "500.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 201
    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "5000.00"


async def _make_deposit(client: AsyncClient, headers: dict, balance: str = "50000.00") -> str:
    resp = await client.post(DEPOSITS_URL, headers=headers, json={
        "name": "Test Deposit", "bank_name": "Bank",
        "amount": "50000.00", "interest_rate": "0.0500",
        "interest_type": "simple", "open_date": "2026-01-01",
        "close_date": "2027-01-01", "auto_renew": False, "currency": "RUB",
        "balance": balance,
    })
    return resp.json()["id"]


async def test_create_savings_to_deposit_updates_source_only(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    deposit_id = await _make_deposit(client, auth_headers)
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "deposit", "dest_id": deposit_id,
        "amount": "4000.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 201
    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "6000.00"


async def test_soft_deleted_account_transfers_remain_in_list(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    # Soft-delete the account
    await client.delete(f"{ACCOUNTS_URL}/{acc}", headers=auth_headers)
    # Transfer should still be visible
    resp = await client.get(TRANSFERS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_external_to_deposit_updates_deposit_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Зарплата",
        "dest_type": "deposit", "dest_id": dep,
        "amount": "10000.00", "currency": "RUB", "date": "2026-05-25",
    })
    assert resp.status_code == 201
    deposits = (await client.get(DEPOSITS_URL, headers=auth_headers)).json()
    assert deposits[0]["balance"] == "60000.00"


async def test_deposit_to_savings_account_updates_both_balances(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    acc = await _make_account(client, auth_headers, "10000.00")
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "deposit", "source_id": dep,
        "dest_type": "savings_account", "dest_id": acc,
        "amount": "5000.00", "currency": "RUB", "date": "2026-05-25",
    })
    assert resp.status_code == 201
    deposits = (await client.get(DEPOSITS_URL, headers=auth_headers)).json()
    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert deposits[0]["balance"] == "45000.00"
    assert accounts[0]["balance"] == "15000.00"


async def test_deposit_to_deposit_updates_both(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep_a = await _make_deposit(client, auth_headers, "30000.00")
    dep_b = await _make_deposit(client, auth_headers, "10000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "deposit", "source_id": dep_a,
        "dest_type": "deposit", "dest_id": dep_b,
        "amount": "5000.00", "currency": "RUB", "date": "2026-05-25",
    })
    deposits = {d["id"]: d for d in (await client.get(DEPOSITS_URL, headers=auth_headers)).json()}
    assert deposits[dep_a]["balance"] == "25000.00"
    assert deposits[dep_b]["balance"] == "15000.00"


async def test_deposit_to_external_updates_deposit_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "deposit", "source_id": dep,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "8000.00", "currency": "RUB", "date": "2026-05-25",
    })
    deposits = (await client.get(DEPOSITS_URL, headers=auth_headers)).json()
    assert deposits[0]["balance"] == "42000.00"


async def test_transfer_to_closed_deposit_returns_409(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    await client.request("DELETE", f"{DEPOSITS_URL}/{dep}", headers=auth_headers,
                         json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Cash",
        "dest_type": "deposit", "dest_id": dep,
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-25",
    })
    assert resp.status_code == 409


async def test_delete_transfer_reverts_deposit_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    create_resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "deposit", "source_id": dep,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "10000.00", "currency": "RUB", "date": "2026-05-25",
    })
    transfer_id = create_resp.json()["id"]
    await client.delete(f"{TRANSFERS_URL}/{transfer_id}", headers=auth_headers)
    deposits = (await client.get(DEPOSITS_URL, headers=auth_headers)).json()
    assert deposits[0]["balance"] == "50000.00"


async def test_update_transfer_updates_deposit_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    create_resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "deposit", "source_id": dep,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "5000.00", "currency": "RUB", "date": "2026-05-25",
    })
    # deposit = 45000 after create
    transfer_id = create_resp.json()["id"]
    await client.put(f"{TRANSFERS_URL}/{transfer_id}", headers=auth_headers,
                     json={"amount": "15000.00"})
    # reverts 5000 → 50000; applies 15000 → 35000
    deposits = (await client.get(DEPOSITS_URL, headers=auth_headers)).json()
    assert deposits[0]["balance"] == "35000.00"


async def test_closed_deposit_transfers_remain_in_list(
    client: AsyncClient, auth_headers: dict
) -> None:
    dep = await _make_deposit(client, auth_headers, "50000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "deposit", "source_id": dep,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-25",
    })
    await client.request("DELETE", f"{DEPOSITS_URL}/{dep}", headers=auth_headers,
                         json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    resp = await client.get(TRANSFERS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
