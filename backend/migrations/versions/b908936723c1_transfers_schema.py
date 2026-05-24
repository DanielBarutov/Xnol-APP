"""transfers_schema

Revision ID: b908936723c1
Revises: 83ced826c5c5
Create Date: 2026-05-24 19:07:15.556244

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b908936723c1'
down_revision: Union[str, None] = '83ced826c5c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    transfer_endpoint_enum = sa.Enum(
        "savings_account", "deposit", "external",
        name="transfer_endpoint_enum",
    )
    op.create_table(
        "transfers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("source_type", transfer_endpoint_enum, nullable=False),
        sa.Column("source_id", sa.UUID(), nullable=True),
        sa.Column("source_label", sa.String(length=100), nullable=True),
        sa.Column("dest_type", sa.Enum(
            "savings_account", "deposit", "external",
            name="transfer_endpoint_enum", create_type=False,
        ), nullable=False),
        sa.Column("dest_id", sa.UUID(), nullable=True),
        sa.Column("dest_label", sa.String(length=100), nullable=True),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transfers_user_id"), "transfers", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transfers_user_id"), table_name="transfers")
    op.drop_table("transfers")
    sa.Enum(name="transfer_endpoint_enum").drop(op.get_bind(), checkfirst=True)
