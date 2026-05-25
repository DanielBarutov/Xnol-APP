import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_transaction_repository,
    get_user_repository,
)
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository


@pytest.fixture
def fake_account_repo():
    return FakeAccountRepository()


@pytest.fixture
def fake_category_repo():
    return FakeCategoryRepository()


@pytest.fixture
def fake_transaction_repo():
    return FakeTransactionRepository()


@pytest.fixture
async def client(fake_account_repo, fake_category_repo, fake_transaction_repo):
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    app.dependency_overrides[get_category_repository] = lambda: fake_category_repo
    app.dependency_overrides[get_transaction_repository] = lambda: fake_transaction_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "txn@example.com", "password": "pass1234",
        "full_name": "Txn User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "txn@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
