from app.modules.auth.application.dtos import (
    LoginUserDTO,
    RegisterUserDTO,
    TokenPairDTO,
    UserDTO,
)
from app.modules.auth.application.services import JWTService, PasswordHasher
from app.modules.auth.domain.entities import User
from app.modules.auth.domain.interfaces import IUserRepository
from app.shared.exceptions import AlreadyExistsError, AuthenticationError


class RegisterUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

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
