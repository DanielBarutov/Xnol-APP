from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Account:
    user_id: UUID
    name: str
    bank_name: str
    currency: str
    balance: Decimal
    id: UUID = field(default_factory=uuid4)
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
