from dataclasses import dataclass, field
from app.shared.base_entity import BaseEntity


@dataclass
class User(BaseEntity):
    email: str = ""
    full_name: str = ""
    primary_currency: str = "RUB"
    password_hash: str | None = None
    is_active: bool = True
    theme_mode: str = "dark"
    theme_color: str = "violet"
