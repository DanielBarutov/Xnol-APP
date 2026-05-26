# Transactions — Account Balance Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link every transaction to a savings account (`account_id`) and automatically adjust that account's balance when a transaction is created, updated, or deleted.

**Architecture:** Changes are confined to the `transactions` module. `IAccountRepository` (already exists, already registered in `dependencies.py` as `get_account_repository`) is injected into the three mutating use cases. Balance update pattern mirrors `transfers`: validate account → persist record → adjust balance. On update, revert the old balance effect first, then apply the new one.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x (async), Alembic, pytest-asyncio, httpx ASGI transport, Pydantic v2.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `backend/app/modules/transactions/domain/entities.py` | Modify | Add `account_id: UUID` field |
| `backend/app/modules/transactions/application/dtos.py` | Modify | Add `account_id` to all three DTOs |
| `backend/app/modules/transactions/infrastructure/models.py` | Modify | Add `account_id` FK column |
| `backend/migrations/versions/<rev>_transactions_add_account_id.py` | Create | Alembic migration |
| `backend/app/modules/transactions/presentation/schemas.py` | Modify | Add `account_id` to all three schemas |
| `backend/app/modules/transactions/application/use_cases.py` | Modify | Inject `IAccountRepository`, add `_validate_account`, add balance deltas |
| `backend/app/modules/transactions/presentation/router.py` | Modify | Inject `get_account_repository`, wire `account_id` in DTOs, update `_map_dto` |
| `backend/tests/unit/transactions/test_use_cases.py` | Modify | Rewrite: account fixtures, balance assertions, error cases |
| `backend/tests/integration/transactions/conftest.py` | Modify | Add `FakeAccountRepository` override for `get_account_repository` |
| `backend/tests/integration/transactions/test_transactions_router.py` | Modify | Rewrite: add `account_id` to all requests, add balance verification tests |

> **Note:** `backend/app/dependencies.py` does NOT change — `get_account_repository` already exists there.

---

## Task 1: Extend domain entity and DTOs

**Files:**
- Modify: `backend/app/modules/transactions/domain/entities.py`
- Modify: `backend/app/modules/transactions/application/dtos.py`

- [ ] **Step 1: Add `account_id` to `Transaction` entity**

Replace the full content of `backend/app/modules/transactions/domain/entities.py`:

```python
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Transaction:
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str  # "income" | "expense"
    amount: Decimal
    date: date
    id: UUID = field(default_factory=uuid4)
    description: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 2: Add `account_id` to all three DTOs**

Replace the full content of `backend/app/modules/transactions/application/dtos.py`:

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class TransactionDTO:
    id: UUID
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str
    amount: Decimal
    date: date
    created_at: datetime
    description: str | None = None


@dataclass
class CreateTransactionDTO:
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str
    amount: Decimal
    date: date
    description: str | None = None


@dataclass
class UpdateTransactionDTO:
    transaction_id: UUID
    user_id: UUID
    account_id: UUID | None = None
    category_id: UUID | None = None
    type: str | None = None
    amount: Decimal | None = None
    date: date | None = None
    description: str | None = None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/transactions/domain/entities.py backend/app/modules/transactions/application/dtos.py
git commit -m "feat(transactions): add account_id to domain entity and DTOs"
```

---

## Task 2: Extend SQLAlchemy model and create migration

**Files:**
- Modify: `backend/app/modules/transactions/infrastructure/models.py`
- Create: `backend/migrations/versions/<rev>_transactions_add_account_id.py`

- [ ] **Step 1: Add `account_id` FK to `TransactionModel`**

Replace the full content of `backend/app/modules/transactions/infrastructure/models.py`:

```python
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base_model import Base


class TransactionModel(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("savings_accounts.id"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), index=True)
    type: Mapped[str] = mapped_column(Enum("income", "expense", name="transaction_type_enum"))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    date: Mapped[date] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 2: Generate the Alembic migration**

Run from `backend/`:

```bash
cd backend && alembic revision --autogenerate -m "transactions_add_account_id"
```

Open the generated file and verify it looks like the following (autogenerate may produce a slightly different but equivalent form — the key operations must be present):

```python
"""transactions_add_account_id

Revision ID: <generated>
Revises: daa1752d74f8
...
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = '<generated>'
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
```

If autogenerate added extra noise (e.g. dropped/recreated the enum), clean it up so only the `account_id` operations remain.

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/transactions/infrastructure/models.py backend/migrations/versions/
git commit -m "feat(transactions): add account_id FK column and Alembic migration"
```

---

## Task 3: Extend presentation schemas

**Files:**
- Modify: `backend/app/modules/transactions/presentation/schemas.py`

- [ ] **Step 1: Add `account_id` to all three Pydantic schemas**

Replace the full content of `backend/app/modules/transactions/presentation/schemas.py`:

```python
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class CreateTransactionRequest(BaseModel):
    account_id: UUID
    category_id: UUID
    type: str  # "income" | "expense"
    amount: Decimal
    date: date
    description: str | None = None


class UpdateTransactionRequest(BaseModel):
    account_id: UUID | None = None
    category_id: UUID | None = None
    type: str | None = None
    amount: Decimal | None = None
    # Optional[date] required here: Pydantic v2 puts field defaults into localns
    # during annotation evaluation, so `date = None` would shadow the `date` type
    # making `date | None` fail. Optional[date] resolves via globalns where
    # `date` is still the type.
    date: Optional[date] = None
    description: str | None = None


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    account_id: UUID
    category_id: UUID
    type: str
    amount: Decimal
    date: date
    description: str | None
    created_at: datetime
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/modules/transactions/presentation/schemas.py
git commit -m "feat(transactions): add account_id to presentation schemas"
```

---

## Task 4: Write failing unit tests

**Files:**
- Modify: `backend/tests/unit/transactions/test_use_cases.py`

These tests will fail until Task 5 (use cases) is done — that is expected.

- [ ] **Step 1: Rewrite `test_use_cases.py`**

Replace the full content of `backend/tests/unit/transactions/test_use_cases.py`:

```python
import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.transactions.application.dtos import CreateTransactionDTO, UpdateTransactionDTO
from app.modules.transactions.application.use_cases import (
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    UpdateTransactionUseCase,
)
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def account_repo():
    return FakeAccountRepository()


@pytest.fixture
def cat_repo():
    return FakeCategoryRepository()


@pytest.fixture
def txn_repo():
    return FakeTransactionRepository()


@pytest.fixture
async def active_account(account_repo, user_id):
    account = Account(
        user_id=user_id, name="Основной", bank_name="Сбербанк",
        currency="RUB", balance=Decimal("10000"),
    )
    return await account_repo.create(account)


@pytest.fixture
async def active_cat(cat_repo, user_id):
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", user_id=user_id)
    return await cat_repo.create(cat)


@pytest.mark.asyncio
async def test_create_expense_decreases_account_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("500.00"), date=date(2026, 5, 1),
    )
    await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("9500.00")


@pytest.mark.asyncio
async def test_create_income_increases_account_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account
):
    income_cat = Category(name="Зарплата", type="income", icon="cash", color="#22c55e", user_id=user_id)
    await cat_repo.create(income_cat)
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=income_cat.id, type="income",
        amount=Decimal("3000.00"), date=date(2026, 5, 1),
    )
    await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("13000.00")


@pytest.mark.asyncio
async def test_update_amount_recalculates_balance_on_same_account(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("200.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # balance is now 9800; update to 500 → balance should be 9500
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=user_id, amount=Decimal("500.00"))
    await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("9500.00")


@pytest.mark.asyncio
async def test_update_type_income_to_expense_reverses_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account
):
    income_cat = Category(name="Зарплата", type="income", icon="cash", color="#22c55e", user_id=user_id)
    expense_cat = Category(name="Еда", type="expense", icon="food", color="#f97316", user_id=user_id)
    await cat_repo.create(income_cat)
    await cat_repo.create(expense_cat)

    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=income_cat.id, type="income",
        amount=Decimal("1000.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # balance = 11000; flip to expense → revert +1000, apply -1000 → balance = 9000
    update_dto = UpdateTransactionDTO(
        transaction_id=txn.id, user_id=user_id,
        category_id=expense_cat.id, type="expense",
    )
    await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("9000.00")


@pytest.mark.asyncio
async def test_update_account_id_reverts_old_and_updates_new(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    account_b = Account(
        user_id=user_id, name="Дополнительный", bank_name="ВТБ",
        currency="RUB", balance=Decimal("5000"),
    )
    await account_repo.create(account_b)

    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("300.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # active_account.balance = 9700; update account_id to account_b
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=user_id, account_id=account_b.id)
    await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)

    acc_a = await account_repo.find_by_id(active_account.id)
    acc_b = await account_repo.find_by_id(account_b.id)
    assert acc_a.balance == Decimal("10000.00")  # reverted
    assert acc_b.balance == Decimal("4700.00")   # 5000 - 300


@pytest.mark.asyncio
async def test_delete_reverts_account_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("400.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # balance = 9600; delete → reverts to 10000
    await DeleteTransactionUseCase(txn_repo, account_repo).execute(txn.id, user_id)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("10000.00")


@pytest.mark.asyncio
async def test_create_with_nonexistent_account_raises(
    txn_repo, cat_repo, account_repo, user_id, active_cat
):
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=uuid4(),
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(NotFoundError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_foreign_account_raises(
    txn_repo, cat_repo, account_repo, user_id, active_cat
):
    other_account = Account(
        user_id=uuid4(), name="Чужой", bank_name="Bank",
        currency="RUB", balance=Decimal("1000"),
    )
    await account_repo.create(other_account)
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=other_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(NotFoundError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_deleted_account_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    await account_repo.soft_delete(active_account.id, datetime.now(timezone.utc))
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(ConflictError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_deleted_category_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    await cat_repo.soft_delete(active_cat.id, datetime.now(timezone.utc))
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(ConflictError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_list_with_date_filter(txn_repo, cat_repo, account_repo, user_id, active_account, active_cat):
    for d in [date(2026, 4, 1), date(2026, 5, 1), date(2026, 6, 1)]:
        dto = CreateTransactionDTO(
            user_id=user_id, account_id=active_account.id,
            category_id=active_cat.id, type="expense",
            amount=Decimal("100"), date=d,
        )
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)
    result = await ListTransactionsUseCase(txn_repo).execute(
        user_id, date_from=date(2026, 5, 1), date_to=date(2026, 5, 31)
    )
    assert len(result) == 1
    assert result[0].date == date(2026, 5, 1)


@pytest.mark.asyncio
async def test_update_other_user_transaction_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=uuid4(), amount=Decimal("999"))
    with pytest.raises(AuthorizationError):
        await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)


@pytest.mark.asyncio
async def test_delete_other_user_transaction_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    with pytest.raises(AuthorizationError):
        await DeleteTransactionUseCase(txn_repo, account_repo).execute(txn.id, uuid4())
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/xnoll/backend && python -m pytest tests/unit/transactions/test_use_cases.py -v 2>&1 | tail -20
```

Expected: FAIL — `TypeError: CreateTransactionUseCase.__init__() takes 3 positional arguments but 4 were given` (use_cases hasn't been updated yet).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/unit/transactions/test_use_cases.py
git commit -m "test(transactions): rewrite unit tests with account_id and balance assertions"
```

---

## Task 5: Update use cases (makes unit tests pass)

**Files:**
- Modify: `backend/app/modules/transactions/application/use_cases.py`

- [ ] **Step 1: Rewrite `use_cases.py`**

Replace the full content of `backend/app/modules/transactions/application/use_cases.py`:

```python
from datetime import date
from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.transactions.application.dtos import (
    CreateTransactionDTO,
    TransactionDTO,
    UpdateTransactionDTO,
)
from app.modules.transactions.domain.entities import Transaction
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError


def _to_dto(t: Transaction) -> TransactionDTO:
    return TransactionDTO(
        id=t.id,
        user_id=t.user_id,
        account_id=t.account_id,
        category_id=t.category_id,
        type=t.type,
        amount=t.amount,
        date=t.date,
        description=t.description,
        created_at=t.created_at,
    )


def _balance_delta(txn_type: str, amount: Decimal) -> Decimal:
    return amount if txn_type == "income" else -amount


async def _validate_category(
    cat_repo: ICategoryRepository,
    category_id: UUID,
    user_id: UUID,
) -> None:
    cat = await cat_repo.find_by_id(category_id)
    if cat is None:
        raise NotFoundError("Category", str(category_id))
    if cat.deleted_at is not None:
        raise ConflictError("Category is deleted")
    if cat.user_id is not None and cat.user_id != user_id:
        raise ConflictError("Category is not accessible")


async def _validate_account(
    account_repo: IAccountRepository,
    account_id: UUID,
    user_id: UUID,
) -> None:
    account = await account_repo.find_by_id(account_id)
    if account is None or account.user_id != user_id:
        raise NotFoundError("Account", str(account_id))
    if account.deleted_at is not None:
        raise ConflictError("Account is deleted")


class ListTransactionsUseCase:
    def __init__(self, repo: ITransactionRepository) -> None:
        self._repo = repo

    async def execute(
        self,
        user_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[TransactionDTO]:
        txns = await self._repo.list_for_user(user_id, date_from, date_to)
        return [_to_dto(t) for t in txns]


class CreateTransactionUseCase:
    def __init__(
        self,
        repo: ITransactionRepository,
        cat_repo: ICategoryRepository,
        account_repo: IAccountRepository,
    ) -> None:
        self._repo = repo
        self._cat_repo = cat_repo
        self._account_repo = account_repo

    async def execute(self, dto: CreateTransactionDTO) -> TransactionDTO:
        await _validate_category(self._cat_repo, dto.category_id, dto.user_id)
        await _validate_account(self._account_repo, dto.account_id, dto.user_id)
        txn = Transaction(
            user_id=dto.user_id,
            account_id=dto.account_id,
            category_id=dto.category_id,
            type=dto.type,
            amount=dto.amount,
            date=dto.date,
            description=dto.description,
        )
        saved = await self._repo.create(txn)
        await self._account_repo.update_balance(saved.account_id, _balance_delta(saved.type, saved.amount))
        return _to_dto(saved)


class UpdateTransactionUseCase:
    def __init__(
        self,
        repo: ITransactionRepository,
        cat_repo: ICategoryRepository,
        account_repo: IAccountRepository,
    ) -> None:
        self._repo = repo
        self._cat_repo = cat_repo
        self._account_repo = account_repo

    async def execute(self, dto: UpdateTransactionDTO) -> TransactionDTO:
        txn = await self._repo.find_by_id(dto.transaction_id)
        if txn is None:
            raise NotFoundError("Transaction", str(dto.transaction_id))
        if txn.user_id != dto.user_id:
            raise AuthorizationError()

        new_account_id = dto.account_id if dto.account_id is not None else txn.account_id
        if dto.account_id is not None:
            await _validate_account(self._account_repo, dto.account_id, dto.user_id)

        new_category_id = dto.category_id if dto.category_id is not None else txn.category_id
        if dto.category_id is not None:
            await _validate_category(self._cat_repo, dto.category_id, dto.user_id)

        new_type = dto.type if dto.type is not None else txn.type
        new_amount = dto.amount if dto.amount is not None else txn.amount

        # Revert old balance effect, then apply new
        await self._account_repo.update_balance(txn.account_id, -_balance_delta(txn.type, txn.amount))

        updated = Transaction(
            id=txn.id,
            user_id=txn.user_id,
            account_id=new_account_id,
            category_id=new_category_id,
            type=new_type,
            amount=new_amount,
            date=dto.date if dto.date is not None else txn.date,
            description=dto.description if dto.description is not None else txn.description,
            created_at=txn.created_at,
        )
        saved = await self._repo.update(updated)
        await self._account_repo.update_balance(saved.account_id, _balance_delta(saved.type, saved.amount))
        return _to_dto(saved)


class DeleteTransactionUseCase:
    def __init__(self, repo: ITransactionRepository, account_repo: IAccountRepository) -> None:
        self._repo = repo
        self._account_repo = account_repo

    async def execute(self, transaction_id: UUID, user_id: UUID) -> None:
        txn = await self._repo.find_by_id(transaction_id)
        if txn is None:
            raise NotFoundError("Transaction", str(transaction_id))
        if txn.user_id != user_id:
            raise AuthorizationError()
        await self._account_repo.update_balance(txn.account_id, -_balance_delta(txn.type, txn.amount))
        await self._repo.delete(transaction_id)
```

- [ ] **Step 2: Run unit tests to verify they pass**

```bash
cd /home/daniel/xnoll/backend && python -m pytest tests/unit/transactions/test_use_cases.py -v 2>&1 | tail -30
```

Expected: All 13 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/transactions/application/use_cases.py
git commit -m "feat(transactions): inject IAccountRepository and add balance logic to use cases"
```

---

## Task 6: Update router

**Files:**
- Modify: `backend/app/modules/transactions/presentation/router.py`

- [ ] **Step 1: Rewrite `router.py`**

Replace the full content of `backend/app/modules/transactions/presentation/router.py`:

```python
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_current_user_id,
    get_transaction_repository,
)
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.transactions.application.dtos import CreateTransactionDTO, UpdateTransactionDTO
from app.modules.transactions.application.use_cases import (
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    UpdateTransactionUseCase,
)
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.modules.transactions.presentation.schemas import (
    CreateTransactionRequest,
    TransactionResponse,
    UpdateTransactionRequest,
)
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


def _map_dto(dto) -> TransactionResponse:
    return TransactionResponse(
        id=dto.id,
        user_id=dto.user_id,
        account_id=dto.account_id,
        category_id=dto.category_id,
        type=dto.type,
        amount=dto.amount,
        date=dto.date,
        description=dto.description,
        created_at=dto.created_at,
    )


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
) -> list[TransactionResponse]:
    dtos = await ListTransactionsUseCase(repo).execute(user_id, date_from, date_to)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: CreateTransactionRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    cat_repo: ICategoryRepository = Depends(get_category_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransactionResponse:
    try:
        dto = await CreateTransactionUseCase(repo, cat_repo, account_repo).execute(
            CreateTransactionDTO(
                user_id=user_id,
                account_id=body.account_id,
                category_id=body.category_id,
                type=body.type,
                amount=body.amount,
                date=body.date,
                description=body.description,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    body: UpdateTransactionRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    cat_repo: ICategoryRepository = Depends(get_category_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransactionResponse:
    try:
        dto = await UpdateTransactionUseCase(repo, cat_repo, account_repo).execute(
            UpdateTransactionDTO(
                transaction_id=transaction_id,
                user_id=user_id,
                account_id=body.account_id,
                category_id=body.category_id,
                type=body.type,
                amount=body.amount,
                date=body.date,
                description=body.description,
            )
        )
    except (NotFoundError, AuthorizationError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> None:
    try:
        await DeleteTransactionUseCase(repo, account_repo).execute(transaction_id, user_id)
    except (NotFoundError, AuthorizationError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/modules/transactions/presentation/router.py
git commit -m "feat(transactions): wire account_repo into all router endpoints"
```

---

## Task 7: Update integration tests

**Files:**
- Modify: `backend/tests/integration/transactions/conftest.py`
- Modify: `backend/tests/integration/transactions/test_transactions_router.py`

- [ ] **Step 1: Rewrite `conftest.py`**

Replace the full content of `backend/tests/integration/transactions/conftest.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_transaction_repository,
    get_user_repository,
)
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository


@pytest.fixture
def fake_account_repo():
    return FakeAccountRepository()


@pytest.fixture
def fake_category_repo():
    return FakeCategoryRepository()


@pytest.fixture
def fake_transaction_repo():
    return FakeTransactionRepository()


@pytest.fixture
async def client(fake_account_repo, fake_category_repo, fake_transaction_repo):
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    app.dependency_overrides[get_category_repository] = lambda: fake_category_repo
    app.dependency_overrides[get_transaction_repository] = lambda: fake_transaction_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "txn@example.com", "password": "pass1234",
        "full_name": "Txn User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "txn@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

- [ ] **Step 2: Rewrite `test_transactions_router.py`**

Replace the full content of `backend/tests/integration/transactions/test_transactions_router.py`:

```python
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from httpx import AsyncClient

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository

ACCOUNTS_URL = "/api/v1/accounts"
TRANSACTIONS_URL = "/api/v1/transactions"


async def _make_account(client: AsyncClient, headers: dict, balance: str = "10000.00") -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": "Test", "bank_name": "Bank", "currency": "RUB", "balance": balance,
    })
    assert resp.status_code == 201
    return resp.json()["id"]


async def _make_cat(repo: FakeCategoryRepository) -> str:
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await repo.create(cat)
    return str(cat.id)


async def _get_balance(client: AsyncClient, headers: dict, account_id: str) -> str:
    accounts = {a["id"]: a for a in (await client.get(ACCOUNTS_URL, headers=headers)).json()}
    return accounts[account_id]["balance"]


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(TRANSACTIONS_URL)
    assert resp.status_code == 403


async def test_create_transaction_returns_201(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "1500.00", "date": "2026-05-01",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == "1500.00"
    assert data["account_id"] == acc_id


async def test_create_expense_decreases_account_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "5000.00")
    cat_id = await _make_cat(fake_category_repo)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "1200.00", "date": "2026-05-01",
    })
    assert await _get_balance(client, auth_headers, acc_id) == "3800.00"


async def test_create_income_increases_account_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "2000.00")
    income_cat = Category(name="Зарплата", type="income", icon="cash", color="#22c55e", is_system=True)
    await fake_category_repo.create(income_cat)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": str(income_cat.id),
        "type": "income", "amount": "3000.00", "date": "2026-05-01",
    })
    assert await _get_balance(client, auth_headers, acc_id) == "5000.00"


async def test_list_returns_transactions(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "income", "amount": "200", "date": "2026-05-02",
    })
    resp = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_date_filter_filters_correctly(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    for d in ["2026-04-15", "2026-05-15", "2026-06-15"]:
        await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
            "account_id": acc_id, "category_id": cat_id,
            "type": "expense", "amount": "100", "date": d,
        })
    resp = await client.get(
        TRANSACTIONS_URL, headers=auth_headers,
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["date"] == "2026-05-15"


async def test_update_amount_recalculates_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "10000.00")
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "200.00", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    # balance = 9800; update amount to 500 → balance should become 9500
    await client.put(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers, json={"amount": "500.00"})
    assert await _get_balance(client, auth_headers, acc_id) == "9500.00"


async def test_update_account_id_reverts_old_and_updates_new(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_a = await _make_account(client, auth_headers, "10000.00")
    acc_b = await _make_account(client, auth_headers, "5000.00")
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_a, "category_id": cat_id,
        "type": "expense", "amount": "300.00", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    # acc_a = 9700; move transaction to acc_b → acc_a reverts to 10000, acc_b = 4700
    await client.put(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers, json={"account_id": acc_b})
    assert await _get_balance(client, auth_headers, acc_a) == "10000.00"
    assert await _get_balance(client, auth_headers, acc_b) == "4700.00"


async def test_delete_transaction_reverts_balance(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers, "8000.00")
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "500.00", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    assert await _get_balance(client, auth_headers, acc_id) == "8000.00"


async def test_create_with_nonexistent_account_returns_404(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": str(uuid4()), "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 404


async def test_create_with_foreign_account_returns_404(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository,
    fake_account_repo: FakeAccountRepository,
) -> None:
    foreign = Account(user_id=uuid4(), name="Чужой", bank_name="Bank", currency="RUB", balance=Decimal("1000"))
    await fake_account_repo.create(foreign)
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": str(foreign.id), "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 404


async def test_create_with_deleted_account_returns_409(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    await client.delete(f"{ACCOUNTS_URL}/{acc_id}", headers=auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 409


async def test_create_with_deleted_category_returns_409(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat = Category(name="Удалена", type="expense", icon="x", color="#fff", is_system=True)
    await fake_category_repo.create(cat)
    await fake_category_repo.soft_delete(cat.id, datetime.now(timezone.utc))
    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": str(cat.id),
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    assert resp.status_code == 409


async def test_delete_transaction_returns_204(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    resp = await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_deleted_transaction_gone(
    client: AsyncClient, auth_headers: dict, fake_category_repo: FakeCategoryRepository
) -> None:
    acc_id = await _make_account(client, auth_headers)
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "100", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=auth_headers)
    resp = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert all(t["id"] != txn_id for t in resp.json())


async def test_delete_nonexistent_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.delete(f"{TRANSACTIONS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_other_user_transaction_returns_404(
    client: AsyncClient, fake_category_repo: FakeCategoryRepository
) -> None:
    await client.post("/api/v1/auth/register", json={
        "email": "user_a@example.com", "password": "pass1234",
        "full_name": "User A", "primary_currency": "RUB",
    })
    resp_a = await client.post("/api/v1/auth/login", json={"email": "user_a@example.com", "password": "pass1234"})
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}

    await client.post("/api/v1/auth/register", json={
        "email": "user_b@example.com", "password": "pass1234",
        "full_name": "User B", "primary_currency": "RUB",
    })
    resp_b = await client.post("/api/v1/auth/login", json={"email": "user_b@example.com", "password": "pass1234"})
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}

    acc_id = await _make_account(client, headers_a)
    cat_id = await _make_cat(fake_category_repo)
    create_resp = await client.post(TRANSACTIONS_URL, headers=headers_a, json={
        "account_id": acc_id, "category_id": cat_id,
        "type": "expense", "amount": "500", "date": "2026-05-01",
    })
    txn_id = create_resp.json()["id"]
    resp = await client.delete(f"{TRANSACTIONS_URL}/{txn_id}", headers=headers_b)
    assert resp.status_code == 404
```

- [ ] **Step 3: Run integration tests to verify they pass**

```bash
cd /home/daniel/xnoll/backend && python -m pytest tests/integration/transactions/ -v 2>&1 | tail -40
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/integration/transactions/conftest.py backend/tests/integration/transactions/test_transactions_router.py
git commit -m "test(transactions): update integration tests with account_id and balance verification"
```

---

## Task 8: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
cd /home/daniel/xnoll/backend && python -m pytest tests/ -v 2>&1 | tail -50
```

Expected: All tests PASS (no regressions in other modules). If any test outside `transactions/` fails, investigate — the change is confined so failures would indicate an import-time breakage, not a logic change.

- [ ] **Step 2: Done**

All commits were made per task. No additional commit needed unless Step 1 reveals a regression that requires a fix.
