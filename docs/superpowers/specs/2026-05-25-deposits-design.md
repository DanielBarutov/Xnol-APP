# Deposits Module — Design Spec

**Date:** 2026-05-25
**Status:** Approved
**Plan series:** Plan 04 of 07

---

## 1. Overview

One backend module — `deposits` — implementing CRUD for bank term deposits (срочные вклады) with lifecycle management (active / closed / early_closed) and a cached balance updated via transfers. Also completes the deferred work from Plan 03: the `transfers` module's `_adjust_balances` is extended to update deposit balances, mirroring the existing savings account behaviour.

---

## 2. Architecture

New module following the same Clean Architecture pattern:

```
modules/deposits/
├── domain/         — Deposit entity, IDepositRepository
├── application/    — use cases, DTOs
├── infrastructure/ — SQLAlchemy model, FakeDepositRepository
└── presentation/   — FastAPI router, Pydantic schemas
```

`transfers/application/use_cases.py` is updated to inject `IDepositRepository` and call `update_balance` on deposits for `source_type=deposit` / `dest_type=deposit` endpoints. Integration via interface only — no direct model imports between modules.

---

## 3. Data Model

### `deposits`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users CASCADE | |
| name | VARCHAR(100) | |
| bank_name | VARCHAR(100) | |
| amount | NUMERIC(15,2) | initial principal |
| interest_rate | NUMERIC(5,4) | e.g. 0.1400 = 14% |
| interest_type | ENUM(simple, compound) | simple = no compounding |
| open_date | DATE | |
| close_date | DATE | planned maturity date |
| early_closure_rate | NUMERIC(5,4) nullable | penalty rate if closed early |
| auto_renew | BOOLEAN | informational flag only |
| currency | VARCHAR(3) | ISO 4217 |
| balance | NUMERIC(15,2) | cached balance; updated by transfers + manual correction |
| status | ENUM(active, closed, early_closed) | |
| actual_close_date | DATE nullable | set on close/early_close |
| created_at | TIMESTAMPTZ | |

---

## 4. Business Rules

### Deposits

- **List:** `GET /api/v1/deposits` returns only `status=active` deposits for the current user.
- **Create:** `status` defaults to `active`; `actual_close_date` is null; `balance` defaults to `amount` if not provided.
- **Update:** All fields except `status`, `actual_close_date`, `created_at` are editable. Returns 409 if deposit is already closed.
- **Close (DELETE):** Sets `status` to `closed` or `early_closed` and sets `actual_close_date`. Returns 204. Physically never removed — soft lifecycle change.
- **Balance:** Stored as a denormalized cache. Updated automatically when a transfer referencing the deposit is created, edited, or deleted. Users may also set it freely on create/update (manual sync with real balance).
- **Ownership:** Users can only see and modify their own deposits.
- **Re-closing:** Calling DELETE on an already-closed deposit returns 409.

### Transfer Integration (completing Plan 03 deferral)

`transfers/application/use_cases.py` — `_adjust_balances` is extended to handle `deposit` endpoints:

| source_type | dest_type | Balance effect |
|---|---|---|
| deposit | savings_account | deposit balance −amount |
| deposit | external | deposit balance −amount |
| deposit | deposit | source deposit −amount, dest deposit +amount |
| savings_account | deposit | deposit balance +amount |
| external | deposit | deposit balance +amount |

`_validate_savings_endpoint` is renamed `_validate_account_endpoint` and extended to also validate deposit endpoints: deposit must exist, belong to the current user, and have `status=active` — returns 404 if not found/wrong user, 409 if closed.

No validation of deposit `source_id`/`dest_id` was previously required (Plan 03 skipped it). Plan 04 adds that validation.

---

## 5. API

All endpoints require `Authorization: Bearer <access_token>`.

```
GET    /api/v1/deposits
POST   /api/v1/deposits
PUT    /api/v1/deposits/{id}
DELETE /api/v1/deposits/{id}
```

**GET /api/v1/deposits** — response:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Вклад Сохраняй",
    "bank_name": "Сбербанк",
    "amount": "100000.00",
    "interest_rate": "0.1400",
    "interest_type": "compound",
    "open_date": "2026-01-01",
    "close_date": "2026-07-01",
    "early_closure_rate": "0.0300",
    "auto_renew": false,
    "currency": "RUB",
    "balance": "107000.00",
    "status": "active",
    "actual_close_date": null,
    "created_at": "2026-05-25T10:00:00Z"
  }
]
```

**POST /api/v1/deposits** — body:
```json
{
  "name": "Вклад Сохраняй",
  "bank_name": "Сбербанк",
  "amount": "100000.00",
  "interest_rate": "0.1400",
  "interest_type": "compound",
  "open_date": "2026-01-01",
  "close_date": "2026-07-01",
  "early_closure_rate": "0.0300",
  "auto_renew": false,
  "currency": "RUB",
  "balance": "100000.00"
}
```
`balance` is optional — defaults to `amount` if omitted. Returns `201` with created deposit.

**PUT /api/v1/deposits/{id}** — same body fields (all optional, excluding status/actual_close_date). Returns updated deposit. Returns 409 if deposit is closed.

**DELETE /api/v1/deposits/{id}** — body:
```json
{ "close_type": "closed", "actual_close_date": "2026-07-01" }
```
Returns `204`. Sets status and actual_close_date. Returns 409 if already closed.

---

## 6. Error Handling

| Situation | HTTP Status |
|---|---|
| Deposit not found | 404 |
| Accessing another user's deposit | 404 |
| Editing or closing an already-closed deposit | 409 |
| Transfer referencing a closed deposit | 409 |
| Transfer with null source_id/dest_id when type is deposit | 422 |

---

## 7. Testing Strategy

- **Unit tests** — use cases via `FakeDepositRepository` (no DB, no HTTP).
- **Integration tests** — HTTP via `AsyncClient` with `dependency_overrides` in `conftest.py`.

**Deposits:**
- Create deposit
- List returns only active deposits (closed excluded)
- Update deposit fields
- Close deposit (closed) — disappears from list
- Close deposit (early_closed) — disappears from list
- Cannot close already-closed deposit (409)
- Cannot edit closed deposit (409)
- Cannot access another user's deposit (404)

**Transfer integration:**
- `savings_account → deposit` — deposit balance increases
- `deposit → savings_account` — deposit balance decreases
- `deposit → deposit` — source decreases, dest increases
- `external → deposit` — deposit balance increases
- `deposit → external` — deposit balance decreases
- Transfer referencing closed deposit — 409
- Delete transfer — deposit balance effect reversed
- Edit transfer — old deposit balance effect reversed, new applied
- Closed deposit — existing transfers remain in list
