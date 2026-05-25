from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class TransactionDTO:
    id: UUID
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str
    amount: Decimal
    date: date
    created_at: datetime
    description: str | None = None


@dataclass
class CreateTransactionDTO:
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str
    amount: Decimal
    date: date
    description: str | None = None


@dataclass
class UpdateTransactionDTO:
    transaction_id: UUID
    user_id: UUID
    account_id: UUID | None = None
    category_id: UUID | None = None
    type: str | None = None
    amount: Decimal | None = None
    date: date | None = None
    description: str | None = None
