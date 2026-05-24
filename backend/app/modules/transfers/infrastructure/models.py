from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base

_endpoint_enum = Enum(
    "savings_account", "deposit", "external",
    name="transfer_endpoint_enum",
)


class TransferModel(Base):
    __tablename__ = "transfers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[str] = mapped_column(_endpoint_enum)
    source_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dest_type: Mapped[str] = mapped_column(
        Enum("savings_account", "deposit", "external",
             name="transfer_endpoint_enum", create_type=False)
    )
    dest_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    dest_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    currency: Mapped[str] = mapped_column(String(3))
    date: Mapped[date] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
