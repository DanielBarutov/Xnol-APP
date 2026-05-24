from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Transfer:
    user_id: UUID
    source_type: str  # "savings_account" | "deposit" | "external"
    dest_type: str
    amount: Decimal
    currency: str
    date: date
    id: UUID = field(default_factory=uuid4)
    source_id: UUID | None = None
    source_label: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    description: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
