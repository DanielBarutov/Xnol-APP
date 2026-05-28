# Queue-First: Backend — Client-Provided Account ID

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the mobile client to pass an optional `id` UUID when creating an account, so the server stores that exact UUID — enabling stable offline references before sync.

**Architecture:** Four-layer change flowing downward: Pydantic schema → dataclass DTO → use case entity constructor → router. Backward-compatible: `id` is optional everywhere; existing tests without it continue to pass.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, pytest-asyncio

---

## Files

| File | Change |
|---|---|
| `backend/app/modules/accounts/presentation/schemas.py` | Add `id: UUID \| None = None` to `CreateAccountRequest` |
| `backend/app/modules/accounts/application/dtos.py` | Add `id: UUID \| None = None` to `CreateAccountDTO` |
| `backend/app/modules/accounts/application/use_cases.py` | Import `uuid4`; use `dto.id or uuid4()` in `Account()` constructor |
| `backend/app/modules/accounts/presentation/router.py` | Pass `id=body.id` to `CreateAccountDTO` |
| `backend/tests/integration/accounts/test_accounts_router.py` | Add test for client-provided UUID roundtrip |

---

### Task 1: Write the failing test

**Files:**
- Test: `backend/tests/integration/accounts/test_accounts_router.py`

- [ ] **Step 1: Add the test at the bottom of the file**

```python
async def test_create_account_with_client_id(client: AsyncClient, auth_headers: dict) -> None:
    from uuid import uuid4
    client_id = str(uuid4())
    resp = await client.post(
        ACCOUNTS_URL,
        headers=auth_headers,
        json={**VALID_PAYLOAD, "id": client_id},
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == client_id
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
cd backend && python -m pytest tests/integration/accounts/test_accounts_router.py::test_create_account_with_client_id -v
```

Expected: **FAIL** — `422 Unprocessable Entity` because `CreateAccountRequest` doesn't accept `id` yet.

---

### Task 2: Implement the four-layer change

**Files:**
- Modify: `backend/app/modules/accounts/presentation/schemas.py`
- Modify: `backend/app/modules/accounts/application/dtos.py`
- Modify: `backend/app/modules/accounts/application/use_cases.py`
- Modify: `backend/app/modules/accounts/presentation/router.py`

- [ ] **Step 1: Add `id` to the Pydantic request schema**

In `backend/app/modules/accounts/presentation/schemas.py`, replace `CreateAccountRequest`:

```python
class CreateAccountRequest(BaseModel):
    id: UUID | None = None
    name: str
    bank_name: str
    currency: str
    balance: Decimal
```

(`UUID` is already imported at the top of the file.)

- [ ] **Step 2: Add `id` to the DTO**

In `backend/app/modules/accounts/application/dtos.py`, replace `CreateAccountDTO`:

```python
@dataclass
class CreateAccountDTO:
    user_id: UUID
    name: str
    bank_name: str
    currency: str
    balance: Decimal
    id: UUID | None = None
```

- [ ] **Step 3: Use `dto.id` in the use case**

In `backend/app/modules/accounts/application/use_cases.py`, change the `from uuid import UUID` line to:

```python
from uuid import UUID, uuid4
```

Then in `CreateAccountUseCase.execute`, replace the `Account(...)` construction:

```python
account = Account(
    id=dto.id or uuid4(),
    user_id=dto.user_id,
    name=dto.name,
    bank_name=dto.bank_name,
    currency=dto.currency,
    balance=dto.balance,
)
```

- [ ] **Step 4: Pass `id` from the router to the DTO**

In `backend/app/modules/accounts/presentation/router.py`, inside `create_account`, replace the `CreateAccountDTO(...)` call:

```python
dto = await CreateAccountUseCase(repo).execute(
    CreateAccountDTO(
        id=body.id,
        user_id=user_id,
        name=body.name,
        bank_name=body.bank_name,
        currency=body.currency,
        balance=body.balance,
    )
)
```

- [ ] **Step 5: Run the new test — confirm it passes**

```bash
cd backend && python -m pytest tests/integration/accounts/test_accounts_router.py::test_create_account_with_client_id -v
```

Expected: **PASS**

- [ ] **Step 6: Run the full accounts test suite — confirm no regressions**

```bash
cd backend && python -m pytest tests/integration/accounts/ -v
```

Expected: all tests pass.

---

### Task 3: Commit

- [ ] **Commit**

```bash
git add backend/app/modules/accounts/presentation/schemas.py \
        backend/app/modules/accounts/application/dtos.py \
        backend/app/modules/accounts/application/use_cases.py \
        backend/app/modules/accounts/presentation/router.py \
        backend/tests/integration/accounts/test_accounts_router.py
git commit -m "feat(accounts): accept optional client-provided id on create"
```
