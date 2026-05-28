from uuid import uuid4
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"

VALID_PAYLOAD = {
    "name": "Сбербанк основной",
    "bank_name": "Сбербанк",
    "currency": "RUB",
    "balance": "50000.00",
}


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(ACCOUNTS_URL)
    assert resp.status_code == 403


async def test_create_account_returns_201(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Сбербанк основной"
    assert data["balance"] == "50000.00"
    assert data["currency"] == "RUB"
    assert "id" in data


async def test_list_accounts(client: AsyncClient, auth_headers: dict) -> None:
    await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    await client.post(ACCOUNTS_URL, headers=auth_headers, json={**VALID_PAYLOAD, "name": "Тинькофф"})
    resp = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_update_account(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]
    resp = await client.put(f"{ACCOUNTS_URL}/{account_id}", headers=auth_headers, json={"name": "Новое имя"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Новое имя"
    assert resp.json()["currency"] == "RUB"  # immutable


async def test_delete_account_returns_204(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]
    resp = await client.delete(f"{ACCOUNTS_URL}/{account_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_deleted_account_gone_from_list(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]
    await client.delete(f"{ACCOUNTS_URL}/{account_id}", headers=auth_headers)
    resp = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert all(a["id"] != account_id for a in resp.json())


async def test_delete_nonexistent_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.delete(f"{ACCOUNTS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_other_user_account_returns_404(client: AsyncClient) -> None:
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

    create_resp = await client.post(ACCOUNTS_URL, headers=headers_a, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]

    resp = await client.delete(f"{ACCOUNTS_URL}/{account_id}", headers=headers_b)
    assert resp.status_code == 404


async def test_create_account_with_client_id(client: AsyncClient, auth_headers: dict) -> None:
    client_id = str(uuid4())
    resp = await client.post(
        ACCOUNTS_URL,
        headers=auth_headers,
        json={**VALID_PAYLOAD, "id": client_id},
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == client_id
