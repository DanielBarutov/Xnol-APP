# Transactions — Account Balance Integration Design

**Date:** 2026-05-25
**Status:** Approved

---

## 1. Overview

Extend the `transactions` module so every transaction is linked to a savings account (`account_id`). Creating, updating, or deleting a transaction automatically adjusts the account balance: income adds, expense subtracts. This eliminates the need for a separate transfer to track spending from an account.

---

## 2. Architecture

Changes are confined to the `transactions` module. `IAccountRepository` (already exists) is injected into all three mutating use cases. Balance update pattern mirrors `transfers`: validate account → persist record → adjust balance. No other modules change.

`account_id` is set on create and **updatable** — if the wrong account was selected, the user can correct it. On update, the old account's balance is reverted and the new account's balance is adjusted.

---

## 3. Data Model

### `transactions` table — added column

| Column | Type | Notes |
|---|---|---|
| account_id | UUID FK → accounts(id) NOT NULL | New — required |

All existing columns unchanged: `id`, `user_id`, `category_id`, `type`, `amount`, `date`, `description`, `created_at`.

Migration: add `account_id` as `NOT NULL`. Local DB will be reset (Docker volume cleared) before running.

---

## 4. Business Rules

- **Create:** `account_id` required. Validate account exists, belongs to user, not soft-deleted. Create record, then: income → `+amount`, expense → `−amount`.
- **Update:** `account_id` optional. If provided and different from old: revert old account balance (using old type/amount), update record, apply new account balance (using new type/amount). If `account_id` unchanged but type or amount changed: revert old effect on same account, apply new effect.
- **Delete:** Revert balance effect (using stored type/amount) then delete record.
- **Validation errors:** 404 if account not found or belongs to another user; 409 if account is soft-deleted.
- **`account_id` in all responses:** GET list, POST, PUT all return `account_id`.

### Balance effect table

| type    | effect on account |
|---------|------------------|
| income  | +amount          |
| expense | −amount          |

---

## 5. API

All endpoints require `Authorization: Bearer <access_token>`.

```
GET    /api/v1/transactions
POST   /api/v1/transactions
PUT    /api/v1/transactions/{id}
DELETE /api/v1/transactions/{id}
```

**POST body:**
```json
{
  "account_id": "uuid",
  "category_id": "uuid",
  "type": "expense",
  "amount": "200.00",
  "date": "2026-05-25",
  "description": "Такси"
}
```

**PUT body** (all optional):
```json
{
  "account_id": "uuid",
  "category_id": "uuid",
  "type": "income",
  "amount": "500.00",
  "date": "2026-05-25",
  "description": "Зарплата"
}
```

**Response** (all endpoints that return a transaction):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "account_id": "uuid",
  "category_id": "uuid",
  "type": "expense",
  "amount": "200.00",
  "date": "2026-05-25",
  "description": "Такси",
  "created_at": "2026-05-25T10:00:00Z"
}
```

---

## 6. Error Handling

| Situation | HTTP Status |
|---|---|
| Account not found | 404 |
| Account belongs to another user | 404 |
| Account is soft-deleted | 409 |

---

## 7. Files Changed

**Modified:**
- `backend/app/modules/transactions/domain/entities.py` — add `account_id: UUID`
- `backend/app/modules/transactions/application/dtos.py` — add `account_id` to create/update/response DTOs
- `backend/app/modules/transactions/application/use_cases.py` — inject `IAccountRepository`, add balance logic
- `backend/app/modules/transactions/infrastructure/models.py` — add `account_id` FK column
- `backend/app/modules/transactions/presentation/schemas.py` — add `account_id` to request/response schemas
- `backend/app/modules/transactions/presentation/router.py` — inject `get_account_repository`
- `backend/app/dependencies.py` — pass `account_repo` to transaction use cases
- `backend/tests/unit/transactions/test_use_cases.py` — rewrite with balance assertions
- `backend/tests/integration/transactions/conftest.py` — add `FakeAccountRepository` override
- `backend/tests/integration/transactions/test_transactions_router.py` — add balance tests

**New:**
- `backend/migrations/versions/<id>_transactions_add_account_id.py`

---

## 8. Testing Strategy

**Unit tests** (FakeAccountRepository + FakeTransactionRepository, no DB/HTTP):
- Create income → account balance increases
- Create expense → account balance decreases
- Update amount → balance recalculated on same account
- Update type income→expense → balance reversed on same account
- Update account_id → old account reverted, new account updated
- Delete transaction → balance reverted
- Create with nonexistent / foreign account → NotFoundError
- Create with soft-deleted account → ConflictError

**Integration tests** (AsyncClient + dependency_overrides):
- Same scenarios via HTTP, verify account balance via `GET /api/v1/accounts`
