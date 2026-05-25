from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class DepositDTO:
    id: UUID
    user_id: UUID
    name: str
    bank_name: str
    amount: Decimal
    interest_rate: Decimal
    interest_type: str
    open_date: date
    close_date: date
    early_closure_rate: Decimal | None
    auto_renew: bool
    currency: str
    balance: Decimal
    status: str
    actual_close_date: date | None
    created_at: datetime


@dataclass
class CreateDepositDTO:
    user_id: UUID
    name: str
    bank_name: str
    amount: Decimal
    interest_rate: Decimal
    interest_type: str
    open_date: date
    close_date: date
    currency: str
    balance: Decimal
    auto_renew: bool
    early_closure_rate: Decimal | None = None


@dataclass
class UpdateDepositDTO:
    deposit_id: UUID
    user_id: UUID
    name: str | None = None
    bank_name: str | None = None
    amount: Decimal | None = None
    interest_rate: Decimal | None = None
    interest_type: str | None = None
    open_date: date | None = None
    close_date: date | None = None
    early_closure_rate: Decimal | None = None
    auto_renew: bool | None = None
    balance: Decimal | None = None


@dataclass
class CloseDepositDTO:
    deposit_id: UUID
    user_id: UUID
    close_type: str  # "closed" | "early_closed"
    actual_close_date: date
