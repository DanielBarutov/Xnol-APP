from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class CategoryStatResponse(BaseModel):
    category_id: UUID
    category_name: str
    amount: Decimal


class CategoryStatsResponse(BaseModel):
    date_from: date
    date_to: date
    total_income: Decimal
    total_expense: Decimal
    net: Decimal
    income_by_category: list[CategoryStatResponse]
    expense_by_category: list[CategoryStatResponse]


class TimelinePeriodResponse(BaseModel):
    period: str
    income: Decimal
    expense: Decimal
    net: Decimal


class TimelineResponse(BaseModel):
    date_from: date
    date_to: date
    granularity: str
    periods: list[TimelinePeriodResponse]


class AccountStatResponse(BaseModel):
    account_id: UUID
    account_name: str
    income: Decimal
    expense: Decimal
    net: Decimal


class AccountStatsResponse(BaseModel):
    date_from: date
    date_to: date
    accounts: list[AccountStatResponse]
