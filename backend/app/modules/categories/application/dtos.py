from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class CategoryDTO:
    id: UUID
    user_id: UUID | None
    parent_id: UUID | None
    name: str
    type: str
    icon: str
    color: str
    is_system: bool
    children: list["CategoryDTO"] = field(default_factory=list)


@dataclass
class CreateCategoryDTO:
    user_id: UUID
    name: str
    type: str
    icon: str
    color: str
    parent_id: UUID | None = None


@dataclass
class UpdateCategoryDTO:
    category_id: UUID
    user_id: UUID
    name: str | None = None
    icon: str | None = None
    color: str | None = None
