# Categories + Transactions Module — Design Spec

**Date:** 2026-05-24
**Status:** Approved
**Plan series:** Plan 02 of 07

---

## 1. Overview

Two independent backend modules — `categories` and `transactions` — implementing CRUD for expense/income categories (with one level of subcategories) and financial transactions. Both follow the same Clean Architecture pattern established in Plan 01 (auth module).

---

## 2. Architecture

Two separate modules, each with four layers:

```
modules/
├── categories/
│   ├── domain/         — Category entity, ICategoryRepository
│   ├── application/    — use cases, DTOs
│   ├── infrastructure/ — SQLAlchemyCategoryRepository, FakeCategoryRepository
│   └── presentation/   — FastAPI router, Pydantic schemas
└── transactions/
    ├── domain/         — Transaction entity, ITransactionRepository
    ├── application/    — use cases, DTOs
    ├── infrastructure/ — SQLAlchemyTransactionRepository, FakeTransactionRepository
    └── presentation/   — FastAPI router, Pydantic schemas
```

The `transactions` module references categories only via `category_id` (UUID). No direct imports between modules.

---

## 3. Data Model

### `categories`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users nullable | null = system category |
| parent_id | UUID FK → categories nullable | null = top-level |
| name | VARCHAR(100) | |
| type | ENUM(income, expense) | |
| icon | VARCHAR(50) | Lucide icon name |
| color | VARCHAR(7) | hex, e.g. `#14b8a6` |
| is_system | BOOLEAN | default false |
| deleted_at | TIMESTAMPTZ nullable | null = active; soft delete |

### `transactions`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| category_id | UUID FK → categories | |
| type | ENUM(income, expense) | |
| amount | NUMERIC(15,2) | in user's primary_currency |
| date | DATE | |
| description | TEXT nullable | |
| created_at | TIMESTAMPTZ | |

---

## 4. Business Rules

### Categories

- **Visibility:** `GET /categories` returns system categories (user_id=null) + current user's own categories. Soft-deleted categories are excluded (`deleted_at IS NULL`).
- **Subcategories:** one level of nesting only. A category with `parent_id` set is a subcategory. Subcategories cannot have their own children.
- **Creating subcategories:** allowed under system categories and under the current user's own top-level categories. Not allowed under another user's custom category.
- **Editing:** only user's own categories (not system). `is_system=true` → 403.
- **Soft delete:** `DELETE /categories/{id}` sets `deleted_at = now()`. Physical row is never removed.
  - Block if category has active (non-deleted) children → 409.
  - Block if category is system → 403.
  - Block if category has any transactions referencing it → 409.
- **Response shape:** nested tree — each top-level category includes a `children` array of its subcategories.

### Transactions

- **Ownership:** users see and manage only their own transactions.
- **Date filter:** `GET /transactions?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`. Both params optional; without them returns all transactions for the user.
- **Category validation:** on create/update, `category_id` must reference a category visible to the user (system or own) and not soft-deleted. Any level (top or sub) is valid.
- **Hard delete:** `DELETE /transactions/{id}` physically removes the row.

---

## 5. API

All endpoints require `Authorization: Bearer <access_token>`.

### Categories

```
GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/{id}
DELETE /api/v1/categories/{id}
```

**GET /api/v1/categories** — response:
```json
[
  {
    "id": "uuid",
    "name": "Еда",
    "type": "expense",
    "icon": "utensils",
    "color": "#f97316",
    "is_system": true,
    "user_id": null,
    "parent_id": null,
    "children": [
      {
        "id": "uuid",
        "name": "Рестораны",
        "type": "expense",
        "icon": "fork-knife",
        "color": "#f97316",
        "is_system": false,
        "user_id": "uuid",
        "parent_id": "uuid",
        "children": []
      }
    ]
  }
]
```

**POST /api/v1/categories** — body:
```json
{
  "name": "Рестораны",
  "type": "expense",
  "icon": "fork-knife",
  "color": "#f97316",
  "parent_id": "uuid-or-null"
}
```

Returns `201` with created category (no `children` field, always empty on create).

**PUT /api/v1/categories/{id}** — same body fields, all optional. Returns updated category.

**DELETE /api/v1/categories/{id}** — returns `204`. Errors: `403` (system), `409` (has children or has transactions).

### Transactions

```
GET    /api/v1/transactions?date_from=&date_to=
POST   /api/v1/transactions
PUT    /api/v1/transactions/{id}
DELETE /api/v1/transactions/{id}
```

**GET /api/v1/transactions** — returns flat list ordered by `date DESC, created_at DESC`.

**POST /api/v1/transactions** — body:
```json
{
  "category_id": "uuid",
  "type": "expense",
  "amount": "1500.00",
  "date": "2026-05-24",
  "description": "Обед"
}
```

Returns `201` with created transaction.

**PUT /api/v1/transactions/{id}** — same body, all fields optional.

**DELETE /api/v1/transactions/{id}** — returns `204`.

---

## 6. System Default Categories

Seeded via Alembic data migration (runs once with `alembic upgrade head`):

| Name | Type | Icon | Color |
|---|---|---|---|
| Еда | expense | `utensils` | `#f97316` |
| Транспорт | expense | `car` | `#3b82f6` |
| Жильё | expense | `home` | `#8b5cf6` |
| Здоровье | expense | `heart-pulse` | `#ef4444` |
| Развлечения | expense | `gamepad-2` | `#ec4899` |
| Одежда | expense | `shirt` | `#f59e0b` |
| Образование | expense | `graduation-cap` | `#06b6d4` |
| Прочие расходы | expense | `circle-ellipsis` | `#6b7280` |
| Зарплата | income | `briefcase` | `#22c55e` |
| Фриланс | income | `laptop` | `#10b981` |
| Инвестиции | income | `trending-up` | `#14b8a6` |
| Прочие доходы | income | `plus-circle` | `#6b7280` |

---

## 7. Error Handling

| Situation | HTTP Status |
|---|---|
| Category not found | 404 |
| Transaction not found | 404 |
| Editing/deleting system category | 403 |
| Editing/deleting another user's category | 403 |
| Deleting category with children | 409 |
| Deleting category with transactions | 409 |
| Creating transaction with deleted/inaccessible category | 409 |
| Subcategory under subcategory | 422 |

---

## 8. Testing Strategy

- **Unit tests** — use cases tested via `FakeCategoryRepository` / `FakeTransactionRepository` (no DB, no HTTP).
- **Integration tests** — HTTP via `AsyncClient` with `USE_FAKE_REPO=true` monkeypatched in `conftest.py`.

Key scenarios to cover:
- List categories returns system + own, excludes soft-deleted
- Create top-level and subcategory
- Cannot create subcategory under another subcategory (422)
- Cannot edit/delete system category (403)
- Cannot delete category with active children (409)
- Cannot delete category that has transactions (409)
- Soft-deleted category excluded from list
- List transactions with and without date filters
- Cannot create transaction referencing soft-deleted category (409)
- Delete transaction is permanent (hard delete)
- User cannot access another user's transactions (404)
