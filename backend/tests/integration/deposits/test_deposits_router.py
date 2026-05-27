from uuid import uuid4
from httpx import AsyncClient

DEPOSITS_URL = "/api/v1/deposits"

VALID_PAYLOAD = {
    "name": "Вклад Сохраняй",
    "bank_name": "Сбербанк",
    "amount": "100000.00",
    "interest_rate": "0.1400",
    "interest_type": "compound",
    "open_date": "2026-01-01",
    "close_date": "2026-07-01",
    "early_closure_rate": "0.0300",
    "auto_renew": False,
    "currency": "RUB",
}


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(DEPOSITS_URL)
    assert resp.status_code == 403


async def test_create_deposit_returns_201(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Вклад Сохраняй"
    assert data["status"] == "active"
    assert data["balance"] == "100000.00"  # defaults to amount
    assert data["actual_close_date"] is None


async def test_create_with_explicit_balance(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(DEPOSITS_URL, headers=auth_headers,
                             json={**VALID_PAYLOAD, "balance": "107000.00"})
    assert resp.status_code == 201
    assert resp.json()["balance"] == "107000.00"


async def test_list_deposits(client: AsyncClient, auth_headers: dict) -> None:
    await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    await client.post(DEPOSITS_URL, headers=auth_headers, json={**VALID_PAYLOAD, "name": "Второй"})
    resp = await client.get(DEPOSITS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_update_deposit(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    resp = await client.put(f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                            json={"name": "Новое имя", "balance": "110000.00"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Новое имя"
    assert resp.json()["balance"] == "110000.00"
    assert resp.json()["currency"] == "RUB"  # immutable


async def test_close_deposit_returns_204(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    resp = await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                                json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    assert resp.status_code == 204


async def test_closed_deposit_gone_from_list(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                         json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    resp = await client.get(DEPOSITS_URL, headers=auth_headers)
    assert all(d["id"] != deposit_id for d in resp.json())


async def test_early_closed_deposit_gone_from_list(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                         json={"close_type": "early_closed", "actual_close_date": "2026-04-01"})
    resp = await client.get(DEPOSITS_URL, headers=auth_headers)
    assert all(d["id"] != deposit_id for d in resp.json())


async def test_close_already_closed_returns_409(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                         json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    resp = await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                                json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    assert resp.status_code == 409


async def test_update_closed_deposit_returns_409(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                         json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    resp = await client.put(f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers,
                            json={"name": "X"})
    assert resp.status_code == 409


async def test_close_nonexistent_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.request("DELETE", f"{DEPOSITS_URL}/{uuid4()}", headers=auth_headers,
                                json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    assert resp.status_code == 404


async def test_get_deposit_by_id_returns_200(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    resp = await client.get(f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == deposit_id
    assert resp.json()["name"] == VALID_PAYLOAD["name"]


async def test_get_deposit_not_found_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get(f"{DEPOSITS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_get_deposit_wrong_user_returns_404(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json={
        "email": "get_u_a@example.com", "password": "pass1234",
        "full_name": "A", "primary_currency": "RUB",
    })
    resp_a = await client.post("/api/v1/auth/login", json={"email": "get_u_a@example.com", "password": "pass1234"})
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}

    await client.post("/api/v1/auth/register", json={
        "email": "get_u_b@example.com", "password": "pass1234",
        "full_name": "B", "primary_currency": "RUB",
    })
    resp_b = await client.post("/api/v1/auth/login", json={"email": "get_u_b@example.com", "password": "pass1234"})
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}

    create_resp = await client.post(DEPOSITS_URL, headers=headers_a, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]

    resp = await client.get(f"{DEPOSITS_URL}/{deposit_id}", headers=headers_b)
    assert resp.status_code == 404


async def test_close_other_user_deposit_returns_404(client: AsyncClient) -> None:
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

    create_resp = await client.post(DEPOSITS_URL, headers=headers_a, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]

    resp = await client.request("DELETE", f"{DEPOSITS_URL}/{deposit_id}", headers=headers_b,
                                json={"close_type": "closed", "actual_close_date": "2026-07-01"})
    assert resp.status_code == 404
