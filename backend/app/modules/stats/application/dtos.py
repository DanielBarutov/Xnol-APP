from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID


@dataclass
class CategoryStatDTO:
    category_id: UUID
    category_name: str
    amount: Decimal


@dataclass
class CategoryStatsDTO:
    date_from: date
    date_to: date
    total_income: Decimal
    total_expense: Decimal
    net: Decimal
    income_by_category: list[CategoryStatDTO]
    expense_by_category: list[CategoryStatDTO]


@dataclass
class TimelinePeriodDTO:
    period: str
    income: Decimal
    expense: Decimal
    net: Decimal


@dataclass
class TimelineDTO:
    date_from: date
    date_to: date
    granularity: str
    periods: list[TimelinePeriodDTO]


@dataclass
class AccountStatDTO:
    account_id: UUID
    account_name: str
    income: Decimal
    expense: Decimal
    net: Decimal


@dataclass
class AccountStatsDTO:
    date_from: date
    date_to: date
    accounts: list[AccountStatDTO]
