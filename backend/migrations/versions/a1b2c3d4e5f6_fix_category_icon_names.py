"""fix_category_icon_names

Revision ID: a1b2c3d4e5f6
Revises: 3929b226798b
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3929b226798b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    icon_map = {
        "utensils":         "Utensils",
        "car":              "Car",
        "home":             "Home",
        "heart-pulse":      "HeartPulse",
        "gamepad-2":        "Gamepad2",
        "shirt":            "Shirt",
        "graduation-cap":   "GraduationCap",
        "circle-ellipsis":  "CircleEllipsis",
        "briefcase":        "Briefcase",
        "laptop":           "Laptop",
        "trending-up":      "TrendingUp",
        "plus-circle":      "PlusCircle",
    }
    for old, new in icon_map.items():
        op.execute(text("UPDATE categories SET icon = :new WHERE icon = :old").bindparams(new=new, old=old))


def downgrade() -> None:
    icon_map = {
        "Utensils":        "utensils",
        "Car":             "car",
        "Home":            "home",
        "HeartPulse":      "heart-pulse",
        "Gamepad2":        "gamepad-2",
        "Shirt":           "shirt",
        "GraduationCap":   "graduation-cap",
        "CircleEllipsis":  "circle-ellipsis",
        "Briefcase":       "briefcase",
        "Laptop":          "laptop",
        "TrendingUp":      "trending-up",
        "PlusCircle":      "plus-circle",
    }
    for old, new in icon_map.items():
        op.execute(text("UPDATE categories SET icon = :new WHERE icon = :old").bindparams(new=new, old=old))
