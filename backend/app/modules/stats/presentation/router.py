import calendar
from datetime import date, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_current_user_id, get_stats_repository
from app.modules.stats.application.use_cases import (
    GetAccountStatsUseCase,
    GetCategoryStatsUseCase,
    GetTimelineUseCase,
)
from app.modules.stats.domain.interfaces import IStatsRepository
from app.modules.stats.presentation.schemas import (
    AccountStatResponse,
    AccountStatsResponse,
    CategoryStatResponse,
    CategoryStatsResponse,
    TimelinePeriodResponse,
    TimelineResponse,
)

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


def resolve_period(
    period: Annotated[str | None, Query(pattern="^(this_month|prev_month|this_year)$")] = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[date, date]:
    today = date.today()
    if period is not None and (date_from is not None or date_to is not None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot use period together with date_from/date_to",
        )
    if (date_from is None) != (date_to is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Must specify both date_from and date_to or neither",
        )
    if date_from is not None and date_to is not None:
        if date_from > date_to:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_from must be <= date_to",
            )
        return date_from, date_to
    target = period or "this_month"
    if target == "this_month":
        first = date(today.year, today.month, 1)
        last = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
        return first, last
    elif target == "prev_month":
        last_prev = date(today.year, today.month, 1) - timedelta(days=1)
        return date(last_prev.year, last_prev.month, 1), last_prev
    else:  # this_year
        return date(today.year, 1, 1), date(today.year, 12, 31)


@router.get("/categories", response_model=CategoryStatsResponse)
async def get_category_stats(
    user_id: UUID = Depends(get_current_user_id),
    repo: IStatsRepository = Depends(get_stats_repository),
    period_range: tuple[date, date] = Depends(resolve_period),
) -> CategoryStatsResponse:
    date_from, date_to = period_range
    dto = await GetCategoryStatsUseCase(repo).execute(user_id, date_from, date_to)
    return CategoryStatsResponse(
        date_from=dto.date_from,
        date_to=dto.date_to,
        total_income=dto.total_income,
        total_expense=dto.total_expense,
        net=dto.net,
        income_by_category=[
            CategoryStatResponse(category_id=c.category_id, category_name=c.category_name, amount=c.amount)
            for c in dto.income_by_category
        ],
        expense_by_category=[
            CategoryStatResponse(category_id=c.category_id, category_name=c.category_name, amount=c.amount)
            for c in dto.expense_by_category
        ],
    )


@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline(
    granularity: Literal["month", "day"] = Query("month"),
    user_id: UUID = Depends(get_current_user_id),
    repo: IStatsRepository = Depends(get_stats_repository),
    period_range: tuple[date, date] = Depends(resolve_period),
) -> TimelineResponse:
    date_from, date_to = period_range
    dto = await GetTimelineUseCase(repo).execute(user_id, date_from, date_to, granularity)
    return TimelineResponse(
        date_from=dto.date_from,
        date_to=dto.date_to,
        granularity=dto.granularity,
        periods=[
            TimelinePeriodResponse(period=p.period, income=p.income, expense=p.expense, net=p.net)
            for p in dto.periods
        ],
    )


@router.get("/accounts", response_model=AccountStatsResponse)
async def get_account_stats(
    user_id: UUID = Depends(get_current_user_id),
    repo: IStatsRepository = Depends(get_stats_repository),
    period_range: tuple[date, date] = Depends(resolve_period),
) -> AccountStatsResponse:
    date_from, date_to = period_range
    dto = await GetAccountStatsUseCase(repo).execute(user_id, date_from, date_to)
    return AccountStatsResponse(
        date_from=dto.date_from,
        date_to=dto.date_to,
        accounts=[
            AccountStatResponse(
                account_id=a.account_id,
                account_name=a.account_name,
                income=a.income,
                expense=a.expense,
                net=a.net,
            )
            for a in dto.accounts
        ],
    )
