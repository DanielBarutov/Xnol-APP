from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class CreateTransactionRequest(BaseModel):
    category_id: UUID
    type: str  # "income" | "expense"
    amount: Decimal
    date: dt.date
    description: Optional[str] = None


class UpdateTransactionRequest(BaseModel):
    category_id: Optional[UUID] = None
    type: Optional[str] = None
    amount: Optional[Decimal] = None
    date: Optional[dt.date] = None
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    category_id: UUID
    type: str
    amount: Decimal
    date: dt.date
    description: Optional[str]
    created_at: dt.datetime
