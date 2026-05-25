from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class CreateTransferRequest(BaseModel):
    source_type: str  # "savings_account" | "deposit" | "external"
    source_id: UUID | None = None
    source_label: str | None = None
    dest_type: str
    dest_id: UUID | None = None
    dest_label: str | None = None
    amount: Decimal
    currency: str
    date: dt.date
    description: str | None = None

    @model_validator(mode="after")
    def validate_ids(self) -> CreateTransferRequest:
        if self.source_type in ("savings_account", "deposit") and self.source_id is None:
            raise ValueError(f"source_id is required when source_type is {self.source_type}")
        if self.dest_type in ("savings_account", "deposit") and self.dest_id is None:
            raise ValueError(f"dest_id is required when dest_type is {self.dest_type}")
        return self


class UpdateTransferRequest(BaseModel):
    source_type: str | None = None
    source_id: UUID | None = None
    source_label: str | None = None
    dest_type: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    date: Optional[dt.date] = None  # Optional[date] avoids field-name shadowing in Pydantic v2
    description: str | None = None

    @model_validator(mode="after")
    def validate_ids(self) -> UpdateTransferRequest:
        if self.source_type in ("savings_account", "deposit") and self.source_id is None:
            raise ValueError(f"source_id is required when source_type is {self.source_type}")
        if self.dest_type in ("savings_account", "deposit") and self.dest_id is None:
            raise ValueError(f"dest_id is required when dest_type is {self.dest_type}")
        return self


class TransferResponse(BaseModel):
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
    date: dt.date
    description: str | None
    created_at: dt.datetime
