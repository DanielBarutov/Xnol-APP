from dataclasses import dataclass
from uuid import UUID


@dataclass
class RegisterUserDTO:
    email: str
    password: str
    full_name: str
    primary_currency: str = "RUB"


@dataclass
class LoginUserDTO:
    email: str
    password: str


@dataclass
class TokenPairDTO:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@dataclass
class UserDTO:
    id: UUID
    email: str
    full_name: str
    primary_currency: str
    is_active: bool
