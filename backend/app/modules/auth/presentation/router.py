from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user_id, get_user_repository
from app.modules.auth.application.dtos import LoginUserDTO, RegisterUserDTO
from app.modules.auth.application.services import JWTService
from app.modules.auth.application.use_cases import LoginUserUseCase, RegisterUserUseCase
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.auth.presentation.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.shared.exceptions import AlreadyExistsError, AuthenticationError

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    repo: IUserRepository = Depends(get_user_repository),
) -> UserResponse:
    try:
        dto = await RegisterUserUseCase(repo).execute(
            RegisterUserDTO(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
                primary_currency=body.primary_currency,
            )
        )
    except AlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    return UserResponse(
        id=dto.id,
        email=dto.email,
        full_name=dto.full_name,
        primary_currency=dto.primary_currency,
        is_active=dto.is_active,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    repo: IUserRepository = Depends(get_user_repository),
) -> TokenResponse:
    try:
        tokens = await LoginUserUseCase(repo).execute(
            LoginUserDTO(email=body.email, password=body.password)
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    repo: IUserRepository = Depends(get_user_repository),
) -> TokenResponse:
    try:
        payload = JWTService.decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc
    user = await repo.find_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return TokenResponse(
        access_token=JWTService.create_access_token(user_id),
        refresh_token=JWTService.create_refresh_token(user_id),
    )


@router.get("/me", response_model=UserResponse)
async def me(
    user_id: UUID = Depends(get_current_user_id),
    repo: IUserRepository = Depends(get_user_repository),
) -> UserResponse:
    user = await repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        primary_currency=user.primary_currency,
        is_active=user.is_active,
    )
