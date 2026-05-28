from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class CreateAccountRequest(BaseModel):
    id: UUID | None = None
    name: str
    bank_name: str
    currency: str
    balance: Decimal


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    bank_name: str | None = None
    balance: Decimal | None = None


class AccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    bank_name: str
    balance: Decimal
    currency: str
    created_at: datetime
