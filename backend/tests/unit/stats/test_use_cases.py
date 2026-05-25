from decimal import Decimal
from uuid import uuid4

from app.modules.stats.domain.entities import RawCategoryRow


def test_raw_category_row_exists() -> None:
    row = RawCategoryRow(
        category_id=uuid4(),
        category_name="Еда",
        type="expense",
        amount=Decimal("5000.00"),
    )
    assert row.type == "expense"
