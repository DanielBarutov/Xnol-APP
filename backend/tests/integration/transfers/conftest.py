import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.dependencies import get_account_repository, get_deposit_repository, get_transfer_repository, get_user_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.deposits.infrastructure.fake_repository import FakeDepositRepository
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository


@pytest.fixture
def fake_account_repo():
    return FakeAccountRepository()


@pytest.fixture
def fake_deposit_repo():
    return FakeDepositRepository()


@pytest.fixture
def fake_transfer_repo():
    return FakeTransferRepository()


@pytest.fixture
async def client(fake_account_repo, fake_deposit_repo, fake_transfer_repo):
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    app.dependency_overrides[get_deposit_repository] = lambda: fake_deposit_repo
    app.dependency_overrides[get_transfer_repository] = lambda: fake_transfer_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "transfer@example.com", "password": "pass1234",
        "full_name": "Transfer User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "transfer@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
