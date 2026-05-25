from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel

TransactionType = Literal["income", "expense"]


class CreateTransactionRequest(BaseModel):
    account_id: UUID
    category_id: UUID
    type: TransactionType
    amount: Decimal
    date: date
    description: str | None = None


class UpdateTransactionRequest(BaseModel):
    account_id: UUID | None = None
    category_id: UUID | None = None
    type: TransactionType | None = None
    amount: Decimal | None = None
    # Optional[date] required here: Pydantic v2 puts field defaults into localns
    # during annotation evaluation, so `date = None` would shadow the `date` type
    # making `date | None` fail. Optional[date] resolves via globalns where
    # `date` is still the type.
    date: Optional[date] = None
    description: str | None = None


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: TransactionType
    amount: Decimal
    date: date
    description: str | None
    created_at: datetime
