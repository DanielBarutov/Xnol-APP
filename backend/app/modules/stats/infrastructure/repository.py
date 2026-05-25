from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.infrastructure.models import AccountModel
from app.modules.categories.infrastructure.models import CategoryModel
from app.modules.stats.domain.entities import RawAccountRow, RawCategoryRow, RawTimelineRow
from app.modules.stats.domain.interfaces import IStatsRepository
from app.modules.transactions.infrastructure.models import TransactionModel


class SQLAlchemyStatsRepository(IStatsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_category_rows(
        self, user_id: UUID, date_from: date, date_to: date
    ) -> list[RawCategoryRow]:
        result = await self._session.execute(
            select(
                TransactionModel.category_id,
                CategoryModel.name,
                TransactionModel.type,
                func.sum(TransactionModel.amount).label("total"),
            )
            # Intentionally includes soft-deleted categories: past transactions retain their category data.
            .join(CategoryModel, TransactionModel.category_id == CategoryModel.id)
            .where(
                TransactionModel.user_id == user_id,
                TransactionModel.date >= date_from,
                TransactionModel.date <= date_to,
            )
            .group_by(TransactionModel.category_id, CategoryModel.name, TransactionModel.type)
        )
        return [
            RawCategoryRow(
                category_id=row.category_id,
                category_name=row.name,
                type=row.type,
                amount=row.total,
            )
            for row in result.all()
        ]

    async def get_timeline_rows(
        self, user_id: UUID, date_from: date, date_to: date, granularity: str
    ) -> list[RawTimelineRow]:
        trunc = "month" if granularity == "month" else "day"
        fmt = "%Y-%m" if granularity == "month" else "%Y-%m-%d"
        period_expr = func.date_trunc(trunc, TransactionModel.date).label("period")
        result = await self._session.execute(
            select(
                period_expr,
                TransactionModel.type,
                func.sum(TransactionModel.amount).label("total"),
            )
            .where(
                TransactionModel.user_id == user_id,
                TransactionModel.date >= date_from,
                TransactionModel.date <= date_to,
            )
            .group_by(period_expr, TransactionModel.type)
            .order_by(period_expr)
        )
        return [
            RawTimelineRow(period=row.period.strftime(fmt), type=row.type, amount=row.total)
            for row in result.all()
        ]

    async def get_account_rows(
        self, user_id: UUID, date_from: date, date_to: date
    ) -> list[RawAccountRow]:
        result = await self._session.execute(
            select(
                TransactionModel.account_id,
                AccountModel.name,
                TransactionModel.type,
                func.sum(TransactionModel.amount).label("total"),
            )
            .join(AccountModel, TransactionModel.account_id == AccountModel.id)
            .where(
                TransactionModel.user_id == user_id,
                TransactionModel.date >= date_from,
                TransactionModel.date <= date_to,
                AccountModel.deleted_at.is_(None),
            )
            .group_by(TransactionModel.account_id, AccountModel.name, TransactionModel.type)
        )
        return [
            RawAccountRow(
                account_id=row.account_id,
                account_name=row.name,
                type=row.type,
                amount=row.total,
            )
            for row in result.all()
        ]
