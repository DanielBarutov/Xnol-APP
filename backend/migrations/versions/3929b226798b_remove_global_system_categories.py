"""remove_global_system_categories

Revision ID: 3929b226798b
Revises: 65cb8ce70fe0
Create Date: 2026-05-26 22:14:21.109499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3929b226798b'
down_revision: Union[str, None] = '65cb8ce70fe0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM categories WHERE user_id IS NULL")


def downgrade() -> None:
    pass  # non-reversible data deletion
