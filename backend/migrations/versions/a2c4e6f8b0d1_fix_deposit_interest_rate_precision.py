"""fix_deposit_interest_rate_precision

Revision ID: a2c4e6f8b0d1
Revises: ffc15b5b4dda
Create Date: 2026-05-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2c4e6f8b0d1'
down_revision: Union[str, None] = 'ffc15b5b4dda'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Numeric(5, 4) allows max 9.9999 — any rate ≥ 10% causes overflow.
    # Numeric(8, 4) allows up to 9999.9999, covering any realistic interest rate.
    op.alter_column('deposits', 'interest_rate',
                    type_=sa.Numeric(8, 4),
                    existing_type=sa.Numeric(5, 4),
                    existing_nullable=False)
    op.alter_column('deposits', 'early_closure_rate',
                    type_=sa.Numeric(8, 4),
                    existing_type=sa.Numeric(5, 4),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('deposits', 'interest_rate',
                    type_=sa.Numeric(5, 4),
                    existing_type=sa.Numeric(8, 4),
                    existing_nullable=False)
    op.alter_column('deposits', 'early_closure_rate',
                    type_=sa.Numeric(5, 4),
                    existing_type=sa.Numeric(8, 4),
                    existing_nullable=True)
