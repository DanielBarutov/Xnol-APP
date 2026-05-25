from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid4


@dataclass
class Deposit:
    user_id: UUID
    name: str
    bank_name: str
    amount: Decimal
    interest_rate: Decimal
    interest_type: Literal["simple", "compound"]
    open_date: date
    close_date: date
    currency: str
    balance: Decimal
    auto_renew: bool
    id: UUID = field(default_factory=uuid4)
    early_closure_rate: Decimal | None = None
    status: Literal["active", "closed", "early_closed"] = "active"
    actual_close_date: date | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
