from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user_id, get_user_repository
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.auth.presentation.schemas import ThemePatchRequest, ThemeResponse

users_router = APIRouter(prefix="/api/v1/users", tags=["users"])


@users_router.get("/me/theme", response_model=ThemeResponse)
async def get_theme(
    user_id: UUID = Depends(get_current_user_id),
    repo: IUserRepository = Depends(get_user_repository),
) -> ThemeResponse:
    user = await repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return ThemeResponse(theme_mode=user.theme_mode, theme_color=user.theme_color)


@users_router.patch("/me/theme", response_model=ThemeResponse)
async def patch_theme(
    body: ThemePatchRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IUserRepository = Depends(get_user_repository),
) -> ThemeResponse:
    user = await repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.theme_mode is not None:
        user.theme_mode = body.theme_mode
    if body.theme_color is not None:
        user.theme_color = body.theme_color
    updated = await repo.update(user)
    return ThemeResponse(theme_mode=updated.theme_mode, theme_color=updated.theme_color)
