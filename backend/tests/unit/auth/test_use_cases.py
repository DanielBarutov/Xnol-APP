import pytest
from app.modules.auth.application.dtos import LoginUserDTO, RegisterUserDTO
from app.modules.auth.application.use_cases import LoginUserUseCase, RegisterUserUseCase
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.shared.exceptions import AlreadyExistsError, AuthenticationError


@pytest.fixture
def repo():
    return FakeUserRepository()


@pytest.fixture
def category_repo():
    return FakeCategoryRepository()


@pytest.mark.asyncio
async def test_register_creates_user(repo, category_repo):
    result = await RegisterUserUseCase(repo, category_repo).execute(
        RegisterUserDTO(email="a@a.com", password="pass", full_name="Alice", primary_currency="RUB")
    )
    assert result.email == "a@a.com"
    assert result.id is not None


@pytest.mark.asyncio
async def test_register_duplicate_raises(repo, category_repo):
    dto = RegisterUserDTO(email="dup@a.com", password="p", full_name="D", primary_currency="RUB")
    await RegisterUserUseCase(repo, category_repo).execute(dto)
    with pytest.raises(AlreadyExistsError):
        await RegisterUserUseCase(repo, category_repo).execute(dto)


@pytest.mark.asyncio
async def test_login_returns_tokens(repo, category_repo):
    await RegisterUserUseCase(repo, category_repo).execute(
        RegisterUserDTO(email="u@u.com", password="correct", full_name="U", primary_currency="RUB")
    )
    tokens = await LoginUserUseCase(repo).execute(
        LoginUserDTO(email="u@u.com", password="correct")
    )
    assert tokens.access_token
    assert tokens.refresh_token
    assert tokens.token_type == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_raises(repo, category_repo):
    await RegisterUserUseCase(repo, category_repo).execute(
        RegisterUserDTO(email="x@x.com", password="right", full_name="X", primary_currency="RUB")
    )
    with pytest.raises(AuthenticationError):
        await LoginUserUseCase(repo).execute(LoginUserDTO(email="x@x.com", password="wrong"))


@pytest.mark.asyncio
async def test_login_unknown_email_raises(repo):
    with pytest.raises(AuthenticationError):
        await LoginUserUseCase(repo).execute(
            LoginUserDTO(email="nobody@x.com", password="pass")
        )
