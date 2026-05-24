from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class TransferDTO:
    id: UUID
    user_id: UUID
    source_type: str
    source_id: UUID | None
    source_label: str | None
    dest_type: str
    dest_id: UUID | None
    dest_label: str | None
    amount: Decimal
    currency: str
    date: date
    description: str | None
    created_at: datetime


@dataclass
class CreateTransferDTO:
    user_id: UUID
    source_type: str
    dest_type: str
    amount: Decimal
    currency: str
    date: date
    source_id: UUID | None = None
    source_label: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    description: str | None = None


@dataclass
class UpdateTransferDTO:
    transfer_id: UUID
    user_id: UUID
    source_type: str | None = None
    source_id: UUID | None = None
    source_label: str | None = None
    dest_type: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    date: date | None = None
    description: str | None = None
