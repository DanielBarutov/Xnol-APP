# XNoll — Finance Tracker: Design Spec

**Date:** 2026-05-24
**Status:** Approved

---

## 1. Overview

Multi-user production web application for personal finance management. Covers income/expense tracking, savings account monitoring, and full deposit lifecycle management. Starts as a mobile-first web app; architecture is API-first to support future iOS/Android native clients and bank integrations.

---

## 2. Architecture

### Approach: Modular Monolith

A single FastAPI application composed of five isolated domain modules. Each module enforces Clean Architecture internally. Module boundaries are designed so that individual modules can later be extracted into independent microservices without changing their interfaces.

```
Clients
  React SPA (mobile-first web)
  iOS / Android (future)
  Bank integrations (future)
        │
        │  HTTPS · REST API · JWT
        ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI (async)                    │
│                                                     │
│  ┌─────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │  auth   │ │ transactions │ │     accounts     │ │
│  └─────────┘ └──────────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌─────────────┐                      │
│  │ deposits │ │  statistics │                      │
│  └──────────┘ └─────────────┘                      │
└─────────────────────────────────────────────────────┘
        │                          │
   PostgreSQL                    Redis
  (AsyncPG +                (refresh tokens,
  SQLAlchemy 2.0)            sessions, rate limit)
```

### Clean Architecture — per module

Each module is structured in four layers with strict inward dependency direction:

| Layer | Contents |
|---|---|
| **Domain** | Entities, Value Objects, Domain Events, Repository Interfaces |
| **Application** | Use Cases, DTOs, Commands/Queries, Application Services |
| **Infrastructure** | SQLAlchemy Repos, Fake Repos (flag), OAuth Adapters, Email |
| **Presentation** | FastAPI Routers, Pydantic Schemas, DI Dependencies, Middlewares |

### Fake Repository Flag

The environment variable `USE_FAKE_REPO=true` causes the DI container to inject in-memory repository implementations instead of SQLAlchemy ones. This enables development and testing without a running database. All module interfaces must be satisfied by both the real and fake implementations.

Future infrastructure (Kafka event publishing, bank API adapters) follows the same pattern — interface defined in Domain, real and fake implementations in Infrastructure, switched by environment flag.

---

## 3. Tech Stack

### Backend
- **FastAPI** (async) — Python 3.12+
- **SQLAlchemy 2.0** async ORM with AsyncPG driver
- **Alembic** — database migrations
- **PostgreSQL 16** — primary database
- **Redis** — refresh token storage, session cache, rate limiting
- **Pydantic v2** — request/response validation
- **python-jose** — JWT encoding/decoding
- **Dependency Injector** or manual DI via FastAPI `Depends`

### Frontend
- **React 18** + **Vite**
- **TanStack Router** — type-safe client-side routing
- **TanStack Query** — server state, caching, background refetch
- **Tailwind CSS v4** — utility-first styling
- **Lucide React** — icon library
- **Inter** (Variable font) — primary typeface

### Design system
- Dark theme, iOS Liquid Glass aesthetic
- Glassmorphism cards: `backdrop-filter: blur(32px) saturate(200%)`
- Aurora background blobs (radial gradients, blurred)
- Teal accent (`#14b8a6` / `#2dd4bf`)
- 4pt type scale: 10 / 12 / 14 / 16 / 20 / 28 / 38px
- `font-variant-numeric: tabular-nums` for all monetary values
- Lucide icons throughout, no emoji in UI

---

## 4. Authentication

- **Email + password** — bcrypt hashed, stored in `users.password_hash`
- **OAuth 2.0** — Google and Apple (required for future iOS/Android)
- **JWT** — access token (15 min TTL) + refresh token (30 days, stored in Redis)
- Refresh token rotation: each use issues a new refresh token, old one is invalidated
- Rate limiting on `/auth/*` endpoints via Redis sliding window

---

## 5. Data Model

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR UNIQUE | |
| password_hash | VARCHAR nullable | null for OAuth-only users |
| full_name | VARCHAR | |
| primary_currency | VARCHAR(3) | ISO 4217, e.g. "RUB" |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `oauth_accounts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| provider | ENUM(google, apple) | |
| provider_user_id | VARCHAR | |
| access_token | TEXT | encrypted at rest |
| created_at | TIMESTAMPTZ | |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK nullable | null = system default category |
| name | VARCHAR | |
| type | ENUM(income, expense) | |
| icon | VARCHAR | Lucide icon name |
| color | VARCHAR | hex color |
| is_system | BOOLEAN | |

### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| category_id | UUID FK → categories | |
| type | ENUM(income, expense) | |
| amount | NUMERIC(15,2) | always in primary_currency |
| date | DATE | |
| description | TEXT nullable | |
| created_at | TIMESTAMPTZ | |

### `savings_accounts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| name | VARCHAR | |
| bank_name | VARCHAR | |
| balance | NUMERIC(15,2) | |
| currency | VARCHAR(3) | may differ from primary_currency |
| created_at | TIMESTAMPTZ | |

### `deposits`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| name | VARCHAR | |
| bank_name | VARCHAR | |
| amount | NUMERIC(15,2) | current principal |
| currency | VARCHAR(3) | |
| interest_rate | NUMERIC(5,2) | annual, percent |
| interest_type | ENUM(simple, compound) | |
| start_date | DATE | |
| end_date | DATE | |
| auto_renew | BOOLEAN | |
| status | ENUM(active, closed, expired) | |
| created_at | TIMESTAMPTZ | |

### `deposit_operations`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| deposit_id | UUID FK → deposits | |
| type | ENUM(topup, withdrawal) | |
| amount | NUMERIC(15,2) | |
| date | DATE | |
| description | TEXT nullable | |

### `budgets`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| category_id | UUID FK → categories | |
| amount | NUMERIC(15,2) | |
| period | ENUM(monthly, weekly) | |
| start_date | DATE | |

### `transfers`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| source_type | ENUM(savings_account, deposit, external) | |
| source_id | UUID nullable | references account or deposit |
| source_label | VARCHAR nullable | free text for external: "Наличные", "Карта Сбер" |
| dest_type | ENUM(savings_account, deposit, external) | |
| dest_id | UUID nullable | |
| dest_label | VARCHAR nullable | |
| amount | NUMERIC(15,2) | |
| currency | VARCHAR(3) | |
| date | DATE | |
| description | TEXT nullable | |
| created_at | TIMESTAMPTZ | |

Transfer examples:
- savings_account → savings_account: both `_id` fields filled
- savings_account → cash: `dest_type=external`, `dest_label="Наличные"`, `dest_id=null`
- savings_account → deposit: `dest_type=deposit`, `dest_id=<deposit UUID>`

---

## 6. Features

### 6.1 Dashboard (main screen)
Minimal information, immediate action access:
- Current month label + greeting
- Balance card: total balance in primary currency, secondary currencies displayed below as context
- Income/expense stats for current month on the balance card
- **"Доход" and "Расход" quick-action buttons** — one tap to open add-transaction form
- Horizontal scroll: savings accounts and deposits (name, balance, type tag)
- Last 4–5 transactions with icon, name, category, amount, time

### 6.2 Transactions
- Add income or expense: amount, category (with icon), date (defaults to today), optional description
- Transaction list with filters: date range, category, type
- Edit and delete transactions
- Category management: system defaults pre-loaded, user can add custom categories with Lucide icon + color

### 6.3 Transfers
- Transfer form: source (account/deposit/external with free-text label), destination, amount, date, description
- Transfers appear in transaction history with `arrow-left-right` icon and neutral color (purple)
- Transfers do not affect income/expense totals in statistics

### 6.4 Savings Accounts
- Add/edit/delete savings accounts (name, bank, currency, initial balance)
- Manual balance update
- Simple display: name, bank, balance, currency
- Non-primary currencies displayed as-is (no conversion)

### 6.5 Deposits
- Full deposit lifecycle:
  - Create: name, bank, amount, currency, interest rate, interest type (simple/compound), start date, end date, auto-renew flag
  - View: current balance, accrued interest projection to end date, days remaining
  - Add top-up or partial withdrawal (creates `deposit_operation` record)
  - Close / mark expired
- Expiry notifications (in-app): 30 days before, 7 days before, on expiry day
- Interest income forecast: calculated client-side from rate, type, remaining days

### 6.6 Statistics
Full analytics section (separate from dashboard):
- Period selector: current month, last month, last 3/6/12 months, custom range
- Expense breakdown by category: donut chart + ranked list
- Income vs expense dynamics: bar chart by month
- Budget progress bars per category (actual vs budget limit)
- Period comparison: current vs previous period, delta %
- Savings & deposits summary: total across all accounts by currency
- Export: CSV report for selected period (PDF export — future scope)

---

## 7. Currency Handling

- Each user sets one **primary currency** at registration (e.g. RUB)
- All `transactions` are recorded in primary currency
- `savings_accounts` and `deposits` may have any currency
- Non-primary currencies are displayed as-is — no automatic conversion
- Statistics totals use primary currency only; non-primary balances shown separately

---

## 8. API Design

REST API, versioned under `/api/v1/`. All endpoints require `Authorization: Bearer <access_token>` except `/auth/*`.

Key route groups:
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/oauth/{provider}

GET    /api/v1/transactions
POST   /api/v1/transactions
PUT    /api/v1/transactions/{id}
DELETE /api/v1/transactions/{id}

GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/{id}
DELETE /api/v1/categories/{id}

GET    /api/v1/accounts
POST   /api/v1/accounts
PUT    /api/v1/accounts/{id}
DELETE /api/v1/accounts/{id}

GET    /api/v1/deposits
POST   /api/v1/deposits
PUT    /api/v1/deposits/{id}
POST   /api/v1/deposits/{id}/operations
DELETE /api/v1/deposits/{id}

GET    /api/v1/transfers
POST   /api/v1/transfers
PUT    /api/v1/transfers/{id}
DELETE /api/v1/transfers/{id}

GET    /api/v1/budgets
POST   /api/v1/budgets
PUT    /api/v1/budgets/{id}
DELETE /api/v1/budgets/{id}

GET    /api/v1/statistics/overview
GET    /api/v1/statistics/by-category
GET    /api/v1/statistics/monthly
GET    /api/v1/statistics/export
```

---

## 9. Navigation Structure

```
Bottom Tab Bar (4 tabs)
├── Главная      — dashboard
├── Счета        — savings accounts + deposits list
├── Аналитика    — statistics
└── Профиль      — settings, currency, logout
```

---

## 10. Error Handling

- Validation errors: Pydantic returns `422` with field-level messages
- Auth errors: `401 Unauthorized` with `WWW-Authenticate: Bearer` header
- Not found: `404` with message
- Frontend: TanStack Query retry (3x with exponential backoff) for network errors; toast notifications for user-facing errors
- Transfers: if source account not found or insufficient balance metadata, return `409 Conflict`

---

## 11. Testing Strategy

- **Backend:** pytest + pytest-asyncio; unit tests for use cases with fake repositories; integration tests with real PostgreSQL (Docker)
- **Frontend:** Vitest + React Testing Library for component logic; no mocks for API calls in integration tests
- `USE_FAKE_REPO=true` used in unit test suite; `USE_FAKE_REPO=false` for integration suite

---

## 12. Infrastructure / Deployment

- **Docker Compose** (local dev): FastAPI + PostgreSQL + Redis
- Environment variables via `.env` files (never committed)
- Alembic migrations run on container startup
- Frontend: static build served via Vite dev server locally; nginx in production
- CORS configured to allow only the frontend origin
- `.superpowers/` added to `.gitignore`

---

## 13. Future Scope (out of MVP)

- iOS and Android native apps (React Native or Flutter) — connect to same API
- Bank integrations via Open Banking / CSV import — repository pattern makes swap straightforward
- Kafka event bus for async processing (deposit interest recalculation, notification delivery)
- Push notifications for deposit expiry
- Multi-user household accounts (shared budgets)
