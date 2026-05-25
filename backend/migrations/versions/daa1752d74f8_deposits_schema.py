"""deposits_schema

Revision ID: daa1752d74f8
Revises: b908936723c1
Create Date: 2026-05-25 07:59:31.237022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'daa1752d74f8'
down_revision: Union[str, None] = 'b908936723c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    interest_type_enum = sa.Enum("simple", "compound", name="deposit_interest_type_enum")
    status_enum = sa.Enum("active", "closed", "early_closed", name="deposit_status_enum")
    op.create_table(
        "deposits",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("bank_name", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("interest_rate", sa.Numeric(5, 4), nullable=False),
        sa.Column("interest_type", interest_type_enum, nullable=False),
        sa.Column("open_date", sa.Date(), nullable=False),
        sa.Column("close_date", sa.Date(), nullable=False),
        sa.Column("early_closure_rate", sa.Numeric(5, 4), nullable=True),
        sa.Column("auto_renew", sa.Boolean(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("balance", sa.Numeric(15, 2), nullable=False),
        sa.Column("status", status_enum, nullable=False),
        sa.Column("actual_close_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deposits_user_id"), "deposits", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_deposits_user_id"), table_name="deposits")
    op.drop_table("deposits")
    sa.Enum(name="deposit_interest_type_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="deposit_status_enum").drop(op.get_bind(), checkfirst=True)
