from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CreateDepositRequest(BaseModel):
    name: str
    bank_name: str
    amount: Decimal
    interest_rate: Decimal
    interest_type: str  # "simple" | "compound"
    open_date: date
    close_date: date
    currency: str
    auto_renew: bool
    early_closure_rate: Decimal | None = None
    balance: Decimal | None = None  # defaults to amount if omitted


class UpdateDepositRequest(BaseModel):
    name: str | None = None
    bank_name: str | None = None
    amount: Decimal | None = None
    interest_rate: Decimal | None = None
    interest_type: str | None = None
    open_date: Optional[date] = None
    close_date: Optional[date] = None
    early_closure_rate: Decimal | None = None
    auto_renew: bool | None = None
    balance: Decimal | None = None


class CloseDepositRequest(BaseModel):
    close_type: str  # "closed" | "early_closed"
    actual_close_date: date


class DepositResponse(BaseModel):
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
