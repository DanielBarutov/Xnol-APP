import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base

_interest_type_enum = Enum("simple", "compound", name="deposit_interest_type_enum")
_status_enum = Enum("active", "closed", "early_closed", name="deposit_status_enum")


class DepositModel(Base):
    __tablename__ = "deposits"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    bank_name: Mapped[str] = mapped_column(String(100))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    interest_type: Mapped[str] = mapped_column(_interest_type_enum)
    open_date: Mapped[date] = mapped_column(Date)
    close_date: Mapped[date] = mapped_column(Date)
    early_closure_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean)
    currency: Mapped[str] = mapped_column(String(3))
    balance: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    status: Mapped[str] = mapped_column(_status_enum)
    actual_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
