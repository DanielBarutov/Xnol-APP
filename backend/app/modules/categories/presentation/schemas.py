from uuid import UUID
from pydantic import BaseModel


class CreateCategoryRequest(BaseModel):
    name: str
    type: str  # "income" | "expense"
    icon: str
    color: str
    parent_id: UUID | None = None


class UpdateCategoryRequest(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    parent_id: UUID | None
    name: str
    type: str
    icon: str
    color: str
    is_system: bool
    children: list["CategoryResponse"] = []

    model_config = {"from_attributes": True}
