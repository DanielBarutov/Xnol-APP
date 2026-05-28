import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.dependencies import get_user_repository, get_category_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository


@pytest.fixture
def fake_category_repo() -> FakeCategoryRepository:
    return FakeCategoryRepository()


@pytest.fixture
async def client(fake_category_repo: FakeCategoryRepository) -> AsyncClient:
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_category_repository] = lambda: fake_category_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    await client.post("/api/v1/auth/register", json={
        "email": "theme@example.com", "password": "pass1234",
        "full_name": "Theme User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "theme@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
