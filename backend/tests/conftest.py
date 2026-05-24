import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.dependencies import get_user_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository


@pytest.fixture
async def client() -> AsyncClient:
    fresh_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_repo
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
