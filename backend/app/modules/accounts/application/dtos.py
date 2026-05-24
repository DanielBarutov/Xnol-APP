from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class AccountDTO:
    id: UUID
    user_id: UUID
    name: str
    bank_name: str
    balance: Decimal
    currency: str
    created_at: datetime


@dataclass
class CreateAccountDTO:
    user_id: UUID
    name: str
    bank_name: str
    currency: str
    balance: Decimal


@dataclass
class UpdateAccountDTO:
    account_id: UUID
    user_id: UUID
    name: str | None = None
    bank_name: str | None = None
    balance: Decimal | None = None
