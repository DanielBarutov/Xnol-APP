from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass
class RawCategoryRow:
    category_id: UUID
    category_name: str
    type: str  # "income" | "expense"
    amount: Decimal


@dataclass
class RawTimelineRow:
    period: str  # "2026-05" for month, "2026-05-25" for day
    type: str    # "income" | "expense"
    amount: Decimal


@dataclass
class RawAccountRow:
    account_id: UUID
    account_name: str
    type: str    # "income" | "expense"
    amount: Decimal
