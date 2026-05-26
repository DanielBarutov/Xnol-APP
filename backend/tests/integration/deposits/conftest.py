import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.dependencies import get_deposit_repository, get_user_repository, get_category_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.deposits.infrastructure.fake_repository import FakeDepositRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository


@pytest.fixture
def fake_deposit_repo():
    return FakeDepositRepository()


@pytest.fixture
async def client(fake_deposit_repo):
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_deposit_repository] = lambda: fake_deposit_repo
    app.dependency_overrides[get_category_repository] = lambda: FakeCategoryRepository()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "deposit@example.com", "password": "pass1234",
        "full_name": "Deposit User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "deposit@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
