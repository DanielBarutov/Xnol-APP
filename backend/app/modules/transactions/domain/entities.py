from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Transaction:
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str  # "income" | "expense"
    amount: Decimal
    date: date
    id: UUID = field(default_factory=uuid4)
    description: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
