"""seed_system_categories

Revision ID: 1c4065f46ee5
Revises: 41a049169860
Create Date: 2026-05-24 13:35:47.018421

"""
from typing import Sequence, Union

import uuid
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c4065f46ee5'
down_revision: Union[str, None] = '41a049169860'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SYSTEM_CATEGORIES = [
    ("Еда",            "expense", "utensils",         "#f97316"),
    ("Транспорт",      "expense", "car",               "#3b82f6"),
    ("Жильё",          "expense", "home",              "#8b5cf6"),
    ("Здоровье",       "expense", "heart-pulse",       "#ef4444"),
    ("Развлечения",    "expense", "gamepad-2",         "#ec4899"),
    ("Одежда",         "expense", "shirt",             "#f59e0b"),
    ("Образование",    "expense", "graduation-cap",    "#06b6d4"),
    ("Прочие расходы", "expense", "circle-ellipsis",   "#6b7280"),
    ("Зарплата",       "income",  "briefcase",         "#22c55e"),
    ("Фриланс",        "income",  "laptop",            "#10b981"),
    ("Инвестиции",     "income",  "trending-up",       "#14b8a6"),
    ("Прочие доходы",  "income",  "plus-circle",       "#6b7280"),
]


def upgrade() -> None:
    for name, type_, icon, color in SYSTEM_CATEGORIES:
        op.execute(
            f"INSERT INTO categories (id, user_id, parent_id, name, type, icon, color, is_system, deleted_at) "
            f"VALUES ('{uuid.uuid4()}', NULL, NULL, '{name}', '{type_}', '{icon}', '{color}', TRUE, NULL)"
        )


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE is_system = TRUE")
