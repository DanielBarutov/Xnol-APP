# Idempotency Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add idempotency key support to backend POST endpoints (transactions, transfers, accounts) and wire the mobile client to send the same key on both the initial API call and queue retries, eliminating duplicate records when a request times out mid-flight.

**Architecture:** The backend gains an `idempotency_keys` table and a FastAPI dependency that checks for `X-Idempotency-Key` header on POST requests — returning the cached response if the key was seen before, or saving it after a successful creation. The mobile client generates a UUID-style key before each write, passes it to the API call, and stores the same key in the mutation queue so sync retries send the identical key. The existing `mutationQueue.add()` signature changes from auto-generating `id` to requiring the caller to provide it, enabling this end-to-end key flow.

**Tech Stack:** FastAPI + SQLAlchemy (async) + PostgreSQL + Alembic (backend); axios + Zustand (mobile); shared TypeScript API client.

---

## File Structure

**Backend — new files:**
- `backend/app/modules/idempotency/__init__.py`
- `backend/app/modules/idempotency/domain/__init__.py`
- `backend/app/modules/idempotency/domain/entities.py` — `IdempotencyRecord` dataclass
- `backend/app/modules/idempotency/domain/interfaces.py` — `IIdempotencyRepository` ABC
- `backend/app/modules/idempotency/infrastructure/__init__.py`
- `backend/app/modules/idempotency/infrastructure/fake_repository.py` — in-memory impl for tests
- `backend/app/modules/idempotency/infrastructure/models.py` — SQLAlchemy `IdempotencyKeyModel`
- `backend/app/modules/idempotency/infrastructure/repository.py` — `SQLAlchemyIdempotencyRepository`
- `backend/app/modules/idempotency/presentation/__init__.py`
- `backend/app/modules/idempotency/presentation/dependency.py` — `IdempotencyContext` dataclass + `get_idempotency_context` FastAPI dependency
- `backend/migrations/versions/<rev>_add_idempotency_keys.py` — Alembic migration
- `backend/tests/unit/idempotency/__init__.py`
- `backend/tests/unit/idempotency/test_fake_repository.py`
- `backend/tests/integration/idempotency/__init__.py`
- `backend/tests/integration/idempotency/conftest.py`
- `backend/tests/integration/idempotency/test_idempotency_transactions.py`
- `backend/tests/integration/idempotency/test_idempotency_transfers.py`
- `backend/tests/integration/idempotency/test_idempotency_accounts.py`

**Backend — modified files:**
- `backend/app/dependencies.py` — add `get_idempotency_repository`
- `backend/app/modules/transactions/presentation/router.py` — inject idempotency context, check cache, save on success
- `backend/app/modules/transfers/presentation/router.py` — same
- `backend/app/modules/accounts/presentation/router.py` — same

**Shared — modified files:**
- `shared/api/endpoints/transactions.ts` — `create()` accepts optional `idempotencyKey`
- `shared/api/endpoints/transfers.ts` — same
- `shared/api/endpoints/accounts.ts` — same

**Mobile — modified files:**
- `mobile/store/mutationQueue.ts` — `add()` now requires caller-supplied `id` (no auto-generation)
- `mobile/features/transactions/AddTxSheet.tsx` — generate key, pass to API and `enqueue`
- `mobile/features/accounts/TransferSheet.tsx` — same
- `mobile/features/accounts/CreateAccountSheet.tsx` — same
- `mobile/hooks/useMutationSync.ts` — pass `item.id` as `X-Idempotency-Key` on sync

---

### Task 1: Backend — Idempotency domain: entity, interface, fake repo

**Files:**
- Create: `backend/app/modules/idempotency/__init__.py`
- Create: `backend/app/modules/idempotency/domain/__init__.py`
- Create: `backend/app/modules/idempotency/domain/entities.py`
- Create: `backend/app/modules/idempotency/domain/interfaces.py`
- Create: `backend/app/modules/idempotency/infrastructure/__init__.py`
- Create: `backend/app/modules/idempotency/infrastructure/fake_repository.py`
- Create: `backend/tests/unit/idempotency/__init__.py`
- Create: `backend/tests/unit/idempotency/test_fake_repository.py`

- [ ] **Step 1: Write the failing unit test**

```python
# backend/tests/unit/idempotency/test_fake_repository.py
import pytest
from uuid import uuid4
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.infrastructure.fake_repository import FakeIdempotencyRepository


@pytest.fixture
def repo():
    return FakeIdempotencyRepository()


async def test_find_returns_none_when_missing(repo):
    result = await repo.find(uuid4(), "some-key")
    assert result is None


async def test_save_and_find(repo):
    user_id = uuid4()
    record = IdempotencyRecord(
        user_id=user_id,
        key="key-abc",
        status_code=201,
        response_body={"id": "123", "amount": "100.00"},
    )
    await repo.save(record)
    found = await repo.find(user_id, "key-abc")
    assert found is not None
    assert found.status_code == 201
    assert found.response_body == {"id": "123", "amount": "100.00"}


async def test_different_users_same_key_are_isolated(repo):
    user1, user2 = uuid4(), uuid4()
    await repo.save(IdempotencyRecord(user_id=user1, key="k", status_code=201, response_body={}))
    assert await repo.find(user2, "k") is None


async def test_second_save_same_key_is_noop(repo):
    user_id = uuid4()
    first = IdempotencyRecord(user_id=user_id, key="k", status_code=201, response_body={"v": 1})
    second = IdempotencyRecord(user_id=user_id, key="k", status_code=200, response_body={"v": 2})
    await repo.save(first)
    await repo.save(second)
    found = await repo.find(user_id, "k")
    assert found.response_body == {"v": 1}  # first write wins
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && python -m pytest tests/unit/idempotency/test_fake_repository.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` — files don't exist yet.

- [ ] **Step 3: Create package init files**

```python
# backend/app/modules/idempotency/__init__.py
# (empty)

# backend/app/modules/idempotency/domain/__init__.py
# (empty)

# backend/app/modules/idempotency/infrastructure/__init__.py
# (empty)

# backend/app/modules/idempotency/presentation/__init__.py
# (empty)

# backend/tests/unit/idempotency/__init__.py
# (empty)
```

- [ ] **Step 4: Create the entity**

```python
# backend/app/modules/idempotency/domain/entities.py
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class IdempotencyRecord:
    user_id: UUID
    key: str
    status_code: int
    response_body: dict
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 5: Create the interface**

```python
# backend/app/modules/idempotency/domain/interfaces.py
from abc import ABC, abstractmethod
from uuid import UUID

from app.modules.idempotency.domain.entities import IdempotencyRecord


class IIdempotencyRepository(ABC):
    @abstractmethod
    async def find(self, user_id: UUID, key: str) -> IdempotencyRecord | None: ...

    @abstractmethod
    async def save(self, record: IdempotencyRecord) -> None: ...
```

- [ ] **Step 6: Create the fake repository**

```python
# backend/app/modules/idempotency/infrastructure/fake_repository.py
from uuid import UUID

from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository


class FakeIdempotencyRepository(IIdempotencyRepository):
    def __init__(self) -> None:
        self._store: dict[tuple[UUID, str], IdempotencyRecord] = {}

    async def find(self, user_id: UUID, key: str) -> IdempotencyRecord | None:
        return self._store.get((user_id, key))

    async def save(self, record: IdempotencyRecord) -> None:
        # First write wins — subsequent saves with same (user_id, key) are no-ops
        if (record.user_id, record.key) not in self._store:
            self._store[(record.user_id, record.key)] = record
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/unit/idempotency/test_fake_repository.py -v
```

Expected output:
```
PASSED tests/unit/idempotency/test_fake_repository.py::test_find_returns_none_when_missing
PASSED tests/unit/idempotency/test_fake_repository.py::test_save_and_find
PASSED tests/unit/idempotency/test_fake_repository.py::test_different_users_same_key_are_isolated
PASSED tests/unit/idempotency/test_fake_repository.py::test_second_save_same_key_is_noop
```

- [ ] **Step 8: Commit**

```bash
cd backend
git add app/modules/idempotency/ tests/unit/idempotency/
git commit -m "feat: add idempotency domain entity, interface, and fake repository"
```

---

### Task 2: Backend — SQLAlchemy model + Alembic migration

**Files:**
- Create: `backend/app/modules/idempotency/infrastructure/models.py`
- Create: `backend/migrations/versions/<rev>_add_idempotency_keys.py` (generated by Alembic)

- [ ] **Step 1: Create the SQLAlchemy model**

```python
# backend/app/modules/idempotency/infrastructure/models.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base


class IdempotencyKeyModel(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "key", name="uq_idempotency_user_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(128))
    status_code: Mapped[int] = mapped_column(Integer)
    response_body: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 2: Import the model in the migration env so Alembic can detect it**

Open `backend/migrations/env.py` and confirm (or add) that it imports all models. Look for the section that imports `Base` and `target_metadata`. The model must be imported before `target_metadata` is referenced.

Add to the imports block in `env.py` (near other model imports):

```python
import app.modules.idempotency.infrastructure.models  # noqa: F401
```

- [ ] **Step 3: Generate the migration**

```bash
cd backend && alembic revision --autogenerate -m "add_idempotency_keys"
```

This creates a file in `backend/migrations/versions/` with a generated revision ID (e.g. `abc123_add_idempotency_keys.py`).

- [ ] **Step 4: Review and verify the generated migration**

Open the generated file. It should contain `op.create_table("idempotency_keys", ...)` with all columns. If autogenerate didn't pick up the table (it happens when models aren't imported), manually write the migration:

```python
"""add_idempotency_keys

Revision ID: <generated>
Revises: <previous>
Create Date: <generated>
"""
from alembic import op
import sqlalchemy as sa

revision: str = "<generated>"
down_revision: str = "<previous revision id>"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(128), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "key", name="uq_idempotency_user_key"),
    )
    op.create_index("ix_idempotency_keys_user_id", "idempotency_keys", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_idempotency_keys_user_id", table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
```

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/modules/idempotency/infrastructure/models.py migrations/
git commit -m "feat: add idempotency_keys table model and migration"
```

---

### Task 3: Backend — SQLAlchemy repository + FastAPI dependency + wire to dependencies.py

**Files:**
- Create: `backend/app/modules/idempotency/infrastructure/repository.py`
- Create: `backend/app/modules/idempotency/presentation/dependency.py`
- Modify: `backend/app/dependencies.py`

- [ ] **Step 1: Write failing test (verifies dependency injection wires correctly)**

```python
# backend/tests/integration/idempotency/__init__.py
# (empty)

# backend/tests/integration/idempotency/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_idempotency_repository,
    get_transaction_repository,
    get_transfer_repository,
    get_user_repository,
)
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository
from app.modules.idempotency.infrastructure.fake_repository import FakeIdempotencyRepository


@pytest.fixture
def fake_idempotency_repo():
    return FakeIdempotencyRepository()


@pytest.fixture
async def client(fake_idempotency_repo):
    fresh_user_repo = FakeUserRepository()
    fake_account_repo = FakeAccountRepository()
    fake_category_repo = FakeCategoryRepository()
    fake_transaction_repo = FakeTransactionRepository()
    fake_transfer_repo = FakeTransferRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    app.dependency_overrides[get_category_repository] = lambda: fake_category_repo
    app.dependency_overrides[get_transaction_repository] = lambda: fake_transaction_repo
    app.dependency_overrides[get_transfer_repository] = lambda: fake_transfer_repo
    app.dependency_overrides[get_idempotency_repository] = lambda: fake_idempotency_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "idem@example.com", "password": "pass1234",
        "full_name": "Idem User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "idem@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

Write a minimal failing test to confirm imports work:

```python
# backend/tests/integration/idempotency/test_idempotency_transactions.py
async def test_placeholder(client) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
```

Run it (will fail because `get_idempotency_repository` doesn't exist yet):

```bash
cd backend && python -m pytest tests/integration/idempotency/test_idempotency_transactions.py -v
```

Expected: `ImportError` from conftest.

- [ ] **Step 2: Create the SQLAlchemy repository**

```python
# backend/app/modules/idempotency/infrastructure/repository.py
import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.infrastructure.models import IdempotencyKeyModel


class SQLAlchemyIdempotencyRepository(IIdempotencyRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find(self, user_id: UUID, key: str) -> IdempotencyRecord | None:
        result = await self._session.execute(
            select(IdempotencyKeyModel).where(
                IdempotencyKeyModel.user_id == user_id,
                IdempotencyKeyModel.key == key,
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        return IdempotencyRecord(
            user_id=model.user_id,
            key=model.key,
            status_code=model.status_code,
            response_body=model.response_body,
            created_at=model.created_at,
        )

    async def save(self, record: IdempotencyRecord) -> None:
        self._session.add(
            IdempotencyKeyModel(
                id=uuid.uuid4(),
                user_id=record.user_id,
                key=record.key,
                status_code=record.status_code,
                response_body=record.response_body,
                created_at=record.created_at,
            )
        )
        await self._session.flush()
```

- [ ] **Step 3: Create the FastAPI dependency**

```python
# backend/app/modules/idempotency/presentation/dependency.py
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header

from app.dependencies import get_current_user_id, get_idempotency_repository
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository


@dataclass
class IdempotencyContext:
    key: str | None
    cached: IdempotencyRecord | None


async def get_idempotency_context(
    x_idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
    user_id: UUID = Depends(get_current_user_id),
    repo: IIdempotencyRepository = Depends(get_idempotency_repository),
) -> IdempotencyContext:
    if not x_idempotency_key:
        return IdempotencyContext(key=None, cached=None)
    cached = await repo.find(user_id, x_idempotency_key)
    return IdempotencyContext(key=x_idempotency_key, cached=cached)
```

- [ ] **Step 4: Wire `get_idempotency_repository` into `dependencies.py`**

Open `backend/app/dependencies.py`. Add these two things:

At the top of imports, add:
```python
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.infrastructure.fake_repository import FakeIdempotencyRepository
from app.modules.idempotency.infrastructure.repository import SQLAlchemyIdempotencyRepository
```

In the global singleton section (after the other `_fake_*` lines), add:
```python
_fake_idempotency_repo = FakeIdempotencyRepository()
```

After the other `get_*_repository` functions, add:
```python
def get_idempotency_repository(db: AsyncSession = Depends(get_db)) -> IIdempotencyRepository:
    if settings.use_fake_repo:
        return _fake_idempotency_repo
    return SQLAlchemyIdempotencyRepository(db)
```

- [ ] **Step 5: Run the integration test — expect PASS**

```bash
cd backend && python -m pytest tests/integration/idempotency/test_idempotency_transactions.py -v
```

Expected: `PASSED`.

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/modules/idempotency/infrastructure/repository.py \
        app/modules/idempotency/presentation/dependency.py \
        app/dependencies.py \
        tests/integration/idempotency/
git commit -m "feat: add SQLAlchemy idempotency repo, dependency, and DI wiring"
```

---

### Task 4: Backend — Apply idempotency to POST /transactions

**Files:**
- Modify: `backend/app/modules/transactions/presentation/router.py`
- Modify: `backend/tests/integration/idempotency/test_idempotency_transactions.py`

- [ ] **Step 1: Write the failing integration tests**

Replace the placeholder in `backend/tests/integration/idempotency/test_idempotency_transactions.py`:

```python
# backend/tests/integration/idempotency/test_idempotency_transactions.py
from uuid import uuid4

from httpx import AsyncClient

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository

ACCOUNTS_URL = "/api/v1/accounts"
TRANSACTIONS_URL = "/api/v1/transactions"


async def _seed(client: AsyncClient, headers: dict, cat_repo: FakeCategoryRepository) -> tuple[str, str]:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": "Main", "bank_name": "Bank", "currency": "RUB", "balance": "5000.00",
    })
    account_id = resp.json()["id"]
    cat = Category(name="Food", type="expense", icon="utensils", color="#f97316", is_system=True)
    await cat_repo.create(cat)
    return account_id, str(cat.id)


async def test_same_key_returns_identical_response(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
    cat_repo = FakeCategoryRepository()
    from app.main import app
    from app.dependencies import get_category_repository
    app.dependency_overrides[get_category_repository] = lambda: cat_repo

    account_id, cat_id = await _seed(client, auth_headers, cat_repo)
    key = f"test-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "expense", "amount": "99.99", "date": "2026-05-28",
    }

    resp1 = await client.post(TRANSACTIONS_URL, headers=headers, json=payload)
    assert resp1.status_code == 201
    tx_id = resp1.json()["id"]

    resp2 = await client.post(TRANSACTIONS_URL, headers=headers, json=payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == tx_id  # same transaction returned


async def test_same_key_does_not_create_duplicate(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
    from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
    cat_repo = FakeCategoryRepository()
    tx_repo = FakeTransactionRepository()
    from app.main import app
    from app.dependencies import get_category_repository, get_transaction_repository
    app.dependency_overrides[get_category_repository] = lambda: cat_repo
    app.dependency_overrides[get_transaction_repository] = lambda: tx_repo

    account_id, cat_id = await _seed(client, auth_headers, cat_repo)
    key = f"test-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "expense", "amount": "50.00", "date": "2026-05-28",
    }

    await client.post(TRANSACTIONS_URL, headers=headers, json=payload)
    await client.post(TRANSACTIONS_URL, headers=headers, json=payload)

    all_txns = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert len(all_txns.json()) == 1


async def test_different_keys_create_separate_transactions(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
    cat_repo = FakeCategoryRepository()
    from app.main import app
    from app.dependencies import get_category_repository
    app.dependency_overrides[get_category_repository] = lambda: cat_repo

    account_id, cat_id = await _seed(client, auth_headers, cat_repo)
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "expense", "amount": "25.00", "date": "2026-05-28",
    }

    await client.post(TRANSACTIONS_URL, headers={**auth_headers, "X-Idempotency-Key": "key-1"}, json=payload)
    await client.post(TRANSACTIONS_URL, headers={**auth_headers, "X-Idempotency-Key": "key-2"}, json=payload)

    all_txns = await client.get(TRANSACTIONS_URL, headers=auth_headers)
    assert len(all_txns.json()) == 2


async def test_no_key_header_still_works(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
    cat_repo = FakeCategoryRepository()
    from app.main import app
    from app.dependencies import get_category_repository
    app.dependency_overrides[get_category_repository] = lambda: cat_repo

    account_id, cat_id = await _seed(client, auth_headers, cat_repo)
    payload = {
        "account_id": account_id, "category_id": cat_id,
        "type": "income", "amount": "100.00", "date": "2026-05-28",
    }

    resp = await client.post(TRANSACTIONS_URL, headers=auth_headers, json=payload)
    assert resp.status_code == 201
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && python -m pytest tests/integration/idempotency/test_idempotency_transactions.py -v
```

Expected: `FAILED` (second call creates a new transaction, not the cached one).

- [ ] **Step 3: Update the transactions router**

Replace `backend/app/modules/transactions/presentation/router.py`:

```python
import json
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.dependencies import (
    get_account_repository,
    get_category_repository,
    get_current_user_id,
    get_idempotency_repository,
    get_transaction_repository,
)
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.presentation.dependency import IdempotencyContext, get_idempotency_context
from app.modules.transactions.application.dtos import CreateTransactionDTO, UpdateTransactionDTO
from app.modules.transactions.application.use_cases import (
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    GetTransactionUseCase,
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


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
) -> TransactionResponse:
    try:
        dto = await GetTransactionUseCase(repo).execute(transaction_id, user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _map_dto(dto)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: CreateTransactionRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransactionRepository = Depends(get_transaction_repository),
    cat_repo: ICategoryRepository = Depends(get_category_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
    idempotency: IdempotencyContext = Depends(get_idempotency_context),
    idempotency_repo: IIdempotencyRepository = Depends(get_idempotency_repository),
) -> TransactionResponse:
    if idempotency.cached:
        return JSONResponse(
            content=idempotency.cached.response_body,
            status_code=idempotency.cached.status_code,
        )
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
    result = _map_dto(dto)
    if idempotency.key:
        await idempotency_repo.save(IdempotencyRecord(
            user_id=user_id,
            key=idempotency.key,
            status_code=status.HTTP_201_CREATED,
            response_body=json.loads(result.model_dump_json()),
        ))
    return result


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

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
cd backend && python -m pytest tests/unit/transactions/ tests/integration/transactions/ tests/integration/idempotency/test_idempotency_transactions.py -v
```

Expected: all PASSED.

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/modules/transactions/presentation/router.py \
        tests/integration/idempotency/test_idempotency_transactions.py
git commit -m "feat: apply idempotency check to POST /transactions"
```

---

### Task 5: Backend — Apply idempotency to POST /transfers and POST /accounts

**Files:**
- Modify: `backend/app/modules/transfers/presentation/router.py`
- Modify: `backend/app/modules/accounts/presentation/router.py`
- Create: `backend/tests/integration/idempotency/test_idempotency_transfers.py`
- Create: `backend/tests/integration/idempotency/test_idempotency_accounts.py`

- [ ] **Step 1: Write failing tests for transfers**

```python
# backend/tests/integration/idempotency/test_idempotency_transfers.py
from uuid import uuid4
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"
TRANSFERS_URL = "/api/v1/transfers"


async def _make_account(client: AsyncClient, headers: dict, name: str) -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": name, "bank_name": "Bank", "currency": "RUB", "balance": "10000.00",
    })
    assert resp.status_code == 201
    return resp.json()["id"]


async def test_same_key_returns_identical_transfer(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    src = await _make_account(client, auth_headers, "Source")
    dst = await _make_account(client, auth_headers, "Dest")
    key = f"tr-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "source_type": "savings_account", "source_id": src,
        "dest_type": "savings_account", "dest_id": dst,
        "amount": "200.00", "currency": "RUB", "date": "2026-05-28",
    }

    resp1 = await client.post(TRANSFERS_URL, headers=headers, json=payload)
    assert resp1.status_code == 201
    transfer_id = resp1.json()["id"]

    resp2 = await client.post(TRANSFERS_URL, headers=headers, json=payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == transfer_id


async def test_same_key_does_not_duplicate_transfer(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    src = await _make_account(client, auth_headers, "Src2")
    dst = await _make_account(client, auth_headers, "Dst2")
    key = f"tr-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "source_type": "savings_account", "source_id": src,
        "dest_type": "savings_account", "dest_id": dst,
        "amount": "100.00", "currency": "RUB", "date": "2026-05-28",
    }
    await client.post(TRANSFERS_URL, headers=headers, json=payload)
    await client.post(TRANSFERS_URL, headers=headers, json=payload)

    all_transfers = await client.get(TRANSFERS_URL, headers=auth_headers)
    assert len(all_transfers.json()) == 1
```

```python
# backend/tests/integration/idempotency/test_idempotency_accounts.py
from uuid import uuid4
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"


async def test_same_key_returns_identical_account(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    key = f"acc-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {"name": "Savings", "bank_name": "Sber", "currency": "RUB", "balance": "0"}

    resp1 = await client.post(ACCOUNTS_URL, headers=headers, json=payload)
    assert resp1.status_code == 201
    account_id = resp1.json()["id"]

    resp2 = await client.post(ACCOUNTS_URL, headers=headers, json=payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == account_id


async def test_same_key_does_not_duplicate_account(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    key = f"acc-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {"name": "Checking", "bank_name": "VTB", "currency": "RUB", "balance": "0"}

    await client.post(ACCOUNTS_URL, headers=headers, json=payload)
    await client.post(ACCOUNTS_URL, headers=headers, json=payload)

    all_accounts = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert len(all_accounts.json()) == 1
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && python -m pytest tests/integration/idempotency/test_idempotency_transfers.py tests/integration/idempotency/test_idempotency_accounts.py -v
```

Expected: FAILED (duplicates are created).

- [ ] **Step 3: Update the transfers router**

In `backend/app/modules/transfers/presentation/router.py`, add these imports at the top:

```python
import json
from fastapi.responses import JSONResponse
from app.dependencies import get_idempotency_repository
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.presentation.dependency import IdempotencyContext, get_idempotency_context
```

Replace the `create_transfer` endpoint with:

```python
@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    body: CreateTransferRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
    deposit_repo: IDepositRepository = Depends(get_deposit_repository),
    idempotency: IdempotencyContext = Depends(get_idempotency_context),
    idempotency_repo: IIdempotencyRepository = Depends(get_idempotency_repository),
) -> TransferResponse:
    if idempotency.cached:
        return JSONResponse(
            content=idempotency.cached.response_body,
            status_code=idempotency.cached.status_code,
        )
    try:
        dto = await CreateTransferUseCase(repo, account_repo, deposit_repo).execute(
            CreateTransferDTO(
                user_id=user_id, source_type=body.source_type, source_id=body.source_id,
                source_label=body.source_label, dest_type=body.dest_type, dest_id=body.dest_id,
                dest_label=body.dest_label, amount=body.amount, currency=body.currency,
                date=body.date, description=body.description,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    result = _map_dto(dto)
    if idempotency.key:
        await idempotency_repo.save(IdempotencyRecord(
            user_id=user_id,
            key=idempotency.key,
            status_code=status.HTTP_201_CREATED,
            response_body=json.loads(result.model_dump_json()),
        ))
    return result
```

- [ ] **Step 4: Update the accounts router**

In `backend/app/modules/accounts/presentation/router.py`, add imports:

```python
import json
from fastapi.responses import JSONResponse
from app.dependencies import get_idempotency_repository
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.domain.interfaces import IIdempotencyRepository
from app.modules.idempotency.presentation.dependency import IdempotencyContext, get_idempotency_context
```

Replace `create_account` with:

```python
@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    body: CreateAccountRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
    idempotency: IdempotencyContext = Depends(get_idempotency_context),
    idempotency_repo: IIdempotencyRepository = Depends(get_idempotency_repository),
) -> AccountResponse:
    if idempotency.cached:
        return JSONResponse(
            content=idempotency.cached.response_body,
            status_code=idempotency.cached.status_code,
        )
    dto = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(
            user_id=user_id,
            name=body.name,
            bank_name=body.bank_name,
            currency=body.currency,
            balance=body.balance,
        )
    )
    result = _map_dto(dto)
    if idempotency.key:
        await idempotency_repo.save(IdempotencyRecord(
            user_id=user_id,
            key=idempotency.key,
            status_code=status.HTTP_201_CREATED,
            response_body=json.loads(result.model_dump_json()),
        ))
    return result
```

- [ ] **Step 5: Run all idempotency tests + full regression check**

```bash
cd backend && python -m pytest tests/integration/idempotency/ tests/integration/transfers/ tests/integration/accounts/ -v
```

Expected: all PASSED.

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/modules/transfers/presentation/router.py \
        app/modules/accounts/presentation/router.py \
        tests/integration/idempotency/test_idempotency_transfers.py \
        tests/integration/idempotency/test_idempotency_accounts.py
git commit -m "feat: apply idempotency check to POST /transfers and POST /accounts"
```

---

### Task 6: Shared — API endpoints accept optional idempotency key

**Files:**
- Modify: `shared/api/endpoints/transactions.ts`
- Modify: `shared/api/endpoints/transfers.ts`
- Modify: `shared/api/endpoints/accounts.ts`

> **Context:** The axios `api` instance already supports per-request config (headers, etc.) via the second argument of `api.post(url, data, config)`. We add an optional `idempotencyKey` parameter to each `create()` function.

- [ ] **Step 1: Update `transactions.ts`**

```typescript
// shared/api/endpoints/transactions.ts
import { api } from '../client'
import type { TransactionResponse, CreateTransactionRequest } from '../types'

function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'X-Idempotency-Key': key } : {}
}

export const transactionsApi = {
  list: (params?: { account_id?: string; limit?: number; offset?: number; date_from?: string; date_to?: string }) =>
    api.get<TransactionResponse[]>('/api/v1/transactions', { params }).then(r => r.data),
  get: (id: string) => api.get<TransactionResponse>(`/api/v1/transactions/${id}`).then(r => r.data),
  create: (data: CreateTransactionRequest, idempotencyKey?: string) =>
    api.post<TransactionResponse>('/api/v1/transactions', data, {
      headers: idempotencyHeaders(idempotencyKey),
    }).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/transactions/${id}`),
}
```

- [ ] **Step 2: Update `transfers.ts`**

```typescript
// shared/api/endpoints/transfers.ts
import { api } from '../client'
import type { TransferResponse, CreateTransferRequest, UpdateTransferRequest } from '../types'

function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'X-Idempotency-Key': key } : {}
}

export const transfersApi = {
  list: () => api.get<TransferResponse[]>('/api/v1/transfers').then(r => r.data),
  create: (data: CreateTransferRequest, idempotencyKey?: string) =>
    api.post<TransferResponse>('/api/v1/transfers', data, {
      headers: idempotencyHeaders(idempotencyKey),
    }).then(r => r.data),
  update: (id: string, data: UpdateTransferRequest) =>
    api.put<TransferResponse>(`/api/v1/transfers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/transfers/${id}`),
}
```

Check the existing `transfers.ts` to confirm current function signatures; add any missing functions (update, delete) that are already there — don't remove them.

- [ ] **Step 3: Update `accounts.ts`**

```typescript
// shared/api/endpoints/accounts.ts
import { api } from '../client'
import type { AccountResponse, CreateAccountRequest } from '../types'

function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'X-Idempotency-Key': key } : {}
}

export const accountsApi = {
  list: () => api.get<AccountResponse[]>('/api/v1/accounts').then(r => r.data),
  create: (data: CreateAccountRequest, idempotencyKey?: string) =>
    api.post<AccountResponse>('/api/v1/accounts', data, {
      headers: idempotencyHeaders(idempotencyKey),
    }).then(r => r.data),
  update: (id: string, data: Partial<CreateAccountRequest>) =>
    api.put<AccountResponse>(`/api/v1/accounts/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/accounts/${id}`),
}
```

Again, verify the existing file for any additional methods (e.g. `get`, `patch`) and keep them.

- [ ] **Step 4: Type-check the shared package**

```bash
cd shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd shared
git add api/endpoints/transactions.ts api/endpoints/transfers.ts api/endpoints/accounts.ts
git commit -m "feat: add optional idempotencyKey parameter to create() API functions"
```

---

### Task 7: Mobile — Generate idempotency key before API call

> **Context:** The mutation queue currently auto-generates `id` inside `add()`. We change `add()` to require the caller to supply `id`, so the same key can be used for both the direct API call and the queued retry.

**Files:**
- Modify: `mobile/store/mutationQueue.ts`
- Modify: `mobile/features/transactions/AddTxSheet.tsx`
- Modify: `mobile/features/accounts/TransferSheet.tsx`
- Modify: `mobile/features/accounts/CreateAccountSheet.tsx`

- [ ] **Step 1: Update `mutationQueue.ts` — caller provides `id`**

```typescript
// mobile/store/mutationQueue.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CreateTransactionRequest, CreateTransferRequest, CreateAccountRequest } from '@xnoll/shared'

export type QueueItem =
  | { id: string; type: 'transaction'; payload: CreateTransactionRequest; queuedAt: string }
  | { id: string; type: 'transfer'; payload: CreateTransferRequest; queuedAt: string }
  | { id: string; type: 'account'; payload: CreateAccountRequest; queuedAt: string }

interface MutationQueueState {
  items: QueueItem[]
  add: (item: Omit<QueueItem, 'queuedAt'>) => void
  remove: (id: string) => void
}

export const useMutationQueue = create<MutationQueueState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set(s => ({
          items: [
            ...s.items,
            { ...item, queuedAt: new Date().toISOString() } as QueueItem,
          ],
        })),
      remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
    }),
    {
      name: 'xnoll-mutation-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

export function genKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
```

- [ ] **Step 2: Type-check to catch all call sites that need updating**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "mutationQueue|enqueue"
```

This will show all the places that currently call `enqueue({ type: ..., payload: ... })` without an `id` field.

- [ ] **Step 3: Update `AddTxSheet.tsx`**

In `mobile/features/transactions/AddTxSheet.tsx`, import `genKey` and update `handleCreate`:

```typescript
import { useMutationQueue, genKey } from '../../store/mutationQueue'
```

Replace the `handleCreate` function body (the entire function, keeping the same outer structure):

```typescript
async function handleCreate() {
  if (!amount || !selectedCategoryId || !accountId) {
    showToast('Заполните все поля', '#f87171')
    return
  }

  const key = genKey()
  const payload: CreateTransactionRequest = {
    account_id: accountId,
    category_id: selectedCategoryId,
    type: kind,
    amount: parseFloat(amount.replace(',', '.')).toFixed(2),
    date: selectedDate,
    description: description || undefined,
  }

  if (network !== 'online') {
    enqueue({ id: key, type: 'transaction', payload })
    showToast('Сохранено · отправится при появлении сети', '#f59e0b')
    reset()
    onCreated?.()
    return
  }

  setLoading(true)
  try {
    await transactionsApi.create(payload, key)
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
    showToast(kind === 'income' ? 'Доход добавлен' : 'Расход добавлен', '#34d399')
    reset()
    onCreated?.()
  } catch {
    enqueue({ id: key, type: 'transaction', payload })
    showToast('Нет связи · сохранено в очередь', '#f59e0b')
    reset()
    onCreated?.()
  } finally {
    setLoading(false)
  }
}
```

> Note: Read the current `AddTxSheet.tsx` first to confirm exact variable names for `accountId`, `selectedCategoryId`, `selectedDate`, etc. before editing.

- [ ] **Step 4: Update `TransferSheet.tsx`**

In `mobile/features/accounts/TransferSheet.tsx`, import `genKey`:

```typescript
import { useMutationQueue, genKey } from '../../store/mutationQueue'
```

Replace `handleCreate`:

```typescript
async function handleCreate() {
  if (!fromId || !toId || !amount) { showToast('Заполните все поля', '#f87171'); return }

  const key = genKey()
  const payload = {
    source_type: fromKind as SourceDestType,
    source_id: fromId,
    dest_type: toKind as SourceDestType,
    dest_id: toId,
    amount: parseFloat(amount.replace(',', '.')).toFixed(2),
    currency: 'RUB' as const,
    date: todayISO(),
  }

  if (network !== 'online') {
    enqueue({ id: key, type: 'transfer', payload })
    showToast('Сохранено · отправится при появлении сети', '#f59e0b')
    reset(); onCreated()
    return
  }

  setLoading(true)
  try {
    await transfersApi.create(payload, key)
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['transfers'] })
    showToast('Перевод выполнен', '#34d399')
    reset(); onCreated()
  } catch {
    enqueue({ id: key, type: 'transfer', payload })
    showToast('Нет связи · сохранено в очередь', '#f59e0b')
    reset(); onCreated()
  } finally { setLoading(false) }
}
```

- [ ] **Step 5: Update `CreateAccountSheet.tsx`**

In `mobile/features/accounts/CreateAccountSheet.tsx`, import `genKey`:

```typescript
import { useMutationQueue, genKey } from '../../store/mutationQueue'
```

Replace `handleCreate`:

```typescript
async function handleCreate() {
  if (!name) { showToast('Введите название', '#f87171'); return }
  const key = genKey()
  const payload = { name, bank_name: bank, currency, balance }

  if (network !== 'online') {
    enqueue({ id: key, type: 'account', payload })
    showToast('Сохранено · отправится при появлении сети', '#f59e0b')
    reset(); onCreated()
    return
  }

  setLoading(true)
  try {
    await accountsApi.create(payload, key)
    reset(); onCreated()
  } catch {
    enqueue({ id: key, type: 'account', payload })
    showToast('Нет связи · сохранено в очередь', '#f59e0b')
    reset(); onCreated()
  } finally { setLoading(false) }
}
```

- [ ] **Step 6: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: no new errors related to `mutationQueue`.

- [ ] **Step 7: Commit**

```bash
cd mobile
git add store/mutationQueue.ts \
        features/transactions/AddTxSheet.tsx \
        features/accounts/TransferSheet.tsx \
        features/accounts/CreateAccountSheet.tsx
git commit -m "feat: generate idempotency key before API call and pass same key to queue"
```

---

### Task 8: Mobile — Mutation sync sends idempotency key on retry

**Files:**
- Modify: `mobile/hooks/useMutationSync.ts`

> **Context:** `useMutationSync` processes queued items when the network comes back online. Each queue item already has an `id` that was generated before the original API call attempt. We now pass that `id` as `X-Idempotency-Key` so the backend deduplicates if the original request actually reached the server.

- [ ] **Step 1: Update `useMutationSync.ts`**

```typescript
// mobile/hooks/useMutationSync.ts
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { transactionsApi, transfersApi, accountsApi } from '@xnoll/shared'
import { useMutationQueue } from '../store/mutationQueue'
import { useNetworkStatus } from './useNetworkStatus'
import { useUIStore } from '../store/ui'

export function useMutationSync() {
  const qc = useQueryClient()
  const network = useNetworkStatus()
  const processing = useRef(false)
  const showToast = useUIStore.getState().showToast

  async function processQueue() {
    if (processing.current) return
    const { items, remove } = useMutationQueue.getState()
    if (items.length === 0) return

    processing.current = true
    let processed = 0

    for (const item of [...items]) {
      try {
        if (item.type === 'transaction') {
          await transactionsApi.create(item.payload, item.id)
        } else if (item.type === 'transfer') {
          await transfersApi.create(item.payload, item.id)
        } else if (item.type === 'account') {
          await accountsApi.create(item.payload, item.id)
        }
        remove(item.id)
        processed++
      } catch {
        // Stop on first failure — retry next time network comes back
        break
      }
    }

    if (processed > 0) {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      showToast(`Отправлено ${processed} операций из очереди`, '#34d399')
    }

    processing.current = false
  }

  useEffect(() => {
    if (network === 'online') processQueue()
  }, [network])
}
```

- [ ] **Step 2: Type-check**

```bash
cd mobile && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

1. Turn off WiFi on the device.
2. Create a transaction in the app — it should appear immediately with "Синхронизируется..." badge.
3. Turn WiFi back on — the transaction should sync (toast appears), the badge disappears.
4. Turn WiFi off, create the same transaction again (same fields). Turn WiFi on — it syncs. Check the backend list — only one transaction exists (idempotency worked).

- [ ] **Step 4: Commit**

```bash
cd mobile
git add hooks/useMutationSync.ts
git commit -m "feat: pass item.id as X-Idempotency-Key header on queue sync retry"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| No duplicate on retry after timeout | Tasks 4, 5, 8 |
| Same key returns cached response | Task 4, 5 |
| Key scoped to user (cross-user isolation) | Task 1 (fake repo test), Task 3 |
| POST /transactions idempotent | Task 4 |
| POST /transfers idempotent | Task 5 |
| POST /accounts idempotent | Task 5 |
| Shared API accepts idempotency key | Task 6 |
| Mobile generates key before attempt | Task 7 |
| Mobile retries with same key | Task 8 |
| DB migration for new table | Task 2 |
| Existing tests don't break | Tasks 4, 5 (regression checks) |

### 2. Type consistency

- `QueueItem.id` — used as idempotency key throughout Tasks 7 and 8 ✓
- `genKey()` — defined in `mutationQueue.ts` Task 7, imported in sheets Task 7 ✓
- `transactionsApi.create(payload, key)` — signature defined Task 6, used Tasks 7 and 8 ✓
- `IdempotencyRecord` — defined Task 1, used in Tasks 4 and 5 ✓
- `IdempotencyContext` — defined Task 3, used in Tasks 4 and 5 ✓
- `get_idempotency_context` — defined Task 3, depends on `get_idempotency_repository` which is wired in `dependencies.py` Task 3 ✓

### 3. No placeholders

All code blocks contain complete, working implementations. No "TBD" or "add appropriate handling" stubs.
