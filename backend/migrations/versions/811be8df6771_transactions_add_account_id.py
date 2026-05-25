"""transactions_add_account_id

Revision ID: 811be8df6771
Revises: daa1752d74f8
Create Date: 2026-05-25 14:41:22.579769

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '811be8df6771'
down_revision: Union[str, None] = 'daa1752d74f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('account_id', sa.Uuid(), nullable=False))
    op.create_index('ix_transactions_account_id', 'transactions', ['account_id'], unique=False)
    op.create_foreign_key(
        'fk_transactions_account_id', 'transactions',
        'savings_accounts', ['account_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_transactions_account_id', 'transactions', type_='foreignkey')
    op.drop_index('ix_transactions_account_id', table_name='transactions')
    op.drop_column('transactions', 'account_id')
