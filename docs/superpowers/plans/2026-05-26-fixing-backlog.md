# Fixing Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix nine independent backlog items — categories isolation, stats `day` period + custom range, deposit yield calculator, emoji→Lucide migration, dark-theme glows, light-mode BottomNav, light-mode account cards, balance card theming, and Docker auto-migration.

**Architecture:** Backend changes use Alembic migrations + FastAPI dependency injection patterns already in place. Frontend changes are purely inline-style edits in React components and the Zustand store. No new routes, models, or packages are introduced.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy (async), Alembic, pytest-asyncio, React 18, TypeScript, Zustand, TanStack Query, Lucide-react, Vite.

---

## Scope Check

Nine items are independent enough to implement in sequence with individual commits. The spec groups them in one plan and they share no inter-task dependencies, so one plan is appropriate.

---

## File Map

**Backend:**
- Modify: `backend/migrations/versions/` — new migration file (delete global categories)
- Modify: `backend/app/modules/auth/application/use_cases.py` — `RegisterUserUseCase.execute()` + new `_create_default_categories` helper
- Modify: `backend/app/modules/auth/presentation/router.py` — pass category repo to register endpoint
- Modify: `backend/app/dependencies.py` — expose `get_category_repository` to auth router
- Modify: `backend/app/modules/categories/infrastructure/repository.py` — `list_for_user()` removes `IS NULL` OR clause
- Modify: `backend/app/modules/stats/presentation/router.py` — `resolve_period` regex + `day` branch
- Modify: `docker-compose.yml` — api command runs `alembic upgrade head` before uvicorn

**Frontend:**
- Modify: `frontend/src/api/types.ts` — add `'day'` to `StatPeriod`; add `CustomRange` type
- Modify: `frontend/src/api/endpoints/stats.ts` — overload to accept `period` OR `{ date_from, date_to }`
- Modify: `frontend/src/features/analytics/hooks/useStats.ts` — accept optional `customRange`
- Modify: `frontend/src/features/analytics/AnalyticsScreen.tsx` — add `'day'` period button + `'custom'` tab with date inputs
- Modify: `frontend/src/features/accounts/DepositDetailModal.tsx` — yield calculator block
- Modify: `frontend/src/features/accounts/AccountsScreen.tsx` — replace 💰 with `<Landmark />`
- Modify: `frontend/src/features/home/HomeScreen.tsx` — balance card vars, account slider `var(--color-surface2)`, account card glows
- Modify: `frontend/src/shared/components/BottomNav.tsx` — light/dark conditional background
- Modify: `frontend/src/App.tsx` — set `--accent-bg-start` / `--accent-bg-end` CSS vars in theme effect

**Tests:**
- Modify: `backend/tests/integration/auth/test_auth_router.py` — test default categories created on register
- Modify: `backend/tests/integration/auth/conftest.py` — inject fake category repo
- Modify: `backend/tests/integration/stats/test_stats_router.py` — test `day` period

---

## Task 1: Migration — Delete Global System Categories

**Files:**
- Create: `backend/migrations/versions/<new_id>_remove_global_system_categories.py`

- [ ] **Step 1: Generate new migration file**

```bash
cd backend && alembic revision --message "remove_global_system_categories"
```

Copy the printed revision ID (e.g. `abc123def456`). The file is created at `backend/migrations/versions/abc123def456_remove_global_system_categories.py`.

- [ ] **Step 2: Write the migration body**

Open the generated file and replace its `upgrade`/`downgrade` stubs with:

```python
def upgrade() -> None:
    op.execute("DELETE FROM categories WHERE user_id IS NULL")


def downgrade() -> None:
    pass  # non-reversible data deletion — re-seed manually if needed
```

- [ ] **Step 3: Verify migration runs without error (Docker stack)**

```bash
docker compose run --rm api alembic upgrade head
```

Expected: last line prints `Running upgrade ... -> <revision_id>, remove_global_system_categories` with no traceback.

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/versions/
git commit -m "feat: migration — delete global (user_id IS NULL) system categories"
```

---

## Task 2: Per-User Default Categories on Registration

The auth router currently calls `RegisterUserUseCase(repo)` with only the user repo. We extend it to also accept a category repo and call a new helper that bulk-inserts the 12 default categories with `is_system=True` for the new user.

**Files:**
- Modify: `backend/app/modules/auth/application/use_cases.py`
- Modify: `backend/app/modules/auth/presentation/router.py`
- Modify: `backend/app/modules/categories/infrastructure/repository.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/integration/auth/test_auth_router.py`:

```python
async def test_register_creates_default_categories(
    client: AsyncClient, fake_category_repo
) -> None:
    await client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com", "password": "pass1234",
        "full_name": "New User", "primary_currency": "RUB",
    })
    # 12 default categories should exist for the new user
    assert len(fake_category_repo.rows) == 12
    assert all(c.is_system for c in fake_category_repo.rows)
    assert all(c.user_id is not None for c in fake_category_repo.rows)
```

- [ ] **Step 2: Add `fake_category_repo` fixture to the auth conftest**

Edit `backend/tests/integration/auth/conftest.py` — replace the entire file content:

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.dependencies import get_user_repository, get_category_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository


@pytest.fixture
def fake_category_repo() -> FakeCategoryRepository:
    return FakeCategoryRepository()


@pytest.fixture
async def client(fake_category_repo: FakeCategoryRepository) -> AsyncClient:
    fresh_user_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_user_repo
    app.dependency_overrides[get_category_repository] = lambda: fake_category_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    await client.post("/api/v1/auth/register", json={
        "email": "theme@example.com", "password": "pass1234",
        "full_name": "Theme User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "theme@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

- [ ] **Step 3: Inspect the FakeCategoryRepository to see its `rows` field**

```bash
cat backend/app/modules/categories/infrastructure/fake_repository.py
```

Note the field name that stores created categories (likely `self._categories` or `self.rows`). If it's `self._categories`, adjust the test assertion to `fake_category_repo._categories`.

- [ ] **Step 4: Run the new test to confirm it fails**

```bash
cd backend && python -m pytest tests/integration/auth/test_auth_router.py::test_register_creates_default_categories -v
```

Expected: FAIL — `assert len(...) == 12` fails because `RegisterUserUseCase` doesn't create categories yet.

- [ ] **Step 5: Add `_create_default_categories` helper and update `RegisterUserUseCase`**

Edit `backend/app/modules/auth/application/use_cases.py` — replace the entire file:

```python
import uuid
from app.modules.auth.application.dtos import (
    LoginUserDTO,
    RegisterUserDTO,
    TokenPairDTO,
    UserDTO,
)
from app.modules.auth.application.services import JWTService, PasswordHasher
from app.modules.auth.domain.entities import User
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.categories.domain.entities import Category
from app.modules.categories.domain.interfaces import ICategoryRepository
from app.shared.exceptions import AlreadyExistsError, AuthenticationError

_DEFAULT_CATEGORIES = [
    ("Еда",            "expense", "utensils",         "#f97316"),
    ("Транспорт",      "expense", "car",               "#3b82f6"),
    ("Жильё",          "expense", "home",              "#8b5cf6"),
    ("Здоровье",       "expense", "heart-pulse",       "#ef4444"),
    ("Развлечения",    "expense", "gamepad-2",         "#ec4899"),
    ("Одежда",         "expense", "shirt",             "#f59e0b"),
    ("Образование",    "expense", "graduation-cap",    "#06b6d4"),
    ("Прочие расходы", "expense", "circle-ellipsis",   "#6b7280"),
    ("Зарплата",       "income",  "briefcase",         "#22c55e"),
    ("Фриланс",        "income",  "laptop",            "#10b981"),
    ("Инвестиции",     "income",  "trending-up",       "#14b8a6"),
    ("Прочие доходы",  "income",  "plus-circle",       "#6b7280"),
]


async def _create_default_categories(user_id: uuid.UUID, repo: ICategoryRepository) -> None:
    for name, type_, icon, color in _DEFAULT_CATEGORIES:
        await repo.create(Category(
            user_id=user_id,
            parent_id=None,
            name=name,
            type=type_,
            icon=icon,
            color=color,
            is_system=True,
        ))


class RegisterUserUseCase:
    def __init__(self, user_repo: IUserRepository, category_repo: ICategoryRepository) -> None:
        self._repo = user_repo
        self._category_repo = category_repo

    async def execute(self, dto: RegisterUserDTO) -> UserDTO:
        email = dto.email.lower().strip()
        if await self._repo.find_by_email(email):
            raise AlreadyExistsError("User", email)
        user = User(
            email=email,
            full_name=dto.full_name,
            primary_currency=dto.primary_currency,
            password_hash=PasswordHasher.hash(dto.password),
        )
        saved = await self._repo.create(user)
        await _create_default_categories(saved.id, self._category_repo)
        return UserDTO(
            id=saved.id,
            email=saved.email,
            full_name=saved.full_name,
            primary_currency=saved.primary_currency,
            is_active=saved.is_active,
        )


class LoginUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

    async def execute(self, dto: LoginUserDTO) -> TokenPairDTO:
        user = await self._repo.find_by_email(dto.email.lower().strip())
        if not user or not user.password_hash:
            raise AuthenticationError()
        if not PasswordHasher.verify(dto.password, user.password_hash):
            raise AuthenticationError()
        return TokenPairDTO(
            access_token=JWTService.create_access_token(user.id),
            refresh_token=JWTService.create_refresh_token(user.id),
        )
```

- [ ] **Step 6: Check `Category` entity constructor**

```bash
cat backend/app/modules/categories/domain/entities.py
```

Ensure the `Category` entity accepts `user_id`, `parent_id`, `name`, `type`, `icon`, `color`, `is_system` as keyword args. If `id` or `deleted_at` are required positional args, adjust the `Category(...)` calls in Step 5 to include `id=uuid.uuid4(), deleted_at=None`.

- [ ] **Step 7: Update the auth router to inject category repo**

Edit `backend/app/modules/auth/presentation/router.py` — change the register endpoint:

```python
from app.dependencies import get_current_user_id, get_user_repository, get_category_repository
from app.modules.categories.domain.interfaces import ICategoryRepository

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    repo: IUserRepository = Depends(get_user_repository),
    category_repo: ICategoryRepository = Depends(get_category_repository),
) -> UserResponse:
    try:
        dto = await RegisterUserUseCase(repo, category_repo).execute(
            RegisterUserDTO(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
                primary_currency=body.primary_currency,
            )
        )
    except AlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    return UserResponse(
        id=dto.id,
        email=dto.email,
        full_name=dto.full_name,
        primary_currency=dto.primary_currency,
        is_active=dto.is_active,
    )
```

Leave all other endpoints (login, refresh, me) unchanged.

- [ ] **Step 8: Run the test again — must pass**

```bash
cd backend && python -m pytest tests/integration/auth/test_auth_router.py::test_register_creates_default_categories -v
```

Expected: PASS.

- [ ] **Step 9: Run all auth tests to check no regressions**

```bash
cd backend && python -m pytest tests/integration/auth/ -v
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/app/modules/auth/ backend/tests/integration/auth/
git commit -m "feat: create 12 per-user default categories on registration"
```

---

## Task 3: Categories Repo — Remove Global OR Clause

**Files:**
- Modify: `backend/app/modules/categories/infrastructure/repository.py`

- [ ] **Step 1: Write the failing test (unit)**

Add to `backend/tests/unit/categories/test_use_cases.py` (or create a new file `backend/tests/unit/categories/test_repository_isolation.py`):

```python
# Verify list_for_user does NOT return categories from other users or NULL-user categories
import pytest
from uuid import uuid4
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.categories.domain.entities import Category


@pytest.mark.asyncio
async def test_list_for_user_excludes_null_user_categories() -> None:
    repo = FakeCategoryRepository()
    user_id = uuid4()
    other_user_id = uuid4()

    # seed one category for user, one for other user, one with user_id=None
    await repo.create(Category(user_id=user_id, parent_id=None, name="Mine", type="expense", icon="x", color="#fff", is_system=False))
    await repo.create(Category(user_id=other_user_id, parent_id=None, name="Other", type="expense", icon="x", color="#fff", is_system=False))
    await repo.create(Category(user_id=None, parent_id=None, name="Global", type="expense", icon="x", color="#fff", is_system=True))

    result = await repo.list_for_user(user_id)
    names = [c.name for c in result]
    assert "Mine" in names
    assert "Other" not in names
    assert "Global" not in names
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && python -m pytest tests/unit/categories/test_repository_isolation.py -v
```

Expected: FAIL — "Global" IS in the result because `FakeCategoryRepository.list_for_user` probably also has the OR clause. Note: this may also require fixing the fake repo.

- [ ] **Step 3: Fix `FakeCategoryRepository.list_for_user`**

```bash
cat backend/app/modules/categories/infrastructure/fake_repository.py
```

Find the `list_for_user` method. Change the filter so it only returns `c.user_id == user_id` (remove `or c.user_id is None`). Example after fix:

```python
async def list_for_user(self, user_id: UUID) -> list[Category]:
    return [
        c for c in self._categories
        if c.deleted_at is None and c.user_id == user_id
    ]
```

- [ ] **Step 4: Fix `SQLAlchemyCategoryRepository.list_for_user`**

Edit `backend/app/modules/categories/infrastructure/repository.py` lines 31–38. Change:

```python
    async def list_for_user(self, user_id: UUID) -> list[Category]:
        result = await self._session.execute(
            select(CategoryModel).where(
                CategoryModel.deleted_at.is_(None),
                CategoryModel.user_id == user_id,
            )
        )
        return [_to_entity(m) for m in result.scalars().all()]
```

(Remove the `(CategoryModel.user_id.is_(None)) | (CategoryModel.user_id == user_id)` compound condition.)

- [ ] **Step 5: Run the test again — must pass**

```bash
cd backend && python -m pytest tests/unit/categories/test_repository_isolation.py -v
```

Expected: PASS.

- [ ] **Step 6: Run all category tests**

```bash
cd backend && python -m pytest tests/unit/categories/ tests/integration/categories/ -v
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/categories/ backend/tests/unit/categories/
git commit -m "feat: categories list_for_user returns only user-owned categories (no global IS NULL)"
```

---

## Task 4: Stats — Add `day` Period (Backend)

**Files:**
- Modify: `backend/app/modules/stats/presentation/router.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/integration/stats/test_stats_router.py`:

```python
async def test_categories_day_period(
    client: AsyncClient, auth_headers: dict, fake_stats_repo: FakeStatsRepository
) -> None:
    from datetime import date
    fake_stats_repo.seed_category_rows([])
    resp = await client.get(
        CATEGORIES_URL, headers=auth_headers, params={"period": "day"}
    )
    assert resp.status_code == 200
    data = resp.json()
    today = date.today().isoformat()
    assert data["date_from"] == today
    assert data["date_to"] == today
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && python -m pytest tests/integration/stats/test_stats_router.py::test_categories_day_period -v
```

Expected: FAIL with 422 (validation error — `day` not allowed by pattern).

- [ ] **Step 3: Extend `resolve_period` in the stats router**

Edit `backend/app/modules/stats/presentation/router.py` lines 27–59. Change:

```python
def resolve_period(
    period: Annotated[str | None, Query(pattern=r"^(this_month|prev_month|this_year|day)$")] = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[date, date]:
    today = date.today()
    if period is not None and (date_from is not None or date_to is not None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot use period together with date_from/date_to",
        )
    if (date_from is None) != (date_to is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Must specify both date_from and date_to or neither",
        )
    if date_from is not None and date_to is not None:
        if date_from > date_to:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_from must be <= date_to",
            )
        return date_from, date_to
    target = period or "this_month"
    if target == "this_month":
        first = date(today.year, today.month, 1)
        last = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
        return first, last
    elif target == "prev_month":
        last_prev = date(today.year, today.month, 1) - timedelta(days=1)
        return date(last_prev.year, last_prev.month, 1), last_prev
    elif target == "day":
        return today, today
    else:  # this_year
        return date(today.year, 1, 1), date(today.year, 12, 31)
```

- [ ] **Step 4: Run the test again — must pass**

```bash
cd backend && python -m pytest tests/integration/stats/test_stats_router.py::test_categories_day_period -v
```

Expected: PASS.

- [ ] **Step 5: Run all stats tests**

```bash
cd backend && python -m pytest tests/integration/stats/ -v
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/modules/stats/presentation/router.py backend/tests/integration/stats/
git commit -m "feat: stats — add 'day' period (today → today range)"
```

---

## Task 5: Stats — Frontend `day` Period + Custom Date Range

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/endpoints/stats.ts`
- Modify: `frontend/src/features/analytics/hooks/useStats.ts`
- Modify: `frontend/src/features/analytics/AnalyticsScreen.tsx`

- [ ] **Step 1: Extend `StatPeriod` type and add `CustomRange`**

Edit `frontend/src/api/types.ts` line 3. Change:

```typescript
export type StatPeriod = 'this_month' | 'prev_month' | 'this_year' | 'day'
export interface CustomRange { date_from: string; date_to: string }
```

- [ ] **Step 2: Update `statsApi` to accept period OR custom range**

Edit `frontend/src/api/endpoints/stats.ts` — replace entire file:

```typescript
import { api } from '../client'
import type { CategoryStatsResponse, TimelineResponse, AccountStatsResponse, StatPeriod, CustomRange } from '../types'

type PeriodOrRange = { period: StatPeriod } | CustomRange

function periodParams(p: PeriodOrRange) {
  if ('period' in p) return { period: p.period }
  return { date_from: p.date_from, date_to: p.date_to }
}

export const statsApi = {
  categories: (p: PeriodOrRange) =>
    api.get<CategoryStatsResponse>('/api/v1/stats/categories', { params: periodParams(p) }).then(r => r.data),
  timeline: (p: PeriodOrRange, granularity: 'month' | 'day' = 'month') =>
    api.get<TimelineResponse>('/api/v1/stats/timeline', { params: { ...periodParams(p), granularity } }).then(r => r.data),
  accounts: (p: PeriodOrRange) =>
    api.get<AccountStatsResponse>('/api/v1/stats/accounts', { params: periodParams(p) }).then(r => r.data),
}
```

- [ ] **Step 3: Update `useStats` hook to accept period OR custom range**

Edit `frontend/src/features/analytics/hooks/useStats.ts` — replace entire file:

```typescript
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../../../api/endpoints/stats'
import type { StatPeriod, CustomRange } from '../../../api/types'

type PeriodOrRange = { period: StatPeriod } | CustomRange

export function useStats(p: PeriodOrRange) {
  const key = 'period' in p ? p.period : `${p.date_from}/${p.date_to}`
  const categories = useQuery({ queryKey: ['stats', 'categories', key], queryFn: () => statsApi.categories(p) })
  const timeline = useQuery({ queryKey: ['stats', 'timeline', key], queryFn: () => statsApi.timeline(p) })
  return { categories, timeline }
}
```

- [ ] **Step 4: Update `AnalyticsScreen` to use new hook signature, add `day` + `custom` tabs**

Edit `frontend/src/features/analytics/AnalyticsScreen.tsx` — replace entire file:

```typescript
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { useStats } from './hooks/useStats'
import { formatAmount } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'
import type { StatPeriod, CustomRange } from '../../api/types'

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'day',        label: 'День' },
  { value: 'this_month', label: 'Месяц' },
  { value: 'prev_month', label: 'Прошлый' },
  { value: 'this_year',  label: 'Год' },
]

const PIE_COLORS = ['#6366f1','#ec4899','#34d399','#f59e0b','#06b6d4','#a855f7','#f87171','#10b981']

type ActiveTab = StatPeriod | 'custom'

export function AnalyticsScreen() {
  const [tab, setTab] = useState<ActiveTab>('this_month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const statsParam: { period: StatPeriod } | CustomRange =
    tab === 'custom' && dateFrom && dateTo
      ? { date_from: dateFrom, date_to: dateTo }
      : { period: (tab === 'custom' ? 'this_month' : tab) as StatPeriod }

  const { categories, timeline } = useStats(statsParam)

  const expenseData = categories.data?.expense_by_category.map(c => ({
    name: c.category_name, value: Math.abs(parseFloat(c.amount)),
  })) ?? []

  const timelineData = timeline.data?.periods.map(p => ({
    name: p.period,
    income: parseFloat(p.income),
    expense: Math.abs(parseFloat(p.expense)),
  })) ?? []

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 20 }}>Аналитика</div>

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: tab === 'custom' ? 12 : 24, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setTab(p.value)} style={{
            flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 600,
            background: tab === p.value ? 'var(--accent-tint)' : COLORS.surface2,
            border: `1.5px solid ${tab === p.value ? 'var(--accent)' : COLORS.border}`,
            color: tab === p.value ? 'var(--accent)' : COLORS.textSecondary,
            cursor: 'pointer',
          }}>{p.label}</button>
        ))}
        <button onClick={() => setTab('custom')} style={{
          flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 600,
          background: tab === 'custom' ? 'var(--accent-tint)' : COLORS.surface2,
          border: `1.5px solid ${tab === 'custom' ? 'var(--accent)' : COLORS.border}`,
          color: tab === 'custom' ? 'var(--accent)' : COLORS.textSecondary,
          cursor: 'pointer',
        }}>Период</button>
      </div>

      {/* Custom date range inputs */}
      {tab === 'custom' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 14, fontSize: 13,
              background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
              color: COLORS.textPrimary,
            }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 14, fontSize: 13,
              background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
              color: COLORS.textPrimary,
            }}
          />
        </div>
      )}

      {/* Summary */}
      {categories.data && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 18, background: `${COLORS.income}12`, border: `1px solid ${COLORS.income}33` }}>
            <div style={{ fontSize: 11, color: COLORS.income, fontWeight: 600, marginBottom: 4 }}>ДОХОДЫ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.income }}>+{formatAmount(parseFloat(categories.data.total_income))} ₽</div>
          </div>
          <div style={{ flex: 1, padding: '14px 16px', borderRadius: 18, background: `${COLORS.expense}12`, border: `1px solid ${COLORS.expense}33` }}>
            <div style={{ fontSize: 11, color: COLORS.expense, fontWeight: 600, marginBottom: 4 }}>РАСХОДЫ</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.expense }}>−{formatAmount(Math.abs(parseFloat(categories.data.total_expense)))} ₽</div>
          </div>
        </div>
      )}

      {/* Timeline bar chart */}
      {timelineData.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Доходы / Расходы</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timelineData} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
                formatter={(v) => typeof v === 'number' ? `${formatAmount(v)} ₽` : String(v)}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="income" fill={COLORS.income} radius={[6,6,0,0]} maxBarSize={24} name="Доход" />
              <Bar dataKey="expense" fill={COLORS.expense} radius={[6,6,0,0]} maxBarSize={24} name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense pie chart */}
      {expenseData.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Расходы по категориям</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <PieChart width={140} height={140}>
              <Pie data={expenseData} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {expenseData.map((entry, i) => <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenseData.slice(0, 5).map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: COLORS.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 600 }}>{formatAmount(item.value)} ₽</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(categories.isLoading || timeline.isLoading) && <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка статистики...</div>}
      {(categories.isError || timeline.isError) && <div style={{ color: COLORS.expense, fontSize: 13 }}>Ошибка загрузки</div>}
    </div>
  )
}
```

- [ ] **Step 5: Check TypeScript builds cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/endpoints/stats.ts frontend/src/features/analytics/
git commit -m "feat: analytics — add 'day' period and custom date range picker"
```

---

## Task 6: Deposit Yield Calculator in `DepositDetailModal`

**Files:**
- Modify: `frontend/src/features/accounts/DepositDetailModal.tsx`

- [ ] **Step 1: Add yield calculation helper and yield block**

Edit `frontend/src/features/accounts/DepositDetailModal.tsx` — replace entire file:

```typescript
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { depositsApi } from '../../api/endpoints/deposits'
import { formatCurrency } from '../../shared/lib/format'
import { COLORS } from '../../shared/tokens'
import type { DepositResponse } from '../../api/types'

function calcYield(d: DepositResponse): { yieldAmt: number; projectedBalance: number } | null {
  const today = new Date()
  const closeDate = new Date(d.close_date)
  const daysUntilClose = Math.max(0, Math.floor((closeDate.getTime() - today.getTime()) / 86_400_000))
  const months = Math.max(1, Math.round(daysUntilClose / 30.44))
  const rate = parseFloat(d.interest_rate) / 100
  const balance = parseFloat(d.balance)
  if (isNaN(rate) || isNaN(balance) || balance <= 0) return null
  let yieldAmt: number
  if (d.interest_type === 'simple') {
    yieldAmt = balance * rate * (months / 12)
  } else {
    yieldAmt = balance * Math.pow(1 + rate / 12, months) - balance
  }
  return { yieldAmt, projectedBalance: balance + yieldAmt }
}

export function DepositDetailModal() {
  const { modal, closeModal } = useUIStore()
  const open = modal.type === 'deposit-detail'
  const depositId = (modal.payload as { depositId?: string })?.depositId

  const { data } = useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () => depositsApi.get(depositId!),
    enabled: open && !!depositId,
  })

  const rows = data ? [
    ['Банк', data.bank_name],
    ['Сумма', formatCurrency(parseFloat(data.amount), data.currency)],
    ['Баланс', formatCurrency(parseFloat(data.balance), data.currency)],
    ['Ставка', `${data.interest_rate}% (${data.interest_type === 'compound' ? 'сложные' : 'простые'})`],
    ['Открыт', data.open_date],
    ['Закрыть', data.close_date],
    ['Автопролонгация', data.auto_renew ? 'Да' : 'Нет'],
    ['Статус', data.status],
  ] : []

  const yieldResult = data ? calcYield(data) : null

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>Детали вклада</div>
        {data && (
          <>
            <div style={{ background: COLORS.surface2, borderRadius: 16, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              {rows.map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none', fontSize: 13 }}>
                  <span style={{ color: COLORS.textSecondary }}>{k}</span>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {yieldResult && (
              <div style={{ marginTop: 16, background: COLORS.surface2, borderRadius: 16, padding: '16px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Ожидаемый доход
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Доход</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.income }}>
                    +{formatCurrency(yieldResult.yieldAmt, data.currency)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Итог</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                    {formatCurrency(yieldResult.projectedBalance, data.currency)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        {!data && <div style={{ color: COLORS.textSecondary }}>Загрузка...</div>}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/accounts/DepositDetailModal.tsx
git commit -m "feat: deposit detail modal — projected yield calculator"
```

---

## Task 7: Emoji → Lucide Icon in AccountsScreen

**Files:**
- Modify: `frontend/src/features/accounts/AccountsScreen.tsx`

- [ ] **Step 1: Verify `lucide-react` is already installed**

```bash
cd frontend && grep '"lucide-react"' package.json
```

Expected: line found. If not installed: `npm install lucide-react`.

- [ ] **Step 2: Replace 💰 with `<Landmark />`**

Edit `frontend/src/features/accounts/AccountsScreen.tsx`:

Add to the import block at the top:
```typescript
import { Landmark } from 'lucide-react'
```

Change line 75 (the deposit icon cell) from:
```typescript
                  💰
```
to:
```typescript
                  <Landmark size={18} />
```

- [ ] **Step 3: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/accounts/AccountsScreen.tsx
git commit -m "fix: replace 💰 emoji with Landmark lucide icon in deposit rows"
```

---

## Task 8: Dark Theme Glows on Cards

**Files:**
- Modify: `frontend/src/features/accounts/AccountsScreen.tsx`
- Modify: `frontend/src/features/home/HomeScreen.tsx`

- [ ] **Step 1: Add glow shadow to account cards in AccountsScreen**

In `frontend/src/features/accounts/AccountsScreen.tsx`, both the savings account button (line ~41–57) and deposit button (line ~68–86) have `border: \`1px solid ${COLORS.border}\``. Add `boxShadow: '0 4px 20px rgba(0,0,0,0.35)'` to both card `style` objects.

Savings account button style — change from:
```typescript
                background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
                cursor: 'pointer', textAlign: 'left',
```
to:
```typescript
                background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                cursor: 'pointer', textAlign: 'left',
```

Deposit button style — apply the same addition:
```typescript
                background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                cursor: 'pointer', textAlign: 'left',
```

- [ ] **Step 2: Add glow shadow to account slider cards in HomeScreen**

In `frontend/src/features/home/HomeScreen.tsx`, the account slider card div (around line 296–307) has `background: '#0d1220'`. Add `boxShadow: '0 4px 20px rgba(0,0,0,0.35)'` alongside the existing styles.

Change:
```typescript
                  background: '#0d1220',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: 18,
```
to:
```typescript
                  background: '#0d1220',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: 18,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
```

- [ ] **Step 3: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/accounts/AccountsScreen.tsx frontend/src/features/home/HomeScreen.tsx
git commit -m "feat: add dark theme card glows (box-shadow) to account and deposit cards"
```

---

## Task 9: Light Theme BottomNav

**Files:**
- Modify: `frontend/src/shared/components/BottomNav.tsx`

- [ ] **Step 1: Read `themeMode` from the store and apply conditional styles**

Edit `frontend/src/shared/components/BottomNav.tsx` — replace entire file:

```typescript
import { NavLink } from 'react-router-dom'
import { Icons } from '../icons'
import { useUIStore } from '../../store/ui'
import { COLORS } from '../tokens'

const TABS = [
  { to: '/',          label: 'Главная',   icon: Icons.home },
  { to: '/accounts',  label: 'Счета',     icon: Icons.bank },
  { to: '/analytics', label: 'Аналитика', icon: Icons.chart },
  { to: '/profile',   label: 'Профиль',   icon: Icons.user },
]

export function BottomNav() {
  const openModal  = useUIStore((s) => s.openModal)
  const themeMode  = useUIStore((s) => s.themeMode)
  const isLight = themeMode === 'light'

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 20px)', paddingTop: 10,
      background: isLight
        ? 'var(--color-surface)'
        : 'linear-gradient(to top, rgba(8,10,20,0.97) 60%, rgba(8,10,20,0))',
      backdropFilter: 'blur(20px)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
      borderTop: `1px solid ${COLORS.border}`,
      boxShadow: isLight ? '0 -4px 16px rgba(0,0,0,0.06)' : 'none',
      zIndex: 30,
    }}>
      {TABS.slice(0, 2).map(tab => <NavItem key={tab.to} {...tab} />)}
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <button
          onClick={() => openModal('add-tx')}
          style={{
            width: 50, height: 50, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 0, color: '#fff', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 10px 22px var(--accent-shadow)',
            transform: 'translateY(-6px)',
          }}
        >
          {Icons.plus(22)}
        </button>
      </div>
      {TABS.slice(2).map(tab => <NavItem key={tab.to} {...tab} />)}
    </div>
  )
}

function NavItem({ to, label, icon }: typeof TABS[0]) {
  return (
    <NavLink to={to} end={to === '/'} style={({ isActive }) => ({
      background: 'none', border: 0, cursor: 'pointer', textDecoration: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      color: isActive ? 'var(--accent)' : COLORS.textMuted, padding: 0,
    })}>
      {({ isActive }) => (
        <>
          <div style={{
            width: 38, height: 28, borderRadius: 9,
            background: isActive ? 'var(--accent-tint)' : 'transparent',
            display: 'grid', placeItems: 'center',
          }}>
            {icon(20)}
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/components/BottomNav.tsx
git commit -m "fix: BottomNav — light mode uses surface bg + shadow, dark keeps gradient"
```

---

## Task 10: Light Theme Account Slider Cards in HomeScreen

**Files:**
- Modify: `frontend/src/features/home/HomeScreen.tsx`

The account slider cards (around line 296–307) use `background: '#0d1220'` and `border: '1px solid rgba(255,255,255,0.08)'`. Replace with CSS variables so they adapt in light mode.

- [ ] **Step 1: Replace hardcoded dark colors**

In `frontend/src/features/home/HomeScreen.tsx` (account slider card div, ~line 302–305), change:

```typescript
                  background: '#0d1220',
                  border: '1px solid rgba(255,255,255,0.08)',
```
to:
```typescript
                  background: 'var(--color-surface2)',
                  border: `1px solid ${COLORS.border}`,
```

- [ ] **Step 2: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/home/HomeScreen.tsx
git commit -m "fix: account slider cards use CSS variable colors (light mode compatible)"
```

---

## Task 11: Balance Card Theming Bug Fix

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/features/home/HomeScreen.tsx`

The balance card (HomeScreen line ~165–235) uses hardcoded violet gradient and rgba values. We replace these with two new CSS vars `--accent-bg-start` and `--accent-bg-end` set in App.tsx's theme effect from the `bgGlowDark` color in THEMES.

- [ ] **Step 1: Set `--accent-bg-start` and `--accent-bg-end` in App.tsx theme effect**

In `frontend/src/App.tsx`, inside the `useEffect` that already sets `--accent`, `--accent-2`, etc. (lines 31–46), add two lines after the `--accent-tint` line:

```typescript
    r.style.setProperty('--accent-bg-start', t.bgGlowDark.replace('0.30)', '0.70)').replace('0.26)', '0.70)').replace('0.22)', '0.70)').replace('0.28)', '0.70)'))
    r.style.setProperty('--accent-bg-end', t.bgGlowDark)
```

Wait — this is fragile. A cleaner approach: derive a dark bg start/end from the accent hex. Look at `THEMES[theme]`:
- `bgGlowDark` is like `rgba(99,102,241,0.30)` — this is the glow at 30% opacity.
- For the balance card gradient start we want `rgba(R,G,B,0.70)` and end `rgba(R,G,B,0.40)`.

The simplest reliable approach is to add `bgCardStart` and `bgCardEnd` to the THEMES object. But the spec says not to expand scope. Instead, set:

```typescript
    // derive card gradient from accent by replacing the alpha in bgGlowDark
    const glowBase = t.bgGlowDark.slice(0, t.bgGlowDark.lastIndexOf(','))  // e.g. "rgba(99,102,241"
    r.style.setProperty('--accent-bg-start', `${glowBase}, 0.70)`)
    r.style.setProperty('--accent-bg-end',   `${glowBase}, 0.25)`)
```

Replace the `useEffect` in App.tsx (lines 31–46) with:

```typescript
  useEffect(() => {
    const t = THEMES[theme]
    const r = document.documentElement
    r.style.setProperty('--accent', t.accent)
    r.style.setProperty('--accent-2', t.accent2)
    r.style.setProperty('--accent-3', t.accent3)
    r.style.setProperty('--accent-glow', t.glow)
    r.style.setProperty('--accent-shadow', t.shadow)
    r.style.setProperty('--accent-tint', t.accent + '22')
    const glowBase = t.bgGlowDark.slice(0, t.bgGlowDark.lastIndexOf(','))
    r.style.setProperty('--accent-bg-start', `${glowBase}, 0.70)`)
    r.style.setProperty('--accent-bg-end',   `${glowBase}, 0.25)`)
    const glowColor = themeMode === 'dark' ? t.bgGlowDark : t.bgGlowLight
    const bgBase = themeMode === 'dark' ? '#04060d' : '#f4f6fb'
    r.style.setProperty(
      '--bg-gradient',
      `radial-gradient(ellipse 90% 42% at 50% -2%, ${glowColor} 0%, transparent 62%), ${bgBase}`
    )
  }, [theme, themeMode])
```

- [ ] **Step 2: Replace hardcoded balance card styles in HomeScreen**

In `frontend/src/features/home/HomeScreen.tsx`, change the balance card outer div (lines 164–172) from:

```typescript
      <div style={{
        margin: '20px 20px 0',
        padding: '22px 22px 20px',
        borderRadius: 28,
        background: 'linear-gradient(135deg, #1a1060 0%, #2d1b69 40%, #4c1d95 100%)',
        border: '1px solid rgba(139,92,246,0.4)',
        boxShadow: '0 20px 60px rgba(99,102,241,0.3)',
      }}>
```
to:
```typescript
      <div style={{
        margin: '20px 20px 0',
        padding: '22px 22px 20px',
        borderRadius: 28,
        background: 'linear-gradient(135deg, var(--accent-bg-start) 0%, var(--accent-bg-end) 100%)',
        border: '1px solid var(--accent)66',
        boxShadow: '0 20px 60px var(--accent-glow)',
      }}>
```

- [ ] **Step 3: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/features/home/HomeScreen.tsx
git commit -m "fix: balance card uses CSS-variable gradient — updates with theme/color changes"
```

---

## Task 12: Docker — Auto-run Alembic Migrations

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update api `command`**

Edit `docker-compose.yml` line 14. Change:

```yaml
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
to:
```yaml
    command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
```

- [ ] **Step 2: Verify stack starts cleanly**

```bash
docker compose up --build -d
docker compose logs api --tail=30
```

Expected: logs show `Running upgrade ... remove_global_system_categories` followed by `Application startup complete.` with no errors.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: docker — api container runs alembic upgrade head before starting uvicorn"
```

---

## Self-Review Against Spec

**Spec section → task coverage:**

1. System Categories Isolation → Tasks 1 (migration), 2 (per-user seeding), 3 (repo OR clause removal) ✓
2. Stats — `day` Period → Task 4 (backend), Task 5 (frontend) ✓
3. Deposit Yield Calculator → Task 6 ✓
4. Emoji → Lucide → Task 7 ✓
5. Dark Theme Glows → Task 8 ✓
6. Light Theme BottomNav → Task 9 ✓
7. Light Theme Account Cards → Task 10 ✓
8. Balance Container Theming Bug → Task 11 ✓ (App.tsx CSS vars + HomeScreen gradient replacement)
9. Docker auto-migration → Task 12 ✓

**Spec §8 also mentions:** "The account slider cards use hardcoded `background: '#0d1220'`. Replace with `var(--color-surface2)`" — covered in Task 10 (which is also Task 8 extension). Confirmed ✓.

**Placeholder scan:** No TBDs, no "add appropriate error handling", no "similar to Task N" without full code. ✓

**Type consistency:**
- `StatPeriod` extended in types.ts (Task 5 Step 1), used in AnalyticsScreen, useStats hook — consistent ✓
- `CustomRange` defined in types.ts, imported in stats.ts and useStats.ts — consistent ✓
- `PeriodOrRange` union used in stats.ts and useStats.ts — consistent ✓
- `calcYield` in DepositDetailModal takes `DepositResponse` and returns typed object — consistent ✓
- `_create_default_categories(user_id, repo)` defined in use_cases.py, called after `saved = await self._repo.create(user)` — `saved.id` is `UUID` ✓
