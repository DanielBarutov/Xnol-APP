# Statistics Module — Design Spec

**Date:** 2026-05-25
**Status:** Approved
**Plan series:** Plan 05 of 07

---

## 1. Overview

A new `stats` module exposing three read-only endpoints that aggregate transaction data for the authenticated user: breakdown by category, timeline dynamics, and per-account turnover. All endpoints accept the same period filters and return pre-computed aggregates.

---

## 2. Architecture

New module following the same Clean Architecture pattern:

```
modules/stats/
├── domain/
│   ├── entities.py        — CategoryStat, TimelinePeriod, AccountStat dataclasses
│   └── interfaces.py      — IStatsRepository ABC
├── application/
│   ├── dtos.py            — input/output DTOs for each use case
│   └── use_cases.py       — GetCategoryStatsUseCase, GetTimelineUseCase, GetAccountStatsUseCase
├── infrastructure/
│   ├── fake_repository.py — FakeStatsRepository for unit tests
│   └── repository.py      — SQLAlchemyStatsRepository (GROUP BY queries)
└── presentation/
    ├── schemas.py         — Pydantic response schemas
    └── router.py          — 3 endpoints, filter resolution
```

`IStatsRepository` methods receive `user_id`, `date_from`, `date_to` — all period presets are resolved to concrete dates in the router before reaching the use case. No direct dependencies on internals of other modules; the infrastructure layer accesses `TransactionModel`, `CategoryModel`, and `SavingsAccountModel` directly (same DB, no cross-module imports at domain level).

`dependencies.py` gains `get_stats_repository`. `main.py` includes the stats router.

---

## 3. API

All endpoints require `Authorization: Bearer <access_token>`.

### Common query parameters

| Param | Type | Notes |
|---|---|---|
| `period` | `this_month` \| `prev_month` \| `this_year` | Optional preset |
| `date_from` | `YYYY-MM-DD` | Optional, inclusive |
| `date_to` | `YYYY-MM-DD` | Optional, inclusive |

Rules:
- If nothing is specified → defaults to current month (`this_month`).
- `period` and `date_from`/`date_to` cannot be used together → 422.
- `date_from > date_to` → 422.

---

### `GET /api/v1/stats/categories`

```json
{
  "date_from": "2026-05-01",
  "date_to": "2026-05-31",
  "total_income": "150000.00",
  "total_expense": "87000.00",
  "net": "63000.00",
  "income_by_category": [
    {"category_id": "uuid", "category_name": "Зарплата", "amount": "150000.00"}
  ],
  "expense_by_category": [
    {"category_id": "uuid", "category_name": "Еда", "amount": "30000.00"}
  ]
}
```

`net = total_income - total_expense`, computed in the use case.  
Empty period → totals are `"0.00"`, lists are `[]`.

---

### `GET /api/v1/stats/timeline`

Additional query param: `granularity=month` (default) | `day`

```json
{
  "date_from": "2026-01-01",
  "date_to": "2026-05-31",
  "granularity": "month",
  "periods": [
    {"period": "2026-01", "income": "150000.00", "expense": "80000.00", "net": "70000.00"},
    {"period": "2026-02", "income": "0.00", "expense": "0.00", "net": "0.00"},
    {"period": "2026-03", "income": "150000.00", "expense": "95000.00", "net": "55000.00"}
  ]
}
```

- `granularity=month` → `period` format `"YYYY-MM"`
- `granularity=day` → `period` format `"YYYY-MM-DD"`
- Missing periods (no transactions) are filled with zeros by the use case.

---

### `GET /api/v1/stats/accounts`

```json
{
  "date_from": "2026-05-01",
  "date_to": "2026-05-31",
  "accounts": [
    {
      "account_id": "uuid",
      "account_name": "Сбербанк",
      "income": "150000.00",
      "expense": "87000.00",
      "net": "63000.00"
    }
  ]
}
```

- Only active accounts (`deleted_at IS NULL`) are included.
- Accounts with no transactions in the period are excluded.

---

## 4. SQL Queries (infrastructure)

All queries use SQLAlchemy Core expressions — no raw SQL strings.

**categories:**
```sql
SELECT category_id, categories.name, type, SUM(amount)
FROM transactions
JOIN categories ON transactions.category_id = categories.id
WHERE user_id = :uid AND date >= :from AND date <= :to
GROUP BY category_id, categories.name, type
```
Use case splits rows by `type` into `income_by_category` / `expense_by_category` and sums totals.

**timeline:**
```sql
SELECT date_trunc('month', date) AS period, type, SUM(amount)  -- or 'day'
FROM transactions
WHERE user_id = :uid AND date >= :from AND date <= :to
GROUP BY period, type
ORDER BY period
```
Use case iterates all calendar periods in `[date_from, date_to]` and fills missing ones with zeros.

**accounts:**
```sql
SELECT account_id, savings_accounts.name, type, SUM(amount)
FROM transactions
JOIN savings_accounts ON transactions.account_id = savings_accounts.id
WHERE transactions.user_id = :uid AND date >= :from AND date <= :to
  AND savings_accounts.deleted_at IS NULL
GROUP BY account_id, savings_accounts.name, type
```

---

## 5. Error Handling

| Situation | HTTP |
|---|---|
| `period` and `date_from`/`date_to` used together | 422 |
| Invalid `period` value | 422 |
| `date_from > date_to` | 422 |
| No transactions in period | 200, empty lists / zero totals |

Validation is done in the router via Pydantic `model_validator` before the use case is called.

---

## 6. Testing Strategy

**Unit tests** (FakeStatsRepository, no DB, no HTTP):
- Categories: income and expense sum correctly, net is correct
- Categories: empty period → zeros and empty lists
- Timeline: missing months filled with zeros
- Timeline: `granularity=day` produces daily periods
- Accounts: accounts with no transactions excluded

**Integration tests** (AsyncClient + `dependency_overrides`):
- Each endpoint returns correct aggregates given known transactions
- `period=this_month` filter returns only current month data
- `date_from`/`date_to` arbitrary range works correctly
- Conflicting filters (`period` + `date_from`) → 422
- `date_from > date_to` → 422
