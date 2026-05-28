import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_idempotency_repository,
    get_transaction_repository,
    get_transfer_repository,
    get_user_repository,
)
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository
from app.modules.idempotency.infrastructure.fake_repository import FakeIdempotencyRepository


@pytest.fixture
def fake_idempotency_repo():
    return FakeIdempotencyRepository()


@pytest.fixture
async def client(fake_idempotency_repo):
    fresh_user_repo = FakeUserRepository()
    fake_account_repo = FakeAccountRepository()
    fake_category_repo = FakeCategoryRepository()
    fake_transaction_repo = FakeTransactionRepository()
    fake_transfer_repo = FakeTransferRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    app.dependency_overrides[get_category_repository] = lambda: fake_category_repo
    app.dependency_overrides[get_transaction_repository] = lambda: fake_transaction_repo
    app.dependency_overrides[get_transfer_repository] = lambda: fake_transfer_repo
    app.dependency_overrides[get_idempotency_repository] = lambda: fake_idempotency_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "idem@example.com", "password": "pass1234",
        "full_name": "Idem User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "idem@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
