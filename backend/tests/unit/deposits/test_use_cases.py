from decimal import Decimal
from datetime import date
from uuid import uuid4

from app.modules.deposits.domain.entities import Deposit


def test_deposit_entity_defaults() -> None:
    d = Deposit(
        user_id=uuid4(),
        name="Вклад",
        bank_name="Сбербанк",
        amount=Decimal("100000.00"),
        interest_rate=Decimal("0.1400"),
        interest_type="compound",
        open_date=date(2026, 1, 1),
        close_date=date(2026, 7, 1),
        currency="RUB",
        balance=Decimal("100000.00"),
        auto_renew=False,
    )
    assert d.status == "active"
    assert d.actual_close_date is None
    assert d.early_closure_rate is None
