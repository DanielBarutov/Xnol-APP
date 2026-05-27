import uuid
from app.modules.auth.application.dtos import (
    LoginUserDTO,
    RegisterUserDTO,
    TokenPairDTO,
    UserDTO,
)
from app.modules.auth.application.services import JWTService, PasswordHasher
from app.modules.auth.domain.entities import User
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.shared.exceptions import AlreadyExistsError, AuthenticationError

_DEFAULT_CATEGORIES = [
    ("Еда",            "expense", "Utensils",         "#f97316"),
    ("Транспорт",      "expense", "Car",               "#3b82f6"),
    ("Жильё",          "expense", "Home",              "#8b5cf6"),
    ("Здоровье",       "expense", "HeartPulse",        "#ef4444"),
    ("Развлечения",    "expense", "Gamepad2",          "#ec4899"),
    ("Одежда",         "expense", "Shirt",             "#f59e0b"),
    ("Образование",    "expense", "GraduationCap",     "#06b6d4"),
    ("Прочие расходы", "expense", "CircleEllipsis",    "#6b7280"),
    ("Зарплата",       "income",  "Briefcase",         "#22c55e"),
    ("Фриланс",        "income",  "Laptop",            "#10b981"),
    ("Инвестиции",     "income",  "TrendingUp",        "#14b8a6"),
    ("Прочие доходы",  "income",  "PlusCircle",        "#6b7280"),
]


async def _create_default_categories(user_id: uuid.UUID, repo: ICategoryRepository) -> None:
    for name, type_, icon, color in _DEFAULT_CATEGORIES:
        await repo.create(Category(
            user_id=user_id,
            parent_id=None,
            name=name,
            type=type_,
            icon=icon,
            color=color,
            is_system=True,
        ))


class RegisterUserUseCase:
    def __init__(self, user_repo: IUserRepository, category_repo: ICategoryRepository) -> None:
        self._repo = user_repo
        self._category_repo = category_repo

    async def execute(self, dto: RegisterUserDTO) -> UserDTO:
        email = dto.email.lower().strip()
        if await self._repo.find_by_email(email):
            raise AlreadyExistsError("User", email)
        user = User(
            email=email,
            full_name=dto.full_name,
            primary_currency=dto.primary_currency,
            password_hash=PasswordHasher.hash(dto.password),
        )
        saved = await self._repo.create(user)
        await _create_default_categories(saved.id, self._category_repo)
        return UserDTO(
            id=saved.id,
            email=saved.email,
            full_name=saved.full_name,
            primary_currency=saved.primary_currency,
            is_active=saved.is_active,
        )


class LoginUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

    async def execute(self, dto: LoginUserDTO) -> TokenPairDTO:
        user = await self._repo.find_by_email(dto.email.lower().strip())
        if not user or not user.password_hash:
            raise AuthenticationError()
        if not PasswordHasher.verify(dto.password, user.password_hash):
            raise AuthenticationError()
        return TokenPairDTO(
            access_token=JWTService.create_access_token(user.id),
            refresh_token=JWTService.create_refresh_token(user.id),
        )
