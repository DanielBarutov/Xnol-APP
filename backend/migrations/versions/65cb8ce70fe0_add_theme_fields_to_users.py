"""add theme fields to users

Revision ID: 65cb8ce70fe0
Revises: 811be8df6771
Create Date: 2026-05-26 17:37:14.436885

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65cb8ce70fe0'
down_revision: Union[str, None] = '811be8df6771'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('theme_mode', sa.String(length=10), nullable=False, server_default='dark'))
    op.add_column('users', sa.Column('theme_color', sa.String(length=20), nullable=False, server_default='violet'))


def downgrade() -> None:
    op.drop_column('users', 'theme_color')
    op.drop_column('users', 'theme_mode')
