# Savings Accounts + Transfers Module — Design Spec

**Date:** 2026-05-24
**Status:** Approved
**Plan series:** Plan 03 of 07

---

## 1. Overview

Two independent backend modules — `accounts` and `transfers` — implementing CRUD for savings accounts (with soft delete and cached balances) and money transfers between accounts, deposits, and external sources. Both follow the same Clean Architecture pattern established in Plans 01–02.

---

## 2. Architecture (модули)

Two separate modules, each with four layers:

```
modules/
├── accounts/
│   ├── domain/         — Account entity, IAccountRepository
│   ├── application/    — use cases, DTOs
│   ├── infrastructure/ — SQLAlchemyAccountRepository, FakeAccountRepository
│   └── presentation/   — FastAPI router, Pydantic schemas
└── transfers/
    ├── domain/         — Transfer entity, ITransferRepository
    ├── application/    — use cases, DTOs (inject IAccountRepository for balance updates)
    ├── infrastructure/ — SQLAlchemyTransferRepository, FakeTransferRepository
    └── presentation/   — FastAPI router, Pydantic schemas
```

`transfers` depends on `IAccountRepository` (from `accounts` domain) only via its interface — no direct model imports between modules.

---

## 3. Data Model

### `savings_accounts`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users CASCADE | |
| name | VARCHAR(100) | |
| bank_name | VARCHAR(100) | |
| balance | NUMERIC(15,2) | cached balance, updated automatically by transfers |
| currency | VARCHAR(3) | ISO 4217 |
| deleted_at | TIMESTAMPTZ nullable | null = active; soft delete |
| created_at | TIMESTAMPTZ | |

### `transfers`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users CASCADE | |
| source_type | ENUM(savings_account, deposit, external) | |
| source_id | UUID nullable | references account or deposit; null for external |
| source_label | VARCHAR(100) nullable | free text for external, e.g. "Наличные" |
| dest_type | ENUM(savings_account, deposit, external) | |
| dest_id | UUID nullable | references account or deposit; null for external |
| dest_label | VARCHAR(100) nullable | free text for external |
| amount | NUMERIC(15,2) | |
| currency | VARCHAR(3) | ISO 4217 |
| date | DATE | |
| description | TEXT nullable | |
| created_at | TIMESTAMPTZ | |

---

## 4. Business Rules

### Savings Accounts

- **List:** `GET /api/v1/accounts` returns only active accounts (`deleted_at IS NULL`) for the current user.
- **Soft delete:** `DELETE /api/v1/accounts/{id}` sets `deleted_at = now()`. Physical row is never removed.
- **Balance:** stored as a denormalized cache. Updated automatically when a transfer referencing the account is created, edited, or deleted. Users may also set the initial balance freely on create/update (manual sync with real bank balance).
- **Currency:** any ISO 4217 string. No conversion — displayed as-is.
- **Ownership:** users can only see and modify their own accounts.

### Transfers

- **Balance update rules** (only `savings_account` endpoints are updated; `deposit` balance updates deferred to Plan 04):

  | source_type | dest_type | Balance effect |
  |---|---|---|
  | savings_account | savings_account | source balance −amount, dest balance +amount |
  | savings_account | external | source balance −amount |
  | savings_account | deposit | source balance −amount |
  | external | savings_account | dest balance +amount |
  | deposit | savings_account | dest balance +amount |
  | external | external | no change |
  | external | deposit | no change |
  | deposit | deposit | no change |
  | deposit | external | no change |

- **Validation:** if `source_type=savings_account`, `source_id` must be provided (non-null) and reference an active (not soft-deleted) account owned by the current user — returns `422` if `source_id` is null, `409` if account is soft-deleted or not found. Same rules apply to `dest_type=savings_account`.
- **Deposit endpoint:** `source_type=deposit` / `dest_type=deposit` is accepted and stored, but deposit balance is not updated (deferred to Plan 04). No validation of `source_id`/`dest_id` when type is `deposit`.
- **Edit (PUT):** reverses the balance effect of the old transfer, then applies the balance effect of the new transfer atomically.
- **Hard delete:** `DELETE /api/v1/transfers/{id}` reverses the balance effect and physically removes the row.
- **Ownership:** users can only see and manage their own transfers.
- **No date filter:** `GET /api/v1/transfers` returns all transfers for the user, ordered by `date DESC, created_at DESC`. Transfers are not included in statistics.

---

## 5. API

All endpoints require `Authorization: Bearer <access_token>`.

### Accounts

```
GET    /api/v1/accounts
POST   /api/v1/accounts
PUT    /api/v1/accounts/{id}
DELETE /api/v1/accounts/{id}
```

**GET /api/v1/accounts** — response:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Сбербанк основной",
    "bank_name": "Сбербанк",
    "balance": "50000.00",
    "currency": "RUB",
    "created_at": "2026-05-24T10:00:00Z"
  }
]
```

**POST /api/v1/accounts** — body:
```json
{
  "name": "Сбербанк основной",
  "bank_name": "Сбербанк",
  "currency": "RUB",
  "balance": "50000.00"
}
```
Returns `201` with created account.

**PUT /api/v1/accounts/{id}** — same body fields, all optional. Returns updated account.

**DELETE /api/v1/accounts/{id}** — returns `204`. Soft delete.

### Transfers

```
GET    /api/v1/transfers
POST   /api/v1/transfers
PUT    /api/v1/transfers/{id}
DELETE /api/v1/transfers/{id}
```

**GET /api/v1/transfers** — returns flat list ordered by `date DESC, created_at DESC`.

**POST /api/v1/transfers** — body:
```json
{
  "source_type": "savings_account",
  "source_id": "uuid-or-null",
  "source_label": null,
  "dest_type": "external",
  "dest_id": null,
  "dest_label": "Наличные",
  "amount": "5000.00",
  "currency": "RUB",
  "date": "2026-05-24",
  "description": "Снял наличные"
}
```
Returns `201` with created transfer.

**PUT /api/v1/transfers/{id}** — same body fields, all optional. Reverses old balance effect, applies new. Returns updated transfer.

**DELETE /api/v1/transfers/{id}** — reverses balance effect and physically removes the row. Returns `204`.

---

## 6. Error Handling

| Situation | HTTP Status |
|---|---|
| Account not found | 404 |
| Transfer not found | 404 |
| Accessing another user's account or transfer | 404 |
| savings_account transfer with null source_id/dest_id | 422 |
| Creating/editing transfer with soft-deleted savings_account | 409 |

---

## 7. Testing Strategy

- **Unit tests** — use cases via `FakeAccountRepository` / `FakeTransferRepository` (no DB, no HTTP).
- **Integration tests** — HTTP via `AsyncClient` with `dependency_overrides` in `conftest.py`.

Key scenarios:

**Accounts:**
- Create account
- List returns only active accounts (soft-deleted excluded)
- Update account fields
- Soft delete — account disappears from list
- Cannot access another user's account (404)

**Transfers:**
- Create `savings_account → savings_account` — both balances updated
- Create `savings_account → external` — only source balance decreases
- Create `external → savings_account` — only dest balance increases
- Create `external → external` — no balance change
- Create `savings_account → deposit` — only source balance decreases (deposit skipped)
- Delete transfer — balance effect reversed
- Edit transfer — old balance effect reversed, new applied
- Cannot create transfer referencing soft-deleted account (409)
- Cannot access another user's transfer (404)
- Soft-deleted account — existing transfers remain in list
