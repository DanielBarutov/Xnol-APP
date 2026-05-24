# Savings Accounts + Transfers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two modules — `accounts` (savings accounts with soft delete, cached balances) and `transfers` (money movements that auto-update account balances) — following the Clean Architecture pattern from Plans 01–02.

**Architecture:** Two modules under `app/modules/`: `accounts` is fully self-contained; `transfers` injects `IAccountRepository` (from accounts domain) to update balances on create/edit/delete — same cross-module pattern as transactions → categories. Balance is stored as a denormalized cache in `savings_accounts.balance`, updated atomically via SQL arithmetic. Deposit endpoints accepted in transfers but balance not updated (deferred to Plan 04).

**Tech Stack:** Python 3.12, FastAPI 0.115, SQLAlchemy 2.0 async, Alembic, Pydantic v2, pytest + pytest-asyncio (`asyncio_mode = auto`)

---

## Sub-Plan Series

| # | Plan | Status |
|---|---|---|
| 01 | Backend Foundation + Auth | ✅ Done |
| 02 | Categories + Transactions | ✅ Done |
| **03** | **Savings Accounts + Transfers** | ← you are here |
| 04 | Deposits Module | |
| 05 | Statistics Module | |
| 06 | Frontend Foundation | |
| 07 | Frontend Screens | |

---

## File Map

```
backend/
├── app/
│   ├── dependencies.py                          MODIFY: add get_account_repository, get_transfer_repository
│   ├── main.py                                  MODIFY: register two new routers
│   └── modules/
│       ├── accounts/
│       │   ├── __init__.py
│       │   ├── domain/
│       │   │   ├── __init__.py
│       │   │   ├── entities.py                  Account dataclass
│       │   │   └── interfaces.py                IAccountRepository ABC
│       │   ├── application/
│       │   │   ├── __init__.py
│       │   │   ├── dtos.py                      AccountDTO, CreateAccountDTO, UpdateAccountDTO
│       │   │   └── use_cases.py                 List/Create/Update/Delete use cases
│       │   ├── infrastructure/
│       │   │   ├── __init__.py
│       │   │   ├── models.py                    AccountModel (SQLAlchemy)
│       │   │   ├── fake_repository.py           FakeAccountRepository
│       │   │   └── repository.py                SQLAlchemyAccountRepository
│       │   └── presentation/
│       │       ├── __init__.py
│       │       ├── schemas.py                   CreateAccountRequest, UpdateAccountRequest, AccountResponse
│       │       └── router.py                    FastAPI router at /api/v1/accounts
│       └── transfers/
│           ├── __init__.py
│           ├── domain/
│           │   ├── __init__.py
│           │   ├── entities.py                  Transfer dataclass
│           │   └── interfaces.py                ITransferRepository ABC
│           ├── application/
│           │   ├── __init__.py
│           │   ├── dtos.py                      TransferDTO, CreateTransferDTO, UpdateTransferDTO
│           │   └── use_cases.py                 List/Create/Update/Delete use cases + balance helpers
│           ├── infrastructure/
│           │   ├── __init__.py
│           │   ├── models.py                    TransferModel (SQLAlchemy)
│           │   ├── fake_repository.py           FakeTransferRepository
│           │   └── repository.py                SQLAlchemyTransferRepository
│           └── presentation/
│               ├── __init__.py
│               ├── schemas.py                   CreateTransferRequest, UpdateTransferRequest, TransferResponse
│               └── router.py                    FastAPI router at /api/v1/transfers
├── migrations/
│   ├── env.py                                   MODIFY: import AccountModel, TransferModel
│   └── versions/
│       ├── <hash>_savings_accounts_schema.py    auto-generated
│       └── <hash>_transfers_schema.py           auto-generated (verify enum handling)
└── tests/
    ├── unit/
    │   ├── accounts/
    │   │   ├── __init__.py
    │   │   └── test_use_cases.py
    │   └── transfers/
    │       ├── __init__.py
    │       └── test_use_cases.py
    └── integration/
        ├── accounts/
        │   ├── __init__.py
        │   ├── conftest.py
        │   └── test_accounts_router.py
        └── transfers/
            ├── __init__.py
            ├── conftest.py
            └── test_transfers_router.py
```

---

### Task 1: Accounts Domain Layer

**Files:**
- Create: `backend/app/modules/accounts/__init__.py`
- Create: `backend/app/modules/accounts/domain/__init__.py`
- Create: `backend/app/modules/accounts/domain/entities.py`
- Create: `backend/app/modules/accounts/domain/interfaces.py`

- [ ] **Step 1: Create `backend/app/modules/accounts/__init__.py`** (empty)

- [ ] **Step 2: Create `backend/app/modules/accounts/domain/__init__.py`** (empty)

- [ ] **Step 3: Create `backend/app/modules/accounts/domain/entities.py`**

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Account:
    user_id: UUID
    name: str
    bank_name: str
    currency: str
    balance: Decimal
    id: UUID = field(default_factory=uuid4)
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 4: Create `backend/app/modules/accounts/domain/interfaces.py`**

```python
from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.entities import Account


class IAccountRepository(ABC):
    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Account]:
        """Returns active accounts (deleted_at IS NULL) for the user."""
        ...

    @abstractmethod
    async def find_by_id(self, account_id: UUID) -> Account | None:
        """Returns account regardless of deleted_at status."""
        ...

    @abstractmethod
    async def create(self, account: Account) -> Account: ...

    @abstractmethod
    async def update(self, account: Account) -> Account:
        """Updates name, bank_name, balance only. Preserves currency/user_id/created_at."""
        ...

    @abstractmethod
    async def soft_delete(self, account_id: UUID, deleted_at: datetime) -> None: ...

    @abstractmethod
    async def update_balance(self, account_id: UUID, delta: Decimal) -> None:
        """Atomically adds delta to balance (delta can be negative)."""
        ...
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/accounts/
git commit -m "feat: accounts domain layer — entity, IAccountRepository"
```

---

### Task 2: Accounts Infrastructure (Models + Repos)

**Files:**
- Create: `backend/app/modules/accounts/infrastructure/__init__.py`
- Create: `backend/app/modules/accounts/infrastructure/models.py`
- Create: `backend/app/modules/accounts/infrastructure/fake_repository.py`
- Create: `backend/app/modules/accounts/infrastructure/repository.py`

- [ ] **Step 1: Create `backend/app/modules/accounts/infrastructure/__init__.py`** (empty)

- [ ] **Step 2: Create `backend/app/modules/accounts/infrastructure/models.py`**

```python
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base_model import Base


class AccountModel(Base):
    __tablename__ = "savings_accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    bank_name: Mapped[str] = mapped_column(String(100))
    balance: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    currency: Mapped[str] = mapped_column(String(3))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 3: Create `backend/app/modules/accounts/infrastructure/fake_repository.py`**

```python
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.shared.exceptions import NotFoundError


class FakeAccountRepository(IAccountRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Account] = {}

    async def list_for_user(self, user_id: UUID) -> list[Account]:
        return [
            a for a in self._store.values()
            if a.user_id == user_id and a.deleted_at is None
        ]

    async def find_by_id(self, account_id: UUID) -> Account | None:
        return self._store.get(account_id)

    async def create(self, account: Account) -> Account:
        self._store[account.id] = account
        return account

    async def update(self, account: Account) -> Account:
        if account.id not in self._store:
            raise NotFoundError("Account", str(account.id))
        old = self._store[account.id]
        self._store[account.id] = Account(
            id=old.id,
            user_id=old.user_id,
            currency=old.currency,
            created_at=old.created_at,
            deleted_at=old.deleted_at,
            name=account.name,
            bank_name=account.bank_name,
            balance=account.balance,
        )
        return self._store[account.id]

    async def soft_delete(self, account_id: UUID, deleted_at: datetime) -> None:
        if account_id not in self._store:
            raise NotFoundError("Account", str(account_id))
        old = self._store[account_id]
        self._store[account_id] = Account(
            id=old.id,
            user_id=old.user_id,
            name=old.name,
            bank_name=old.bank_name,
            balance=old.balance,
            currency=old.currency,
            created_at=old.created_at,
            deleted_at=deleted_at,
        )

    async def update_balance(self, account_id: UUID, delta: Decimal) -> None:
        if account_id not in self._store:
            raise NotFoundError("Account", str(account_id))
        old = self._store[account_id]
        self._store[account_id] = Account(
            id=old.id,
            user_id=old.user_id,
            name=old.name,
            bank_name=old.bank_name,
            balance=old.balance + delta,
            currency=old.currency,
            created_at=old.created_at,
            deleted_at=old.deleted_at,
        )
```

- [ ] **Step 4: Create `backend/app/modules/accounts/infrastructure/repository.py`**

```python
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.infrastructure.models import AccountModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: AccountModel) -> Account:
    return Account(
        id=m.id,
        user_id=m.user_id,
        name=m.name,
        bank_name=m.bank_name,
        balance=m.balance,
        currency=m.currency,
        deleted_at=m.deleted_at,
        created_at=m.created_at,
    )


class SQLAlchemyAccountRepository(IAccountRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: UUID) -> list[Account]:
        result = await self._session.execute(
            select(AccountModel)
            .where(AccountModel.user_id == user_id, AccountModel.deleted_at.is_(None))
            .order_by(AccountModel.created_at.asc())
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, account_id: UUID) -> Account | None:
        result = await self._session.execute(
            select(AccountModel).where(AccountModel.id == account_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, account: Account) -> Account:
        model = AccountModel(
            id=account.id,
            user_id=account.user_id,
            name=account.name,
            bank_name=account.bank_name,
            balance=account.balance,
            currency=account.currency,
            created_at=account.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, account: Account) -> Account:
        result = await self._session.execute(
            select(AccountModel).where(AccountModel.id == account.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Account", str(account.id))
        model.name = account.name
        model.bank_name = account.bank_name
        model.balance = account.balance
        await self._session.flush()
        return _to_entity(model)

    async def soft_delete(self, account_id: UUID, deleted_at: datetime) -> None:
        result = await self._session.execute(
            select(AccountModel).where(AccountModel.id == account_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Account", str(account_id))
        model.deleted_at = deleted_at
        await self._session.flush()

    async def update_balance(self, account_id: UUID, delta: Decimal) -> None:
        await self._session.execute(
            sa_update(AccountModel)
            .where(AccountModel.id == account_id)
            .values(balance=AccountModel.balance + delta)
        )
        await self._session.flush()
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/accounts/infrastructure/
git commit -m "feat: accounts infrastructure — SQLAlchemy model, real repo, fake repo"
```

---

### Task 3: Accounts Migration

**Files:**
- Modify: `backend/migrations/env.py`
- Auto-generated: `backend/migrations/versions/<hash>_savings_accounts_schema.py`

- [ ] **Step 1: Add AccountModel import to `backend/migrations/env.py`**

Add after the existing transactions import:

```python
import app.modules.accounts.infrastructure.models  # noqa: F401
```

Full updated file:

```python
import asyncio
from logging.config import fileConfig
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.shared.base_model import Base
import app.modules.auth.infrastructure.models  # noqa: F401
import app.modules.categories.infrastructure.models  # noqa: F401
import app.modules.transactions.infrastructure.models  # noqa: F401
import app.modules.accounts.infrastructure.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 2: Generate schema migration**

```bash
docker compose exec api bash -c "cd /app && alembic revision --autogenerate -m 'savings_accounts_schema'"
```

Expected: creates `backend/migrations/versions/<hash>_savings_accounts_schema.py` with a `create_table("savings_accounts", ...)` call.

- [ ] **Step 3: Apply migration**

```bash
docker compose exec api bash -c "cd /app && alembic upgrade head"
```

Expected: `Running upgrade ... -> <hash>`, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/
git commit -m "feat: savings_accounts schema migration"
```

---

### Task 4: Accounts Application Layer + Unit Tests

**Files:**
- Create: `backend/app/modules/accounts/application/__init__.py`
- Create: `backend/app/modules/accounts/application/dtos.py`
- Create: `backend/app/modules/accounts/application/use_cases.py`
- Create: `backend/tests/unit/accounts/__init__.py`
- Create: `backend/tests/unit/accounts/test_use_cases.py`

- [ ] **Step 1: Create `backend/app/modules/accounts/application/__init__.py`** (empty)

- [ ] **Step 2: Write failing tests first**

Create `backend/tests/unit/accounts/__init__.py` (empty).

Create `backend/tests/unit/accounts/test_use_cases.py`:

```python
import pytest
from decimal import Decimal
from uuid import uuid4

from app.modules.accounts.application.dtos import CreateAccountDTO, UpdateAccountDTO
from app.modules.accounts.application.use_cases import (
    CreateAccountUseCase,
    DeleteAccountUseCase,
    ListAccountsUseCase,
    UpdateAccountUseCase,
)
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.shared.exceptions import NotFoundError


async def test_create_account() -> None:
    repo = FakeAccountRepository()
    dto = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(
            user_id=uuid4(),
            name="Сбербанк",
            bank_name="Сбербанк",
            currency="RUB",
            balance=Decimal("50000.00"),
        )
    )
    assert dto.name == "Сбербанк"
    assert dto.balance == Decimal("50000.00")
    assert dto.currency == "RUB"


async def test_list_returns_only_active() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    dto1 = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    dto2 = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="B", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    await DeleteAccountUseCase(repo).execute(dto2.id, user_id)
    result = await ListAccountsUseCase(repo).execute(user_id)
    assert len(result) == 1
    assert result[0].id == dto1.id


async def test_update_account() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="Old", bank_name="Bank", currency="RUB", balance=Decimal("100"))
    )
    updated = await UpdateAccountUseCase(repo).execute(
        UpdateAccountDTO(account_id=created.id, user_id=user_id, name="New", balance=Decimal("200"))
    )
    assert updated.name == "New"
    assert updated.balance == Decimal("200")
    assert updated.currency == "RUB"  # currency is immutable


async def test_soft_delete_hides_account() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    await DeleteAccountUseCase(repo).execute(created.id, user_id)
    result = await ListAccountsUseCase(repo).execute(user_id)
    assert len(result) == 0


async def test_update_deleted_account_raises() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    await DeleteAccountUseCase(repo).execute(created.id, user_id)
    with pytest.raises(NotFoundError):
        await UpdateAccountUseCase(repo).execute(
            UpdateAccountDTO(account_id=created.id, user_id=user_id, name="X")
        )


async def test_update_other_user_account_raises() -> None:
    repo = FakeAccountRepository()
    user_a, user_b = uuid4(), uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_a, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    with pytest.raises(NotFoundError):
        await UpdateAccountUseCase(repo).execute(
            UpdateAccountDTO(account_id=created.id, user_id=user_b, name="X")
        )


async def test_delete_other_user_account_raises() -> None:
    repo = FakeAccountRepository()
    user_a, user_b = uuid4(), uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_a, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    with pytest.raises(NotFoundError):
        await DeleteAccountUseCase(repo).execute(created.id, user_b)
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
docker compose exec api bash -c "cd /app && pytest tests/unit/accounts/ -v"
```

Expected: `ImportError` or `ModuleNotFoundError` (dtos/use_cases don't exist yet).

- [ ] **Step 4: Create `backend/app/modules/accounts/application/dtos.py`**

```python
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class AccountDTO:
    id: UUID
    user_id: UUID
    name: str
    bank_name: str
    balance: Decimal
    currency: str
    created_at: datetime


@dataclass
class CreateAccountDTO:
    user_id: UUID
    name: str
    bank_name: str
    currency: str
    balance: Decimal


@dataclass
class UpdateAccountDTO:
    account_id: UUID
    user_id: UUID
    name: str | None = None
    bank_name: str | None = None
    balance: Decimal | None = None
```

- [ ] **Step 5: Create `backend/app/modules/accounts/application/use_cases.py`**

```python
from datetime import datetime, timezone
from uuid import UUID

from app.modules.accounts.application.dtos import AccountDTO, CreateAccountDTO, UpdateAccountDTO
from app.modules.accounts.domain.entities import Account
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.shared.exceptions import NotFoundError


def _to_dto(a: Account) -> AccountDTO:
    return AccountDTO(
        id=a.id,
        user_id=a.user_id,
        name=a.name,
        bank_name=a.bank_name,
        balance=a.balance,
        currency=a.currency,
        created_at=a.created_at,
    )


class ListAccountsUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[AccountDTO]:
        accounts = await self._repo.list_for_user(user_id)
        return [_to_dto(a) for a in accounts]


class CreateAccountUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, dto: CreateAccountDTO) -> AccountDTO:
        account = Account(
            user_id=dto.user_id,
            name=dto.name,
            bank_name=dto.bank_name,
            currency=dto.currency,
            balance=dto.balance,
        )
        saved = await self._repo.create(account)
        return _to_dto(saved)


class UpdateAccountUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, dto: UpdateAccountDTO) -> AccountDTO:
        account = await self._repo.find_by_id(dto.account_id)
        if account is None or account.deleted_at is not None:
            raise NotFoundError("Account", str(dto.account_id))
        if account.user_id != dto.user_id:
            raise NotFoundError("Account", str(dto.account_id))
        updated = Account(
            id=account.id,
            user_id=account.user_id,
            currency=account.currency,
            created_at=account.created_at,
            deleted_at=account.deleted_at,
            name=dto.name if dto.name is not None else account.name,
            bank_name=dto.bank_name if dto.bank_name is not None else account.bank_name,
            balance=dto.balance if dto.balance is not None else account.balance,
        )
        saved = await self._repo.update(updated)
        return _to_dto(saved)


class DeleteAccountUseCase:
    def __init__(self, repo: IAccountRepository) -> None:
        self._repo = repo

    async def execute(self, account_id: UUID, user_id: UUID) -> None:
        account = await self._repo.find_by_id(account_id)
        if account is None or account.deleted_at is not None:
            raise NotFoundError("Account", str(account_id))
        if account.user_id != user_id:
            raise NotFoundError("Account", str(account_id))
        await self._repo.soft_delete(account_id, datetime.now(timezone.utc))
```

- [ ] **Step 6: Run tests — confirm all pass**

```bash
docker compose exec api bash -c "cd /app && pytest tests/unit/accounts/ -v"
```

Expected: `7 passed`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/accounts/application/ backend/tests/unit/accounts/
git commit -m "feat: accounts application layer — DTOs, use cases; unit tests"
```

---

### Task 5: Accounts Presentation + DI

**Files:**
- Create: `backend/app/modules/accounts/presentation/__init__.py`
- Create: `backend/app/modules/accounts/presentation/schemas.py`
- Create: `backend/app/modules/accounts/presentation/router.py`
- Modify: `backend/app/dependencies.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/modules/accounts/presentation/__init__.py`** (empty)

- [ ] **Step 2: Create `backend/app/modules/accounts/presentation/schemas.py`**

```python
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class CreateAccountRequest(BaseModel):
    name: str
    bank_name: str
    currency: str
    balance: Decimal


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    bank_name: str | None = None
    balance: Decimal | None = None


class AccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    bank_name: str
    balance: Decimal
    currency: str
    created_at: datetime
```

- [ ] **Step 3: Create `backend/app/modules/accounts/presentation/router.py`**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_account_repository, get_current_user_id
from app.modules.accounts.application.dtos import CreateAccountDTO, UpdateAccountDTO
from app.modules.accounts.application.use_cases import (
    CreateAccountUseCase,
    DeleteAccountUseCase,
    ListAccountsUseCase,
    UpdateAccountUseCase,
)
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.presentation.schemas import (
    AccountResponse,
    CreateAccountRequest,
    UpdateAccountRequest,
)
from app.shared.exceptions import NotFoundError

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


def _map_dto(dto) -> AccountResponse:
    return AccountResponse(
        id=dto.id,
        user_id=dto.user_id,
        name=dto.name,
        bank_name=dto.bank_name,
        balance=dto.balance,
        currency=dto.currency,
        created_at=dto.created_at,
    )


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> list[AccountResponse]:
    dtos = await ListAccountsUseCase(repo).execute(user_id)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    body: CreateAccountRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> AccountResponse:
    dto = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(
            user_id=user_id,
            name=body.name,
            bank_name=body.bank_name,
            currency=body.currency,
            balance=body.balance,
        )
    )
    return _map_dto(dto)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID,
    body: UpdateAccountRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> AccountResponse:
    try:
        dto = await UpdateAccountUseCase(repo).execute(
            UpdateAccountDTO(
                account_id=account_id,
                user_id=user_id,
                name=body.name,
                bank_name=body.bank_name,
                balance=body.balance,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: IAccountRepository = Depends(get_account_repository),
) -> None:
    try:
        await DeleteAccountUseCase(repo).execute(account_id, user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
```

- [ ] **Step 4: Update `backend/app/dependencies.py`**

```python
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.modules.auth.application.services import JWTService
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.auth.infrastructure.repository import SQLAlchemyUserRepository
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.categories.infrastructure.repository import SQLAlchemyCategoryRepository
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.modules.transactions.infrastructure.repository import SQLAlchemyTransactionRepository
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.accounts.infrastructure.repository import SQLAlchemyAccountRepository

_bearer = HTTPBearer()

_fake_user_repo = FakeUserRepository()
_fake_category_repo = FakeCategoryRepository()
_fake_transaction_repo = FakeTransactionRepository()
_fake_account_repo = FakeAccountRepository()


def get_user_repository(db: AsyncSession = Depends(get_db)) -> IUserRepository:
    if settings.use_fake_repo:
        return _fake_user_repo
    return SQLAlchemyUserRepository(db)


def get_category_repository(db: AsyncSession = Depends(get_db)) -> ICategoryRepository:
    if settings.use_fake_repo:
        return _fake_category_repo
    return SQLAlchemyCategoryRepository(db)


def get_transaction_repository(db: AsyncSession = Depends(get_db)) -> ITransactionRepository:
    if settings.use_fake_repo:
        return _fake_transaction_repo
    return SQLAlchemyTransactionRepository(db)


def get_account_repository(db: AsyncSession = Depends(get_db)) -> IAccountRepository:
    if settings.use_fake_repo:
        return _fake_account_repo
    return SQLAlchemyAccountRepository(db)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> UUID:
    try:
        payload = JWTService.decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        return UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
```

- [ ] **Step 5: Update `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.modules.auth.presentation.router import router as auth_router
from app.modules.categories.presentation.router import router as categories_router
from app.modules.transactions.presentation.router import router as transactions_router
from app.modules.accounts.presentation.router import router as accounts_router

app = FastAPI(title="XNoll Finance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(accounts_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/modules/accounts/presentation/ backend/app/dependencies.py backend/app/main.py
git commit -m "feat: accounts presentation layer — router, schemas, DI wiring"
```

---

### Task 6: Accounts Integration Tests

**Files:**
- Create: `backend/tests/integration/accounts/__init__.py`
- Create: `backend/tests/integration/accounts/conftest.py`
- Create: `backend/tests/integration/accounts/test_accounts_router.py`

- [ ] **Step 1: Create `backend/tests/integration/accounts/__init__.py`** (empty)

- [ ] **Step 2: Create `backend/tests/integration/accounts/conftest.py`**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.dependencies import get_user_repository, get_account_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository


@pytest.fixture
def fake_account_repo():
    return FakeAccountRepository()


@pytest.fixture
async def client(fake_account_repo):
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "account@example.com", "password": "pass1234",
        "full_name": "Account User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "account@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

- [ ] **Step 3: Create `backend/tests/integration/accounts/test_accounts_router.py`**

```python
from uuid import uuid4
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"

VALID_PAYLOAD = {
    "name": "Сбербанк основной",
    "bank_name": "Сбербанк",
    "currency": "RUB",
    "balance": "50000.00",
}


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(ACCOUNTS_URL)
    assert resp.status_code == 403


async def test_create_account_returns_201(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Сбербанк основной"
    assert data["balance"] == "50000.00"
    assert data["currency"] == "RUB"
    assert "id" in data


async def test_list_accounts(client: AsyncClient, auth_headers: dict) -> None:
    await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    await client.post(ACCOUNTS_URL, headers=auth_headers, json={**VALID_PAYLOAD, "name": "Тинькофф"})
    resp = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_update_account(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]
    resp = await client.put(f"{ACCOUNTS_URL}/{account_id}", headers=auth_headers, json={"name": "Новое имя"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Новое имя"
    assert resp.json()["currency"] == "RUB"  # immutable


async def test_delete_account_returns_204(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]
    resp = await client.delete(f"{ACCOUNTS_URL}/{account_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_deleted_account_gone_from_list(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(ACCOUNTS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]
    await client.delete(f"{ACCOUNTS_URL}/{account_id}", headers=auth_headers)
    resp = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert all(a["id"] != account_id for a in resp.json())


async def test_delete_nonexistent_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.delete(f"{ACCOUNTS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_other_user_account_returns_404(client: AsyncClient) -> None:
    # Register two users
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

    create_resp = await client.post(ACCOUNTS_URL, headers=headers_a, json=VALID_PAYLOAD)
    account_id = create_resp.json()["id"]

    resp = await client.delete(f"{ACCOUNTS_URL}/{account_id}", headers=headers_b)
    assert resp.status_code == 404
```

- [ ] **Step 4: Run all tests**

```bash
docker compose exec api bash -c "cd /app && pytest tests/ -v"
```

Expected: all previous 64 tests pass + 7 new unit + 7 new integration = **78 passed**.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/integration/accounts/
git commit -m "test: accounts integration tests"
```

---

### Task 7: Transfers Domain + Infrastructure

**Files:**
- Create: `backend/app/modules/transfers/__init__.py`
- Create: `backend/app/modules/transfers/domain/__init__.py`
- Create: `backend/app/modules/transfers/domain/entities.py`
- Create: `backend/app/modules/transfers/domain/interfaces.py`
- Create: `backend/app/modules/transfers/infrastructure/__init__.py`
- Create: `backend/app/modules/transfers/infrastructure/models.py`
- Create: `backend/app/modules/transfers/infrastructure/fake_repository.py`
- Create: `backend/app/modules/transfers/infrastructure/repository.py`

- [ ] **Step 1: Create `__init__.py` stubs**

Create (all empty):
- `backend/app/modules/transfers/__init__.py`
- `backend/app/modules/transfers/domain/__init__.py`
- `backend/app/modules/transfers/infrastructure/__init__.py`

- [ ] **Step 2: Create `backend/app/modules/transfers/domain/entities.py`**

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass
class Transfer:
    user_id: UUID
    source_type: str  # "savings_account" | "deposit" | "external"
    dest_type: str
    amount: Decimal
    currency: str
    date: date
    id: UUID = field(default_factory=uuid4)
    source_id: UUID | None = None
    source_label: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    description: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
```

- [ ] **Step 3: Create `backend/app/modules/transfers/domain/interfaces.py`**

```python
from abc import ABC, abstractmethod
from uuid import UUID

from app.modules.transfers.domain.entities import Transfer


class ITransferRepository(ABC):
    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[Transfer]:
        """Returns all user's transfers ordered by date DESC, created_at DESC."""
        ...

    @abstractmethod
    async def find_by_id(self, transfer_id: UUID) -> Transfer | None: ...

    @abstractmethod
    async def create(self, transfer: Transfer) -> Transfer: ...

    @abstractmethod
    async def update(self, transfer: Transfer) -> Transfer: ...

    @abstractmethod
    async def delete(self, transfer_id: UUID) -> None: ...
```

- [ ] **Step 4: Create `backend/app/modules/transfers/infrastructure/models.py`**

Note: `source_type` and `dest_type` share the same PostgreSQL enum type `transfer_endpoint_enum`. Use `create_type=False` on the second column so SQLAlchemy doesn't try to CREATE the type twice.

```python
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base

_endpoint_enum = Enum(
    "savings_account", "deposit", "external",
    name="transfer_endpoint_enum",
)


class TransferModel(Base):
    __tablename__ = "transfers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[str] = mapped_column(_endpoint_enum)
    source_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dest_type: Mapped[str] = mapped_column(
        Enum("savings_account", "deposit", "external",
             name="transfer_endpoint_enum", create_type=False)
    )
    dest_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    dest_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    currency: Mapped[str] = mapped_column(String(3))
    date: Mapped[date] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 5: Create `backend/app/modules/transfers/infrastructure/fake_repository.py`**

```python
from uuid import UUID

from app.modules.transfers.domain.entities import Transfer
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.shared.exceptions import NotFoundError


class FakeTransferRepository(ITransferRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, Transfer] = {}

    async def list_for_user(self, user_id: UUID) -> list[Transfer]:
        txfrs = [t for t in self._store.values() if t.user_id == user_id]
        return sorted(txfrs, key=lambda t: (t.date, t.created_at), reverse=True)

    async def find_by_id(self, transfer_id: UUID) -> Transfer | None:
        return self._store.get(transfer_id)

    async def create(self, transfer: Transfer) -> Transfer:
        self._store[transfer.id] = transfer
        return transfer

    async def update(self, transfer: Transfer) -> Transfer:
        if transfer.id not in self._store:
            raise NotFoundError("Transfer", str(transfer.id))
        self._store[transfer.id] = transfer
        return transfer

    async def delete(self, transfer_id: UUID) -> None:
        if transfer_id not in self._store:
            raise NotFoundError("Transfer", str(transfer_id))
        del self._store[transfer_id]
```

- [ ] **Step 6: Create `backend/app/modules/transfers/infrastructure/repository.py`**

```python
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.transfers.domain.entities import Transfer
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.modules.transfers.infrastructure.models import TransferModel
from app.shared.exceptions import NotFoundError


def _to_entity(m: TransferModel) -> Transfer:
    return Transfer(
        id=m.id,
        user_id=m.user_id,
        source_type=m.source_type,
        source_id=m.source_id,
        source_label=m.source_label,
        dest_type=m.dest_type,
        dest_id=m.dest_id,
        dest_label=m.dest_label,
        amount=m.amount,
        currency=m.currency,
        date=m.date,
        description=m.description,
        created_at=m.created_at,
    )


class SQLAlchemyTransferRepository(ITransferRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_user(self, user_id: UUID) -> list[Transfer]:
        result = await self._session.execute(
            select(TransferModel)
            .where(TransferModel.user_id == user_id)
            .order_by(TransferModel.date.desc(), TransferModel.created_at.desc())
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def find_by_id(self, transfer_id: UUID) -> Transfer | None:
        result = await self._session.execute(
            select(TransferModel).where(TransferModel.id == transfer_id)
        )
        m = result.scalar_one_or_none()
        return _to_entity(m) if m else None

    async def create(self, transfer: Transfer) -> Transfer:
        model = TransferModel(
            id=transfer.id,
            user_id=transfer.user_id,
            source_type=transfer.source_type,
            source_id=transfer.source_id,
            source_label=transfer.source_label,
            dest_type=transfer.dest_type,
            dest_id=transfer.dest_id,
            dest_label=transfer.dest_label,
            amount=transfer.amount,
            currency=transfer.currency,
            date=transfer.date,
            description=transfer.description,
            created_at=transfer.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def update(self, transfer: Transfer) -> Transfer:
        result = await self._session.execute(
            select(TransferModel).where(TransferModel.id == transfer.id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Transfer", str(transfer.id))
        model.source_type = transfer.source_type
        model.source_id = transfer.source_id
        model.source_label = transfer.source_label
        model.dest_type = transfer.dest_type
        model.dest_id = transfer.dest_id
        model.dest_label = transfer.dest_label
        model.amount = transfer.amount
        model.currency = transfer.currency
        model.date = transfer.date
        model.description = transfer.description
        await self._session.flush()
        return _to_entity(model)

    async def delete(self, transfer_id: UUID) -> None:
        result = await self._session.execute(
            select(TransferModel).where(TransferModel.id == transfer_id)
        )
        model = result.scalar_one_or_none()
        if model is None:
            raise NotFoundError("Transfer", str(transfer_id))
        await self._session.delete(model)
        await self._session.flush()
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/transfers/
git commit -m "feat: transfers domain + infrastructure — entity, interface, models, repos"
```

---

### Task 8: Transfers Migration

**Files:**
- Modify: `backend/migrations/env.py`
- Auto-generated: `backend/migrations/versions/<hash>_transfers_schema.py`

- [ ] **Step 1: Add TransferModel import to `backend/migrations/env.py`**

Add after accounts import:

```python
import app.modules.transfers.infrastructure.models  # noqa: F401
```

Full updated file:

```python
import asyncio
from logging.config import fileConfig
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.shared.base_model import Base
import app.modules.auth.infrastructure.models  # noqa: F401
import app.modules.categories.infrastructure.models  # noqa: F401
import app.modules.transactions.infrastructure.models  # noqa: F401
import app.modules.accounts.infrastructure.models  # noqa: F401
import app.modules.transfers.infrastructure.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 2: Generate transfers migration**

```bash
docker compose exec api bash -c "cd /app && alembic revision --autogenerate -m 'transfers_schema'"
```

Expected: creates `backend/migrations/versions/<hash>_transfers_schema.py`.

- [ ] **Step 3: Verify enum handling in the generated migration**

Open the generated migration file and check that `transfer_endpoint_enum` is created exactly once. The migration's `upgrade()` should look like this (if autogenerate got it wrong, fix it manually):

```python
import sqlalchemy as sa
from alembic import op


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
```

If autogenerate produces a different structure (e.g., creates the enum twice), fix it to match the above pattern.

- [ ] **Step 4: Apply migration**

```bash
docker compose exec api bash -c "cd /app && alembic upgrade head"
```

Expected: no errors, `transfers` table and `transfer_endpoint_enum` created.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/
git commit -m "feat: transfers schema migration"
```

---

### Task 9: Transfers Application Layer + Unit Tests

**Files:**
- Create: `backend/app/modules/transfers/application/__init__.py`
- Create: `backend/app/modules/transfers/application/dtos.py`
- Create: `backend/app/modules/transfers/application/use_cases.py`
- Create: `backend/tests/unit/transfers/__init__.py`
- Create: `backend/tests/unit/transfers/test_use_cases.py`

- [ ] **Step 1: Create `backend/app/modules/transfers/application/__init__.py`** (empty)

- [ ] **Step 2: Write failing tests first**

Create `backend/tests/unit/transfers/__init__.py` (empty).

Create `backend/tests/unit/transfers/test_use_cases.py`:

```python
import datetime
import pytest
from decimal import Decimal
from uuid import uuid4

from app.modules.accounts.application.dtos import CreateAccountDTO
from app.modules.accounts.application.use_cases import CreateAccountUseCase
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.transfers.application.dtos import CreateTransferDTO, UpdateTransferDTO
from app.modules.transfers.application.use_cases import (
    CreateTransferUseCase,
    DeleteTransferUseCase,
    UpdateTransferUseCase,
)
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository
from app.shared.exceptions import ConflictError, NotFoundError


async def _make_account(
    account_repo: FakeAccountRepository,
    user_id,
    balance: Decimal = Decimal("10000"),
):
    return await CreateAccountUseCase(account_repo).execute(
        CreateAccountDTO(
            user_id=user_id, name="Test", bank_name="Bank",
            currency="RUB", balance=balance,
        )
    )


async def test_create_savings_to_savings_updates_both_balances() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc_a = await _make_account(account_repo, user_id, Decimal("10000"))
    acc_b = await _make_account(account_repo, user_id, Decimal("5000"))

    await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc_a.id,
            dest_type="savings_account", dest_id=acc_b.id,
            amount=Decimal("3000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = {a.id: a for a in await account_repo.list_for_user(user_id)}
    assert accounts[acc_a.id].balance == Decimal("7000")
    assert accounts[acc_b.id].balance == Decimal("8000")


async def test_create_savings_to_external_updates_source_only() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc.id,
            dest_type="external", dest_label="Наличные",
            amount=Decimal("2000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("8000")


async def test_create_external_to_savings_updates_dest_only() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("5000"))

    await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="external", source_label="Зарплата",
            dest_type="savings_account", dest_id=acc.id,
            amount=Decimal("15000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("20000")


async def test_create_external_to_external_no_balance_change() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="external", source_label="A",
            dest_type="external", dest_label="B",
            amount=Decimal("1000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("10000")  # unchanged


async def test_create_savings_to_deposit_updates_source_only() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))
    deposit_id = uuid4()  # deposit doesn't exist yet (Plan 04), no validation

    await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc.id,
            dest_type="deposit", dest_id=deposit_id,
            amount=Decimal("3000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("7000")


async def test_delete_transfer_reverts_balance() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    transfer = await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc.id,
            dest_type="external", dest_label="ATM",
            amount=Decimal("2000"), currency="RUB",
            date=datetime.date.today(),
        )
    )
    # Balance is now 8000; delete reverts to 10000
    await DeleteTransferUseCase(transfer_repo, account_repo).execute(transfer.id, user_id)

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("10000")


async def test_update_transfer_reverts_and_reapplies() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc_a = await _make_account(account_repo, user_id, Decimal("10000"))
    acc_b = await _make_account(account_repo, user_id, Decimal("5000"))

    transfer = await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc_a.id,
            dest_type="savings_account", dest_id=acc_b.id,
            amount=Decimal("1000"), currency="RUB",
            date=datetime.date.today(),
        )
    )
    # A=9000, B=6000; update amount to 3000 → revert to A=10000,B=5000; apply → A=7000,B=8000
    await UpdateTransferUseCase(transfer_repo, account_repo).execute(
        UpdateTransferDTO(transfer_id=transfer.id, user_id=user_id, amount=Decimal("3000"))
    )

    accounts = {a.id: a for a in await account_repo.list_for_user(user_id)}
    assert accounts[acc_a.id].balance == Decimal("7000")
    assert accounts[acc_b.id].balance == Decimal("8000")


async def test_create_with_deleted_account_raises() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))
    from datetime import timezone
    await account_repo.soft_delete(acc.id, datetime.datetime.now(timezone.utc))

    with pytest.raises(ConflictError):
        await CreateTransferUseCase(transfer_repo, account_repo).execute(
            CreateTransferDTO(
                user_id=user_id,
                source_type="savings_account", source_id=acc.id,
                dest_type="external", dest_label="ATM",
                amount=Decimal("1000"), currency="RUB",
                date=datetime.date.today(),
            )
        )


async def test_delete_other_user_transfer_raises() -> None:
    account_repo = FakeAccountRepository()
    transfer_repo = FakeTransferRepository()
    user_a, user_b = uuid4(), uuid4()

    transfer = await CreateTransferUseCase(transfer_repo, account_repo).execute(
        CreateTransferDTO(
            user_id=user_a,
            source_type="external", source_label="A",
            dest_type="external", dest_label="B",
            amount=Decimal("100"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    with pytest.raises(NotFoundError):
        await DeleteTransferUseCase(transfer_repo, account_repo).execute(transfer.id, user_b)
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
docker compose exec api bash -c "cd /app && pytest tests/unit/transfers/ -v"
```

Expected: `ImportError` (dtos/use_cases don't exist yet).

- [ ] **Step 4: Create `backend/app/modules/transfers/application/dtos.py`**

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


@dataclass
class TransferDTO:
    id: UUID
    user_id: UUID
    source_type: str
    source_id: UUID | None
    source_label: str | None
    dest_type: str
    dest_id: UUID | None
    dest_label: str | None
    amount: Decimal
    currency: str
    date: date
    description: str | None
    created_at: datetime


@dataclass
class CreateTransferDTO:
    user_id: UUID
    source_type: str
    dest_type: str
    amount: Decimal
    currency: str
    date: date
    source_id: UUID | None = None
    source_label: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    description: str | None = None


@dataclass
class UpdateTransferDTO:
    transfer_id: UUID
    user_id: UUID
    source_type: str | None = None
    source_id: UUID | None = None
    source_label: str | None = None
    dest_type: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    date: date | None = None
    description: str | None = None
```

- [ ] **Step 5: Create `backend/app/modules/transfers/application/use_cases.py`**

```python
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.transfers.application.dtos import CreateTransferDTO, TransferDTO, UpdateTransferDTO
from app.modules.transfers.domain.entities import Transfer
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.shared.exceptions import ConflictError, NotFoundError


def _to_dto(t: Transfer) -> TransferDTO:
    return TransferDTO(
        id=t.id,
        user_id=t.user_id,
        source_type=t.source_type,
        source_id=t.source_id,
        source_label=t.source_label,
        dest_type=t.dest_type,
        dest_id=t.dest_id,
        dest_label=t.dest_label,
        amount=t.amount,
        currency=t.currency,
        date=t.date,
        description=t.description,
        created_at=t.created_at,
    )


async def _validate_savings_endpoint(
    account_repo: IAccountRepository,
    endpoint_type: str,
    endpoint_id: UUID | None,
    user_id: UUID,
) -> None:
    """Validates a savings_account endpoint. No-op for deposit/external."""
    if endpoint_type != "savings_account":
        return
    account = await account_repo.find_by_id(endpoint_id)  # type: ignore[arg-type]
    if account is None or account.user_id != user_id:
        raise NotFoundError("Account", str(endpoint_id))
    if account.deleted_at is not None:
        raise ConflictError("Account is deleted")


async def _adjust_balances(
    account_repo: IAccountRepository,
    source_type: str,
    source_id: UUID | None,
    dest_type: str,
    dest_id: UUID | None,
    amount: Decimal,
) -> None:
    """Applies balance effect. Pass negative amount to revert."""
    if source_type == "savings_account" and source_id is not None:
        await account_repo.update_balance(source_id, -amount)
    if dest_type == "savings_account" and dest_id is not None:
        await account_repo.update_balance(dest_id, amount)


class ListTransfersUseCase:
    def __init__(self, repo: ITransferRepository) -> None:
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[TransferDTO]:
        return [_to_dto(t) for t in await self._repo.list_for_user(user_id)]


class CreateTransferUseCase:
    def __init__(self, repo: ITransferRepository, account_repo: IAccountRepository) -> None:
        self._repo = repo
        self._account_repo = account_repo

    async def execute(self, dto: CreateTransferDTO) -> TransferDTO:
        await _validate_savings_endpoint(self._account_repo, dto.source_type, dto.source_id, dto.user_id)
        await _validate_savings_endpoint(self._account_repo, dto.dest_type, dto.dest_id, dto.user_id)
        transfer = Transfer(
            user_id=dto.user_id,
            source_type=dto.source_type,
            source_id=dto.source_id,
            source_label=dto.source_label,
            dest_type=dto.dest_type,
            dest_id=dto.dest_id,
            dest_label=dto.dest_label,
            amount=dto.amount,
            currency=dto.currency,
            date=dto.date,
            description=dto.description,
        )
        saved = await self._repo.create(transfer)
        await _adjust_balances(
            self._account_repo,
            saved.source_type, saved.source_id,
            saved.dest_type, saved.dest_id,
            saved.amount,
        )
        return _to_dto(saved)


class UpdateTransferUseCase:
    def __init__(self, repo: ITransferRepository, account_repo: IAccountRepository) -> None:
        self._repo = repo
        self._account_repo = account_repo

    async def execute(self, dto: UpdateTransferDTO) -> TransferDTO:
        old = await self._repo.find_by_id(dto.transfer_id)
        if old is None or old.user_id != dto.user_id:
            raise NotFoundError("Transfer", str(dto.transfer_id))

        new_source_type = dto.source_type if dto.source_type is not None else old.source_type
        new_dest_type = dto.dest_type if dto.dest_type is not None else old.dest_type

        # When endpoint type changes, update source_id/dest_id accordingly
        if dto.source_type is not None:
            new_source_id = dto.source_id if new_source_type == "savings_account" else None
        else:
            new_source_id = old.source_id

        if dto.dest_type is not None:
            new_dest_id = dto.dest_id if new_dest_type == "savings_account" else None
        else:
            new_dest_id = old.dest_id

        new_source_label = dto.source_label if dto.source_label is not None else old.source_label
        new_dest_label = dto.dest_label if dto.dest_label is not None else old.dest_label
        new_amount = dto.amount if dto.amount is not None else old.amount
        new_currency = dto.currency if dto.currency is not None else old.currency
        new_date = dto.date if dto.date is not None else old.date
        new_description = dto.description if dto.description is not None else old.description

        await _validate_savings_endpoint(self._account_repo, new_source_type, new_source_id, dto.user_id)
        await _validate_savings_endpoint(self._account_repo, new_dest_type, new_dest_id, dto.user_id)

        # Revert old balance effect, then apply new
        await _adjust_balances(
            self._account_repo,
            old.source_type, old.source_id,
            old.dest_type, old.dest_id,
            -old.amount,
        )

        updated = Transfer(
            id=old.id,
            user_id=old.user_id,
            source_type=new_source_type,
            source_id=new_source_id,
            source_label=new_source_label,
            dest_type=new_dest_type,
            dest_id=new_dest_id,
            dest_label=new_dest_label,
            amount=new_amount,
            currency=new_currency,
            date=new_date,
            description=new_description,
            created_at=old.created_at,
        )
        saved = await self._repo.update(updated)

        await _adjust_balances(
            self._account_repo,
            saved.source_type, saved.source_id,
            saved.dest_type, saved.dest_id,
            saved.amount,
        )
        return _to_dto(saved)


class DeleteTransferUseCase:
    def __init__(self, repo: ITransferRepository, account_repo: IAccountRepository) -> None:
        self._repo = repo
        self._account_repo = account_repo

    async def execute(self, transfer_id: UUID, user_id: UUID) -> None:
        transfer = await self._repo.find_by_id(transfer_id)
        if transfer is None or transfer.user_id != user_id:
            raise NotFoundError("Transfer", str(transfer_id))
        await _adjust_balances(
            self._account_repo,
            transfer.source_type, transfer.source_id,
            transfer.dest_type, transfer.dest_id,
            -transfer.amount,
        )
        await self._repo.delete(transfer_id)
```

- [ ] **Step 6: Run tests — confirm all pass**

```bash
docker compose exec api bash -c "cd /app && pytest tests/unit/transfers/ -v"
```

Expected: `9 passed`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/transfers/application/ backend/tests/unit/transfers/
git commit -m "feat: transfers application layer — DTOs, use cases; unit tests"
```

---

### Task 10: Transfers Presentation + DI + Integration Tests

**Files:**
- Create: `backend/app/modules/transfers/presentation/__init__.py`
- Create: `backend/app/modules/transfers/presentation/schemas.py`
- Create: `backend/app/modules/transfers/presentation/router.py`
- Modify: `backend/app/dependencies.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/integration/transfers/__init__.py`
- Create: `backend/tests/integration/transfers/conftest.py`
- Create: `backend/tests/integration/transfers/test_transfers_router.py`

- [ ] **Step 1: Create `backend/app/modules/transfers/presentation/__init__.py`** (empty)

- [ ] **Step 2: Create `backend/app/modules/transfers/presentation/schemas.py`**

Note: `source_id` and `dest_id` are required when the corresponding type is `savings_account`. A `model_validator` enforces this at the schema layer (returns 422).

```python
from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


class CreateTransferRequest(BaseModel):
    source_type: str  # "savings_account" | "deposit" | "external"
    source_id: UUID | None = None
    source_label: str | None = None
    dest_type: str
    dest_id: UUID | None = None
    dest_label: str | None = None
    amount: Decimal
    currency: str
    date: dt.date
    description: str | None = None

    @model_validator(mode="after")
    def validate_ids(self) -> CreateTransferRequest:
        if self.source_type == "savings_account" and self.source_id is None:
            raise ValueError("source_id is required when source_type is savings_account")
        if self.dest_type == "savings_account" and self.dest_id is None:
            raise ValueError("dest_id is required when dest_type is savings_account")
        return self


class UpdateTransferRequest(BaseModel):
    source_type: str | None = None
    source_id: UUID | None = None
    source_label: str | None = None
    dest_type: str | None = None
    dest_id: UUID | None = None
    dest_label: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    date: Optional[dt.date] = None  # Optional[date] avoids field-name shadowing
    description: str | None = None

    @model_validator(mode="after")
    def validate_ids(self) -> UpdateTransferRequest:
        if self.source_type == "savings_account" and self.source_id is None:
            raise ValueError("source_id is required when source_type is savings_account")
        if self.dest_type == "savings_account" and self.dest_id is None:
            raise ValueError("dest_id is required when dest_type is savings_account")
        return self


class TransferResponse(BaseModel):
    id: UUID
    user_id: UUID
    source_type: str
    source_id: UUID | None
    source_label: str | None
    dest_type: str
    dest_id: UUID | None
    dest_label: str | None
    amount: Decimal
    currency: str
    date: dt.date
    description: str | None
    created_at: dt.datetime
```

- [ ] **Step 3: Create `backend/app/modules/transfers/presentation/router.py`**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_account_repository, get_current_user_id, get_transfer_repository
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.transfers.application.dtos import CreateTransferDTO, UpdateTransferDTO
from app.modules.transfers.application.use_cases import (
    CreateTransferUseCase,
    DeleteTransferUseCase,
    ListTransfersUseCase,
    UpdateTransferUseCase,
)
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.modules.transfers.presentation.schemas import (
    CreateTransferRequest,
    TransferResponse,
    UpdateTransferRequest,
)
from app.shared.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/api/v1/transfers", tags=["transfers"])


def _map_dto(dto) -> TransferResponse:
    return TransferResponse(
        id=dto.id,
        user_id=dto.user_id,
        source_type=dto.source_type,
        source_id=dto.source_id,
        source_label=dto.source_label,
        dest_type=dto.dest_type,
        dest_id=dto.dest_id,
        dest_label=dto.dest_label,
        amount=dto.amount,
        currency=dto.currency,
        date=dto.date,
        description=dto.description,
        created_at=dto.created_at,
    )


@router.get("", response_model=list[TransferResponse])
async def list_transfers(
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
) -> list[TransferResponse]:
    dtos = await ListTransfersUseCase(repo).execute(user_id)
    return [_map_dto(d) for d in dtos]


@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    body: CreateTransferRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransferResponse:
    try:
        dto = await CreateTransferUseCase(repo, account_repo).execute(
            CreateTransferDTO(
                user_id=user_id,
                source_type=body.source_type,
                source_id=body.source_id,
                source_label=body.source_label,
                dest_type=body.dest_type,
                dest_id=body.dest_id,
                dest_label=body.dest_label,
                amount=body.amount,
                currency=body.currency,
                date=body.date,
                description=body.description,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _map_dto(dto)


@router.put("/{transfer_id}", response_model=TransferResponse)
async def update_transfer(
    transfer_id: UUID,
    body: UpdateTransferRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> TransferResponse:
    try:
        dto = await UpdateTransferUseCase(repo, account_repo).execute(
            UpdateTransferDTO(
                transfer_id=transfer_id,
                user_id=user_id,
                source_type=body.source_type,
                source_id=body.source_id,
                source_label=body.source_label,
                dest_type=body.dest_type,
                dest_id=body.dest_id,
                dest_label=body.dest_label,
                amount=body.amount,
                currency=body.currency,
                date=body.date,
                description=body.description,
            )
        )
    except (NotFoundError, ConflictError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _map_dto(dto)


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transfer(
    transfer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: ITransferRepository = Depends(get_transfer_repository),
    account_repo: IAccountRepository = Depends(get_account_repository),
) -> None:
    try:
        await DeleteTransferUseCase(repo, account_repo).execute(transfer_id, user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
```

- [ ] **Step 4: Update `backend/app/dependencies.py`**

Add transfer imports and factory after the accounts section:

```python
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.modules.auth.application.services import JWTService
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.auth.infrastructure.repository import SQLAlchemyUserRepository
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.categories.infrastructure.repository import SQLAlchemyCategoryRepository
from app.modules.transactions.domain.interfaces import ITransactionRepository
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.modules.transactions.infrastructure.repository import SQLAlchemyTransactionRepository
from app.modules.accounts.domain.interfaces import IAccountRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.accounts.infrastructure.repository import SQLAlchemyAccountRepository
from app.modules.transfers.domain.interfaces import ITransferRepository
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository
from app.modules.transfers.infrastructure.repository import SQLAlchemyTransferRepository

_bearer = HTTPBearer()

_fake_user_repo = FakeUserRepository()
_fake_category_repo = FakeCategoryRepository()
_fake_transaction_repo = FakeTransactionRepository()
_fake_account_repo = FakeAccountRepository()
_fake_transfer_repo = FakeTransferRepository()


def get_user_repository(db: AsyncSession = Depends(get_db)) -> IUserRepository:
    if settings.use_fake_repo:
        return _fake_user_repo
    return SQLAlchemyUserRepository(db)


def get_category_repository(db: AsyncSession = Depends(get_db)) -> ICategoryRepository:
    if settings.use_fake_repo:
        return _fake_category_repo
    return SQLAlchemyCategoryRepository(db)


def get_transaction_repository(db: AsyncSession = Depends(get_db)) -> ITransactionRepository:
    if settings.use_fake_repo:
        return _fake_transaction_repo
    return SQLAlchemyTransactionRepository(db)


def get_account_repository(db: AsyncSession = Depends(get_db)) -> IAccountRepository:
    if settings.use_fake_repo:
        return _fake_account_repo
    return SQLAlchemyAccountRepository(db)


def get_transfer_repository(db: AsyncSession = Depends(get_db)) -> ITransferRepository:
    if settings.use_fake_repo:
        return _fake_transfer_repo
    return SQLAlchemyTransferRepository(db)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> UUID:
    try:
        payload = JWTService.decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        return UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
```

- [ ] **Step 5: Update `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.modules.auth.presentation.router import router as auth_router
from app.modules.categories.presentation.router import router as categories_router
from app.modules.transactions.presentation.router import router as transactions_router
from app.modules.accounts.presentation.router import router as accounts_router
from app.modules.transfers.presentation.router import router as transfers_router

app = FastAPI(title="XNoll Finance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(accounts_router)
app.include_router(transfers_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 6: Create `backend/tests/integration/transfers/__init__.py`** (empty)

- [ ] **Step 7: Create `backend/tests/integration/transfers/conftest.py`**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.dependencies import get_user_repository, get_account_repository, get_transfer_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository


@pytest.fixture
def fake_account_repo():
    return FakeAccountRepository()


@pytest.fixture
def fake_transfer_repo():
    return FakeTransferRepository()


@pytest.fixture
async def client(fake_account_repo, fake_transfer_repo):
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_account_repository] = lambda: fake_account_repo
    app.dependency_overrides[get_transfer_repository] = lambda: fake_transfer_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "transfer@example.com", "password": "pass1234",
        "full_name": "Transfer User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "transfer@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

- [ ] **Step 8: Create `backend/tests/integration/transfers/test_transfers_router.py`**

```python
from uuid import uuid4
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"
TRANSFERS_URL = "/api/v1/transfers"


async def _make_account(client: AsyncClient, headers: dict, balance: str = "10000.00") -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": "Test", "bank_name": "Bank", "currency": "RUB", "balance": balance,
    })
    return resp.json()["id"]


async def test_list_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(TRANSFERS_URL)
    assert resp.status_code == 403


async def test_create_savings_to_savings_updates_balances(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc_a = await _make_account(client, auth_headers, "10000.00")
    acc_b = await _make_account(client, auth_headers, "5000.00")

    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc_a,
        "dest_type": "savings_account", "dest_id": acc_b,
        "amount": "3000.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 201

    accounts = {a["id"]: a for a in (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()}
    assert accounts[acc_a]["balance"] == "7000.00"
    assert accounts[acc_b]["balance"] == "8000.00"


async def test_list_transfers(client: AsyncClient, auth_headers: dict) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Cash",
        "dest_type": "savings_account", "dest_id": acc,
        "amount": "500.00", "currency": "RUB", "date": "2026-05-25",
    })
    resp = await client.get(TRANSFERS_URL, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_create_external_to_savings_updates_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "5000.00")
    await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "external", "source_label": "Зарплата",
        "dest_type": "savings_account", "dest_id": acc,
        "amount": "15000.00", "currency": "RUB", "date": "2026-05-24",
    })
    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "20000.00"


async def test_delete_transfer_reverts_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    create_resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "3000.00", "currency": "RUB", "date": "2026-05-24",
    })
    transfer_id = create_resp.json()["id"]
    await client.delete(f"{TRANSFERS_URL}/{transfer_id}", headers=auth_headers)

    accounts = (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()
    assert accounts[0]["balance"] == "10000.00"


async def test_update_transfer_changes_amount_and_balance(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc_a = await _make_account(client, auth_headers, "10000.00")
    acc_b = await _make_account(client, auth_headers, "5000.00")
    create_resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc_a,
        "dest_type": "savings_account", "dest_id": acc_b,
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    # A=9000, B=6000
    transfer_id = create_resp.json()["id"]
    resp = await client.put(f"{TRANSFERS_URL}/{transfer_id}", headers=auth_headers, json={
        "amount": "3000.00",
    })
    # Reverts: A=10000, B=5000; Applies: A=7000, B=8000
    assert resp.status_code == 200

    accounts = {a["id"]: a for a in (await client.get(ACCOUNTS_URL, headers=auth_headers)).json()}
    assert accounts[acc_a]["balance"] == "7000.00"
    assert accounts[acc_b]["balance"] == "8000.00"


async def test_create_with_deleted_account_returns_409(
    client: AsyncClient, auth_headers: dict
) -> None:
    acc = await _make_account(client, auth_headers, "10000.00")
    await client.delete(f"{ACCOUNTS_URL}/{acc}", headers=auth_headers)  # soft delete
    resp = await client.post(TRANSFERS_URL, headers=auth_headers, json={
        "source_type": "savings_account", "source_id": acc,
        "dest_type": "external", "dest_label": "ATM",
        "amount": "1000.00", "currency": "RUB", "date": "2026-05-24",
    })
    assert resp.status_code == 409


async def test_delete_nonexistent_transfer_returns_404(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.delete(f"{TRANSFERS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_other_user_transfer_returns_404(client: AsyncClient) -> None:
    # Register two users
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

    # user_a creates a transfer (external → external, no accounts needed)
    create_resp = await client.post(TRANSFERS_URL, headers=headers_a, json={
        "source_type": "external", "source_label": "A",
        "dest_type": "external", "dest_label": "B",
        "amount": "100.00", "currency": "RUB", "date": "2026-05-24",
    })
    transfer_id = create_resp.json()["id"]

    resp = await client.delete(f"{TRANSFERS_URL}/{transfer_id}", headers=headers_b)
    assert resp.status_code == 404
```

- [ ] **Step 9: Run all tests**

```bash
docker compose exec api bash -c "cd /app && pytest tests/ -v"
```

Expected: 78 previous + 9 new unit + 8 new integration = **95 passed**.

- [ ] **Step 10: Commit**

```bash
git add backend/app/modules/transfers/presentation/ backend/app/dependencies.py backend/app/main.py backend/tests/integration/transfers/
git commit -m "feat: transfers presentation layer + DI + integration tests"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Covered in |
|---|---|
| Account entity: id, user_id, name, bank_name, balance, currency, deleted_at, created_at | Task 1 |
| IAccountRepository: list, find, create, update, soft_delete, update_balance | Task 1 |
| AccountModel (savings_accounts table) | Task 2 |
| FakeAccountRepository | Task 2 |
| SQLAlchemyAccountRepository | Task 2 |
| savings_accounts schema migration | Task 3 |
| ListAccountsUseCase → active only | Task 4 |
| CreateAccountUseCase | Task 4 |
| UpdateAccountUseCase → NotFoundError for wrong user/deleted | Task 4 |
| DeleteAccountUseCase → soft delete | Task 4 |
| Accounts router: GET/POST/PUT/DELETE | Task 5 |
| get_account_repository in dependencies.py | Task 5 |
| Accounts integration tests | Task 6 |
| Transfer entity (all fields including deposit type) | Task 7 |
| ITransferRepository | Task 7 |
| TransferModel with shared transfer_endpoint_enum | Task 7 |
| FakeTransferRepository | Task 7 |
| SQLAlchemyTransferRepository | Task 7 |
| transfers schema migration with enum | Task 8 |
| _adjust_balances helper (savings_account only, deposit skipped) | Task 9 |
| CreateTransferUseCase → validates account, applies balance | Task 9 |
| UpdateTransferUseCase → reverts old, applies new | Task 9 |
| DeleteTransferUseCase → reverts balance, hard delete | Task 9 |
| Transfers router: GET/POST/PUT/DELETE | Task 10 |
| Pydantic validator: source_id required for savings_account type | Task 10 |
| get_transfer_repository in dependencies.py | Task 10 |
| Transfers integration tests (balance verification) | Task 10 |

**No placeholders found.**

**Type consistency confirmed:** `IAccountRepository.update_balance(account_id, delta)` matches calls in `_adjust_balances`. `FakeAccountRepository.update` reconstructs Account preserving immutable fields. `UpdateTransferUseCase` uses `new_source_type`/`new_dest_type` consistently throughout.
