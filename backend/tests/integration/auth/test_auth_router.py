from httpx import AsyncClient

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
ME_URL = "/api/v1/auth/me"
REFRESH_URL = "/api/v1/auth/refresh"

VALID_PAYLOAD = {
    "email": "user@example.com",
    "password": "secret123",
    "full_name": "Test User",
    "primary_currency": "USD",
}


async def test_register_returns_201(client: AsyncClient) -> None:
    response = await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == VALID_PAYLOAD["email"]
    assert "id" in body
    assert body["is_active"] is True


async def test_register_duplicate_returns_409(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    response = await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert response.status_code == 409


async def test_login_returns_tokens(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    response = await client.post(
        LOGIN_URL,
        json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    response = await client.post(
        LOGIN_URL,
        json={"email": VALID_PAYLOAD["email"], "password": "wrongpassword"},
    )
    assert response.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    # 403 is intentional: FastAPI's HTTPBearer returns 403 (not 401) when no Authorization header is provided
    response = await client.get(ME_URL)
    assert response.status_code == 403


async def test_me_returns_current_user(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    login_response = await client.post(
        LOGIN_URL,
        json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]},
    )
    access_token = login_response.json()["access_token"]
    response = await client.get(ME_URL, headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code == 200
    assert response.json()["email"] == VALID_PAYLOAD["email"]


async def test_refresh_returns_new_tokens(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    login_response = await client.post(
        LOGIN_URL,
        json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]},
    )
    refresh_token = login_response.json()["refresh_token"]
    response = await client.post(REFRESH_URL, json={"refresh_token": refresh_token})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"
