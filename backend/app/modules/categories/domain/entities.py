from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


@dataclass
class Category:
    name: str
    type: str  # "income" | "expense"
    icon: str
    color: str
    id: UUID = field(default_factory=uuid4)
    user_id: UUID | None = None
    parent_id: UUID | None = None
    is_system: bool = False
    deleted_at: datetime | None = None
