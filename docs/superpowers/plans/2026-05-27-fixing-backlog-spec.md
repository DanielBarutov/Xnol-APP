# Fixing Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 bugs and features from fixing.md spanning categories, deposits, analytics, transactions history, dark theme, and account editing.

**Architecture:** Clean layered architecture (FastAPI backend with use-cases/repos, React+TanStack Query frontend). Backend changes follow the existing pattern: domain entity → DTO → use-case → router. Frontend changes are in-place edits to existing feature screens.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), TypeScript/React/TanStack Query/Lucide React (frontend), pytest-asyncio for backend tests, Vitest for frontend unit tests.

---

## File Map

**Backend – modify:**
- `backend/app/modules/auth/application/use_cases.py` – fix `_DEFAULT_CATEGORIES` icon names
- `backend/app/modules/categories/application/use_cases.py` – remove `is_system` guard from `DeleteCategoryUseCase`
- `backend/app/modules/deposits/application/use_cases.py` – add `GetDepositUseCase`
- `backend/app/modules/deposits/presentation/router.py` – add `GET /{deposit_id}` route
- `backend/tests/unit/categories/test_use_cases.py` – update/add deletion tests
- `backend/tests/integration/categories/test_categories_router.py` – update system-category deletion test
- `backend/tests/unit/deposits/test_use_cases.py` – add get-deposit test
- `backend/tests/integration/deposits/test_deposits_router.py` – add get-deposit integration tests

**Backend – create:**
- `backend/migrations/versions/XXXX_fix_category_icon_names.py` – data migration for existing icon names

**Frontend – modify:**
- `frontend/src/shared/icons/lucide.tsx` – normalize icon names to PascalCase in `DynIcon`
- `frontend/src/index.css` – fix dark theme background color
- `frontend/src/App.tsx` – fix dark mode bgBase
- `frontend/src/features/home/HomeScreen.tsx` – fix account card white text, add transfers to history
- `frontend/src/features/categories/CategoryManageModal.tsx` – show edit/delete for system categories
- `frontend/src/features/analytics/AnalyticsScreen.tsx` – add view selector (3 tabs)
- `frontend/src/features/analytics/hooks/useStats.ts` – fetch account stats too
- `frontend/src/features/home/hooks/useHomeData.ts` – fetch transfers
- `frontend/src/features/transactions/AllTransactionsModal.tsx` – add transfers + account names
- `frontend/src/features/accounts/DepositDetailModal.tsx` – add error state
- `frontend/src/features/accounts/AccountEditModal.tsx` – add balance input field

---

## Task 1: Fix Lucide icon names in default categories (Backend)

**Root cause:** `_DEFAULT_CATEGORIES` in `use_cases.py` stores kebab-case/lowercase names (e.g., `"heart-pulse"`, `"graduation-cap"`). Lucide React exports PascalCase. `DynIcon` does a direct key lookup so all fall back to `Package`.

**Files:**
- Modify: `backend/app/modules/auth/application/use_cases.py`

- [ ] **Step 1: Write the failing unit test first**

Add to `backend/tests/unit/auth/test_use_cases.py` (after the existing tests):

```python
@pytest.mark.asyncio
async def test_default_categories_use_pascal_case_icons(
    user_repo, category_repo
):
    from app.modules.auth.application.use_cases import _DEFAULT_CATEGORIES
    # All icon names must be PascalCase (start with uppercase, no hyphens)
    for _name, _type, icon, _color in _DEFAULT_CATEGORIES:
        assert icon[0].isupper(), f"Icon '{icon}' must start with uppercase"
        assert "-" not in icon, f"Icon '{icon}' must not contain hyphens"
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/unit/auth/test_use_cases.py::test_default_categories_use_pascal_case_icons -v
```

Expected: FAIL – icons like `"heart-pulse"` fail the assertion.

- [ ] **Step 3: Fix `_DEFAULT_CATEGORIES` icon names to PascalCase**

In `backend/app/modules/auth/application/use_cases.py`, replace `_DEFAULT_CATEGORIES`:

```python
_DEFAULT_CATEGORIES = [
    ("Еда",            "expense", "Utensils",         "#f97316"),
    ("Транспорт",      "expense", "Car",               "#3b82f6"),
    ("Жильё",          "expense", "Home",              "#8b5cf6"),
    ("Здоровье",       "expense", "HeartPulse",        "#ef4444"),
    ("Развлечения",    "expense", "Gamepad2",          "#ec4899"),
    ("Одежда",         "expense", "Shirt",             "#f59e0b"),
    ("Образование",    "expense", "GraduationCap",     "#06b6d4"),
    ("Прочие расходы", "expense", "CircleEllipsis",    "#6b7280"),
    ("Зарплата",       "income",  "Briefcase",         "#22c55e"),
    ("Фриланс",        "income",  "Laptop",            "#10b981"),
    ("Инвестиции",     "income",  "TrendingUp",        "#14b8a6"),
    ("Прочие доходы",  "income",  "PlusCircle",        "#6b7280"),
]
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/unit/auth/test_use_cases.py::test_default_categories_use_pascal_case_icons -v
```

Expected: PASS.

- [ ] **Step 5: Create Alembic migration to fix existing data**

Run:
```bash
cd /home/daniel/xnoll/backend
python -m alembic revision --autogenerate -m "fix_category_icon_names"
```

Then edit the generated file to add the icon renames (replace the `upgrade` body):

```python
def upgrade() -> None:
    icon_map = {
        "utensils":         "Utensils",
        "car":              "Car",
        "home":             "Home",
        "heart-pulse":      "HeartPulse",
        "gamepad-2":        "Gamepad2",
        "shirt":            "Shirt",
        "graduation-cap":   "GraduationCap",
        "circle-ellipsis":  "CircleEllipsis",
        "briefcase":        "Briefcase",
        "laptop":           "Laptop",
        "trending-up":      "TrendingUp",
        "plus-circle":      "PlusCircle",
    }
    for old, new in icon_map.items():
        op.execute(f"UPDATE categories SET icon = '{new}' WHERE icon = '{old}'")


def downgrade() -> None:
    icon_map = {
        "Utensils":        "utensils",
        "Car":             "car",
        "Home":            "home",
        "HeartPulse":      "heart-pulse",
        "Gamepad2":        "gamepad-2",
        "Shirt":           "shirt",
        "GraduationCap":   "graduation-cap",
        "CircleEllipsis":  "circle-ellipsis",
        "Briefcase":       "briefcase",
        "Laptop":          "laptop",
        "TrendingUp":      "trending-up",
        "PlusCircle":      "plus-circle",
    }
    for old, new in icon_map.items():
        op.execute(f"UPDATE categories SET icon = '{new}' WHERE icon = '{old}'")
```

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/xnoll
git add backend/app/modules/auth/application/use_cases.py backend/tests/unit/auth/test_use_cases.py backend/migrations/versions/
git commit -m "fix: default category icons use PascalCase lucide names + data migration"
```

---

## Task 2: Fix DynIcon to normalize kebab/lowercase names (Frontend)

**Why:** Existing DB data and any future inconsistencies should degrade gracefully. `DynIcon` normalizes any name to PascalCase before lookup so `"heart-pulse"` and `"HeartPulse"` both work.

**Files:**
- Modify: `frontend/src/shared/icons/lucide.tsx`

- [ ] **Step 1: Add PascalCase normalization to `DynIcon`**

Replace the entire `lucide.tsx`:

```tsx
import * as L from 'lucide-react'

export const CATEGORY_ICONS = [
  'ShoppingCart','Coffee','Car','Home','Heart','Music','BookOpen','Briefcase',
  'Plane','Gift','Utensils','Bus','Zap','Film','Smartphone','Globe','Dumbbell',
  'Shirt','Pill','GraduationCap','Wallet','TrendingUp','DollarSign','Package',
  'Star','Fuel','ShoppingBag','Pizza','Baby','PawPrint','Hammer','Scissors',
  'Camera','Bike','Train','Ship','Gamepad2','Flower2','Apple','Beef',
  'HeartPulse','CircleEllipsis','Laptop','PlusCircle',
] as const

export type CategoryIconName = typeof CATEGORY_ICONS[number]

function toPascalCase(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

interface DynIconProps { name: string; size?: number; color?: string }

export function DynIcon({ name, size = 20, color }: DynIconProps) {
  const key = toPascalCase(name)
  const Icon = (L as Record<string, unknown>)[key] as React.FC<{ size?: number; color?: string }> | undefined
  if (!Icon) return <L.Package size={size} color={color} />
  return <Icon size={size} color={color} />
}
```

- [ ] **Step 2: Run frontend checks**

```bash
cd /home/daniel/xnoll/frontend
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/shared/icons/lucide.tsx
git commit -m "fix: DynIcon normalizes kebab-case/lowercase icon names to PascalCase"
```

---

## Task 3: Allow system category deletion (Backend)

**Why:** User-owned categories with `is_system=True` are created on registration. The current guard `if cat.is_system: raise AuthorizationError` blocks all deletion. Since these categories are user-owned, only the user_id check is needed.

**Files:**
- Modify: `backend/app/modules/categories/application/use_cases.py`
- Modify: `backend/tests/unit/categories/test_use_cases.py`
- Modify: `backend/tests/integration/categories/test_categories_router.py`

- [ ] **Step 1: Write a test that verifies user-owned system category CAN be deleted**

In `backend/tests/unit/categories/test_use_cases.py`, add after `test_delete_system_category_raises`:

```python
@pytest.mark.asyncio
async def test_delete_user_owned_system_category_succeeds(repo, user_id):
    # system categories created on registration are user-owned with is_system=True
    user_sys_cat = Category(
        name="Зарплата", type="income", icon="Briefcase", color="#22c55e",
        user_id=user_id, is_system=True,
    )
    await repo.create(user_sys_cat)
    await DeleteCategoryUseCase(repo).execute(user_sys_cat.id, user_id)
    cat = await repo.find_by_id(user_sys_cat.id)
    assert cat.deleted_at is not None
```

- [ ] **Step 2: Run the new test, verify it fails**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/unit/categories/test_use_cases.py::test_delete_user_owned_system_category_succeeds -v
```

Expected: FAIL – `AuthorizationError` raised by `is_system` guard.

- [ ] **Step 3: Remove `is_system` guard from `DeleteCategoryUseCase`**

In `backend/app/modules/categories/application/use_cases.py`, in `DeleteCategoryUseCase.execute`, remove the block:

```python
        if cat.is_system:
            raise AuthorizationError("Cannot delete system category")
```

The method should now be:

```python
    async def execute(self, category_id: UUID, user_id: UUID) -> None:
        cat = await self._repo.find_by_id(category_id)
        if cat is None:
            raise NotFoundError("Category", str(category_id))
        if cat.user_id != user_id:
            raise AuthorizationError()
        if await self._repo.has_active_children(category_id):
            raise ConflictError("Category has subcategories -- delete them first")
        if await self._repo.count_transactions(category_id) > 0:
            raise ConflictError("Category is used by transactions")
        await self._repo.soft_delete(category_id, datetime.now(timezone.utc))
```

- [ ] **Step 4: Run all category unit tests**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/unit/categories/test_use_cases.py -v
```

Expected: ALL PASS. `test_delete_system_category_raises` still passes because the `system_cat` fixture has `user_id=None`, so `None != user_id` raises `AuthorizationError`.

- [ ] **Step 5: Add integration test for user-owned system category deletion**

In `backend/tests/integration/categories/test_categories_router.py`, add after `test_delete_system_category_returns_403`:

```python
async def test_delete_user_owned_system_category_returns_204(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    from uuid import UUID
    # look up a user-owned system category seeded during registration
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    system_cats = [c for c in resp.json() if c["is_system"]]
    assert len(system_cats) > 0, "registration must seed system categories"
    cat_id = system_cats[0]["id"]
    resp = await client.delete(f"{CATEGORIES_URL}/{cat_id}", headers=auth_headers)
    assert resp.status_code == 204
```

- [ ] **Step 6: Run integration tests for categories**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/integration/categories/ -v
```

Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
cd /home/daniel/xnoll
git add backend/app/modules/categories/application/use_cases.py \
        backend/tests/unit/categories/test_use_cases.py \
        backend/tests/integration/categories/test_categories_router.py
git commit -m "fix: allow deletion of user-owned system categories"
```

---

## Task 4: Show edit/delete buttons for system categories (Frontend)

**Files:**
- Modify: `frontend/src/features/categories/CategoryManageModal.tsx`

- [ ] **Step 1: Remove the `is_system` special case in the category list rendering**

In `CategoryManageModal.tsx`, find the block in the category list that conditionally shows either the "системная" badge OR the edit/delete buttons:

```tsx
                  {cat.is_system ? (
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>системная</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => {
                          setEditing(cat.id)
                          setEditName(cat.name)
                          setEditIcon(cat.icon)
                          setEditColor(cat.color)
                        }}
                        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.textSecondary }}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Удалить категорию «${cat.name}»?`)) {
                            deleteMutation.mutate(cat.id)
                          }
                        }}
                        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.expense }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
```

Replace with (always show buttons, optionally add a small "sys" badge):

```tsx
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {cat.is_system && (
                      <span style={{ fontSize: 10, color: COLORS.textMuted, marginRight: 2 }}>sys</span>
                    )}
                    <button
                      onClick={() => {
                        setEditing(cat.id)
                        setEditName(cat.name)
                        setEditIcon(cat.icon)
                        setEditColor(cat.color)
                      }}
                      style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.textSecondary }}
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Удалить категорию «${cat.name}»?`)) {
                          deleteMutation.mutate(cat.id)
                        }
                      }}
                      style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.expense }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
```

- [ ] **Step 2: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/features/categories/CategoryManageModal.tsx
git commit -m "feat: allow edit/delete of system categories in category manager"
```

---

## Task 5: Add GET /api/v1/deposits/{deposit_id} endpoint (Backend)

**Why:** `DepositDetailModal` calls `depositsApi.get(id)` which hits `GET /api/v1/deposits/{id}`. This route doesn't exist, causing 405 Method Not Allowed.

**Files:**
- Modify: `backend/app/modules/deposits/application/use_cases.py`
- Modify: `backend/app/modules/deposits/presentation/router.py`
- Modify: `backend/tests/unit/deposits/test_use_cases.py`
- Modify: `backend/tests/integration/deposits/test_deposits_router.py`

- [ ] **Step 1: Write a failing unit test for `GetDepositUseCase`**

In `backend/tests/unit/deposits/test_use_cases.py`, add:

```python
@pytest.mark.asyncio
async def test_get_deposit_by_id(repo, user_id):
    from app.modules.deposits.application.use_cases import GetDepositUseCase
    from app.modules.deposits.application.dtos import GetDepositDTO
    deposit = await create_deposit(repo, user_id)
    result = await GetDepositUseCase(repo).execute(GetDepositDTO(deposit_id=deposit.id, user_id=user_id))
    assert result.id == deposit.id
    assert result.name == deposit.name


@pytest.mark.asyncio
async def test_get_deposit_not_found_raises(repo, user_id):
    from uuid import uuid4
    from app.modules.deposits.application.use_cases import GetDepositUseCase
    from app.modules.deposits.application.dtos import GetDepositDTO
    from app.shared.exceptions import NotFoundError
    with pytest.raises(NotFoundError):
        await GetDepositUseCase(repo).execute(GetDepositDTO(deposit_id=uuid4(), user_id=user_id))


@pytest.mark.asyncio
async def test_get_deposit_wrong_user_raises(repo, user_id):
    from uuid import uuid4
    from app.modules.deposits.application.use_cases import GetDepositUseCase
    from app.modules.deposits.application.dtos import GetDepositDTO
    from app.shared.exceptions import NotFoundError
    deposit = await create_deposit(repo, user_id)
    with pytest.raises(NotFoundError):
        await GetDepositUseCase(repo).execute(GetDepositDTO(deposit_id=deposit.id, user_id=uuid4()))
```

(These assume a `create_deposit` helper already exists in the test file. Check `backend/tests/unit/deposits/test_use_cases.py` for the existing helper or add one if missing.)

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/unit/deposits/test_use_cases.py::test_get_deposit_by_id -v
```

Expected: FAIL – `GetDepositUseCase` doesn't exist yet.

- [ ] **Step 3: Add `GetDepositDTO` to dtos**

In `backend/app/modules/deposits/application/dtos.py`, add at the end:

```python
@dataclass
class GetDepositDTO:
    deposit_id: UUID
    user_id: UUID
```

- [ ] **Step 4: Add `GetDepositUseCase` to use_cases**

In `backend/app/modules/deposits/application/use_cases.py`, add after `ListDepositsUseCase`:

```python
class GetDepositUseCase:
    def __init__(self, repo: IDepositRepository) -> None:
        self._repo = repo

    async def execute(self, dto: GetDepositDTO) -> DepositDTO:
        from app.modules.deposits.application.dtos import GetDepositDTO as _GetDepositDTO
        deposit = await self._repo.find_by_id(dto.deposit_id)
        if deposit is None or deposit.user_id != dto.user_id:
            raise NotFoundError("Deposit", str(dto.deposit_id))
        return _to_dto(deposit)
```

Also add the import at the top of `use_cases.py`:

```python
from app.modules.deposits.application.dtos import (
    CloseDepositDTO,
    CreateDepositDTO,
    DepositDTO,
    GetDepositDTO,
    UpdateDepositDTO,
)
```

- [ ] **Step 5: Run unit tests to verify they pass**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/unit/deposits/test_use_cases.py -v
```

Expected: ALL PASS.

- [ ] **Step 6: Add GET route to the deposits router**

In `backend/app/modules/deposits/presentation/router.py`, add the import and route. First, update imports:

```python
from app.modules.deposits.application.dtos import (
    CloseDepositDTO,
    CreateDepositDTO,
    GetDepositDTO,
    UpdateDepositDTO,
)
from app.modules.deposits.application.use_cases import (
    CloseDepositUseCase,
    CreateDepositUseCase,
    GetDepositUseCase,
    ListDepositsUseCase,
    UpdateDepositUseCase,
)
```

Then add the route after `list_deposits`:

```python
@router.get("/{deposit_id}", response_model=DepositResponse)
async def get_deposit(
    deposit_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    repo: IDepositRepository = Depends(get_deposit_repository),
) -> DepositResponse:
    try:
        dto = await GetDepositUseCase(repo).execute(
            GetDepositDTO(deposit_id=deposit_id, user_id=user_id)
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _map_dto(dto)
```

- [ ] **Step 7: Write integration tests for GET /{deposit_id}**

In `backend/tests/integration/deposits/test_deposits_router.py`, add:

```python
async def test_get_deposit_by_id_returns_200(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(DEPOSITS_URL, headers=auth_headers, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]
    resp = await client.get(f"{DEPOSITS_URL}/{deposit_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == deposit_id
    assert resp.json()["name"] == VALID_PAYLOAD["name"]


async def test_get_deposit_not_found_returns_404(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get(f"{DEPOSITS_URL}/{uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_get_deposit_wrong_user_returns_404(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json={
        "email": "u_a@example.com", "password": "pass1234",
        "full_name": "A", "primary_currency": "RUB",
    })
    resp_a = await client.post("/api/v1/auth/login", json={"email": "u_a@example.com", "password": "pass1234"})
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}

    await client.post("/api/v1/auth/register", json={
        "email": "u_b@example.com", "password": "pass1234",
        "full_name": "B", "primary_currency": "RUB",
    })
    resp_b = await client.post("/api/v1/auth/login", json={"email": "u_b@example.com", "password": "pass1234"})
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}

    create_resp = await client.post(DEPOSITS_URL, headers=headers_a, json=VALID_PAYLOAD)
    deposit_id = create_resp.json()["id"]

    resp = await client.get(f"{DEPOSITS_URL}/{deposit_id}", headers=headers_b)
    assert resp.status_code == 404
```

- [ ] **Step 8: Run all deposit tests**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/integration/deposits/ tests/unit/deposits/ -v
```

Expected: ALL PASS.

- [ ] **Step 9: Commit**

```bash
cd /home/daniel/xnoll
git add backend/app/modules/deposits/application/dtos.py \
        backend/app/modules/deposits/application/use_cases.py \
        backend/app/modules/deposits/presentation/router.py \
        backend/tests/unit/deposits/test_use_cases.py \
        backend/tests/integration/deposits/test_deposits_router.py
git commit -m "feat: add GET /api/v1/deposits/{id} endpoint"
```

---

## Task 6: Fix DepositDetailModal error handling (Frontend)

**Why:** `DepositDetailModal` shows "Загрузка..." forever when the query errors. After the backend endpoint is added (Task 5), it will load. But we also need a proper error state.

**Files:**
- Modify: `frontend/src/features/accounts/DepositDetailModal.tsx`

- [ ] **Step 1: Add error handling to DepositDetailModal**

Replace the `useQuery` call and loading state:

```tsx
  const { data, isError, isLoading } = useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () => depositsApi.get(depositId!),
    enabled: open && !!depositId,
    retry: 1,
  })
```

And replace the bottom section (currently `{!data && <div style={{ color: COLORS.textSecondary }}>Загрузка...</div>}`):

```tsx
        {isLoading && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка...</div>
        )}
        {isError && (
          <div style={{ color: COLORS.expense, fontSize: 13 }}>Не удалось загрузить детали вклада</div>
        )}
```

- [ ] **Step 2: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/features/accounts/DepositDetailModal.tsx
git commit -m "fix: deposit detail modal shows error state instead of infinite loading"
```

---

## Task 7: Fix dark theme background color (Frontend)

**Why:** `--color-bg: #04060d` is near-pure black, too dark for comfortable reading. `#12151f` is a dark blue-gray that avoids eye strain.

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update dark mode CSS variables**

In `frontend/src/index.css`, find the `[data-theme="dark"]` block:

```css
:root[data-theme="dark"] {
  --color-bg: #04060d;
  --color-surface: #0a0e1a;
  --color-surface2: #131826;
```

Change to:

```css
:root[data-theme="dark"] {
  --color-bg: #12151f;
  --color-surface: #1a1e2e;
  --color-surface2: #21263a;
```

Also update the base `html, body, #root` background (line ~18):

```css
  background: #12151f;
```

- [ ] **Step 2: Update bgBase in App.tsx**

In `frontend/src/App.tsx`, find:

```typescript
      const bgBase = themeMode === 'dark' ? '#04060d' : '#f4f6fb'
```

Change to:

```typescript
      const bgBase = themeMode === 'dark' ? '#12151f' : '#f4f6fb'
```

- [ ] **Step 3: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/index.css frontend/src/App.tsx
git commit -m "fix: dark theme uses dark gray background instead of near-black"
```

---

## Task 8: Fix light theme account slider (Frontend)

**Problems:**
1. Account card balance text: `color: '#fff'` hardcoded — white text on a light surface is unreadable.
2. Account cards: heavy `boxShadow: '0 4px 20px rgba(0,0,0,0.35)'` creates a "pit" effect in light mode.

**Files:**
- Modify: `frontend/src/features/home/HomeScreen.tsx`

- [ ] **Step 1: Fix balance text color on account cards**

In `HomeScreen.tsx`, find the balance text on account cards (line ~319):

```tsx
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>
```

Change to:

```tsx
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -1, marginBottom: 12 }}>
```

- [ ] **Step 2: Fix the card shadow to be theme-aware**

Find the account card's `boxShadow`:

```tsx
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
```

Change to:

```tsx
                  boxShadow: '0 2px 12px var(--color-border-strong)',
```

This uses the CSS variable: dark mode gives `rgba(255,255,255,0.10)` (subtle highlight), light mode gives `rgba(0,0,0,0.14)` (gentle shadow).

- [ ] **Step 3: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/features/home/HomeScreen.tsx
git commit -m "fix: account card text color and shadow are theme-aware for light mode"
```

---

## Task 9: Analytics view selector (Frontend)

**Spec:** Hide simultaneous display of all stats. Add selector for: Overview (income/expense + timeline), By Categories (pie charts), By Accounts (account breakdown table).

**Files:**
- Modify: `frontend/src/features/analytics/hooks/useStats.ts`
- Modify: `frontend/src/features/analytics/AnalyticsScreen.tsx`

- [ ] **Step 1: Extend `useStats` to also fetch account stats**

Replace `frontend/src/features/analytics/hooks/useStats.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../../../api/endpoints/stats'
import type { StatPeriod, CustomRange } from '../../../api/types'

type PeriodOrRange = { period: StatPeriod } | CustomRange

export function useStats(p: PeriodOrRange) {
  const key = 'period' in p ? p.period : `${p.date_from}/${p.date_to}`
  const categories = useQuery({ queryKey: ['stats', 'categories', key], queryFn: () => statsApi.categories(p) })
  const timeline   = useQuery({ queryKey: ['stats', 'timeline',    key], queryFn: () => statsApi.timeline(p) })
  const accounts   = useQuery({ queryKey: ['stats', 'accounts',    key], queryFn: () => statsApi.accounts(p) })
  return { categories, timeline, accounts }
}
```

- [ ] **Step 2: Rewrite AnalyticsScreen with view selector**

Replace `frontend/src/features/analytics/AnalyticsScreen.tsx`:

```tsx
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
type ViewMode = 'overview' | 'categories' | 'accounts'

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'overview',   label: 'Обзор' },
  { value: 'categories', label: 'Категории' },
  { value: 'accounts',   label: 'Счета' },
]

export function AnalyticsScreen() {
  const [tab, setTab] = useState<ActiveTab>('this_month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [view, setView]         = useState<ViewMode>('overview')

  const statsParam: { period: StatPeriod } | CustomRange =
    tab === 'custom' && dateFrom && dateTo
      ? { date_from: dateFrom, date_to: dateTo }
      : { period: (tab === 'custom' ? 'this_month' : tab) as StatPeriod }

  const { categories, timeline, accounts } = useStats(statsParam)

  const expenseData = categories.data?.expense_by_category.map(c => ({
    name: c.category_name, value: Math.abs(parseFloat(c.amount)),
  })) ?? []

  const incomeData = categories.data?.income_by_category.map(c => ({
    name: c.category_name, value: parseFloat(c.amount),
  })) ?? []

  const timelineData = timeline.data?.periods.map(p => ({
    name: p.period,
    income: parseFloat(p.income),
    expense: Math.abs(parseFloat(p.expense)),
  })) ?? []

  const accountData = accounts.data?.accounts.map(a => ({
    name: a.account_name,
    income: parseFloat(a.income),
    expense: Math.abs(parseFloat(a.expense)),
    net: parseFloat(a.net),
  })) ?? []

  const isLoading = categories.isLoading || timeline.isLoading || accounts.isLoading
  const isError   = categories.isError   || timeline.isError   || accounts.isError

  return (
    <div style={{ padding: '54px 20px 120px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 20 }}>Аналитика</div>

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: tab === 'custom' ? 12 : 16, flexWrap: 'wrap' }}>
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

      {/* Custom date range */}
      {tab === 'custom' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 14, fontSize: 13,
              background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 14, fontSize: 13,
              background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }} />
        </div>
      )}

      {/* View mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {VIEW_MODES.map(m => (
          <button key={m.value} onClick={() => setView(m.value)} style={{
            flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: view === m.value ? 'var(--accent-tint)' : COLORS.surface2,
            border: `1.5px solid ${view === m.value ? 'var(--accent)' : COLORS.border}`,
            color: view === m.value ? 'var(--accent)' : COLORS.textSecondary,
            cursor: 'pointer',
          }}>{m.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <>
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
          {timelineData.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Доходы / Расходы</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={timelineData} barGap={2}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => typeof v === 'number' ? `${formatAmount(v)} ₽` : String(v)}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="income" fill={COLORS.income} radius={[6,6,0,0]} maxBarSize={24} name="Доход" />
                  <Bar dataKey="expense" fill={COLORS.expense} radius={[6,6,0,0]} maxBarSize={24} name="Расход" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── CATEGORIES ── */}
      {view === 'categories' && (
        <>
          {expenseData.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Расходы по категориям</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <PieChart width={140} height={140}>
                  <Pie data={expenseData} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {expenseData.map((entry, i) => <Cell key={`exp-${entry.name}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
          {incomeData.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>Доходы по категориям</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <PieChart width={140} height={140}>
                  <Pie data={incomeData} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {incomeData.map((entry, i) => <Cell key={`inc-${entry.name}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {incomeData.slice(0, 5).map((item, i) => (
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
          {expenseData.length === 0 && incomeData.length === 0 && !isLoading && (
            <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Нет данных</div>
          )}
        </>
      )}

      {/* ── ACCOUNTS ── */}
      {view === 'accounts' && (
        <>
          {accountData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accountData.map(a => (
                <div key={a.name} style={{ padding: '14px 16px', borderRadius: 18, background: COLORS.surface2, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 10 }}>{a.name}</div>
                  <div style={{ display: 'flex', gap: 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 }}>Доходы</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.income }}>+{formatAmount(a.income)} ₽</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 }}>Расходы</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.expense }}>−{formatAmount(a.expense)} ₽</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 }}>Итог</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: a.net >= 0 ? COLORS.income : COLORS.expense }}>
                        {a.net >= 0 ? '+' : '−'}{formatAmount(Math.abs(a.net))} ₽
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Нет данных</div>
          )}
        </>
      )}

      {isLoading && <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Загрузка статистики...</div>}
      {isError   && <div style={{ color: COLORS.expense,       fontSize: 13 }}>Ошибка загрузки</div>}
    </div>
  )
}
```

- [ ] **Step 3: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/features/analytics/AnalyticsScreen.tsx \
        frontend/src/features/analytics/hooks/useStats.ts
git commit -m "feat: analytics view selector — overview, categories, accounts"
```

---

## Task 10: Show transfers in transaction history with arrow format (Frontend)

**Spec:** Display transfers in the history list alongside transactions. Format for each row: `[Source] → [Dest]` direction indicator instead of the description/name.

**Files:**
- Modify: `frontend/src/features/home/hooks/useHomeData.ts`
- Modify: `frontend/src/features/home/HomeScreen.tsx`
- Modify: `frontend/src/features/transactions/AllTransactionsModal.tsx`

- [ ] **Step 1: Extend `useHomeData` to fetch transfers**

Replace `frontend/src/features/home/hooks/useHomeData.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../../../api/endpoints/transactions'
import { accountsApi } from '../../../api/endpoints/accounts'
import { categoriesApi } from '../../../api/endpoints/categories'
import { statsApi } from '../../../api/endpoints/stats'
import { transfersApi } from '../../../api/endpoints/transfers'

export function useHomeData() {
  const accounts    = useQuery({ queryKey: ['accounts'],    queryFn: accountsApi.list })
  const transactions = useQuery({ queryKey: ['transactions'], queryFn: () => transactionsApi.list({ limit: 20 }) })
  const transfers   = useQuery({ queryKey: ['transfers'],   queryFn: transfersApi.list })
  const categories  = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list })
  const monthStats  = useQuery({ queryKey: ['stats', 'categories', 'this_month'], queryFn: () => statsApi.categories('this_month') })

  const totalBalance = accounts.data?.reduce((sum, a) => {
    if (a.currency === 'RUB') return sum + parseFloat(a.balance)
    return sum
  }, 0) ?? 0

  return { accounts, transactions, transfers, categories, monthStats, totalBalance }
}
```

- [ ] **Step 2: Update `HomeScreen` to show transfers in recent operations**

In `frontend/src/features/home/HomeScreen.tsx`, the recent transactions section currently renders only `txList`. Update to merge transactions and transfers, sorted by date descending, and show the arrow format.

The changes are in the `HomeScreen` component. First, update the destructuring at the top:

```tsx
  const { accounts, transactions, transfers, categories, monthStats, totalBalance } = useHomeData()
```

Then replace the `accountList`, `txList`, `categoryList` lines and add a helper:

```tsx
  const accountList  = accounts.data ?? []
  const txList       = transactions.data ?? []
  const transferList = transfers.data ?? []
  const categoryList = categories.data ?? []

  // Build account name lookup
  const accountNameById = Object.fromEntries(accountList.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))

  type UnifiedEntry =
    | { kind: 'tx';       date: string; data: typeof txList[0] }
    | { kind: 'transfer'; date: string; data: typeof transferList[0] }

  const recentEntries: UnifiedEntry[] = [
    ...txList.map(t => ({ kind: 'tx' as const,       date: t.date, data: t })),
    ...transferList.map(t => ({ kind: 'transfer' as const, date: t.date, data: t })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
```

Then replace the transactions render loop (the section after `{transactions.isLoading && ...}`):

```tsx
          {recentEntries.map((entry) => {
            if (entry.kind === 'tx') {
              const tx = entry.data
              const iconName = getCategoryIcon(tx.category_id)
              const catColor = getCategoryColor(tx.category_id)
              const catName  = flatten(categoryList).find(c => c.id === tx.category_id)?.name ?? 'Категория'
              const accName  = accountNameById[tx.account_id] ?? 'Счёт'
              const isIncome = tx.type === 'income'
              const amtColor = isIncome ? COLORS.income : COLORS.expense
              const amtPrefix = isIncome ? '+' : '−'
              const amt = Math.abs(parseFloat(tx.amount)).toLocaleString('ru-RU')
              const direction = isIncome ? `${catName} → ${accName}` : `${accName} → ${catName}`

              return (
                <div key={`tx-${tx.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <DynIcon name={iconName} size={18} color={catColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {direction}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                      {formatTxDate(tx.date, tx.created_at)}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: amtColor, flexShrink: 0 }}>
                    {balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
                  </div>
                </div>
              )
            }

            // Transfer entry
            const tr = entry.data
            const srcName = tr.source_id ? (accountNameById[tr.source_id] ?? tr.source_label ?? 'Счёт') : (tr.source_label ?? 'Внешний')
            const dstName = tr.dest_id   ? (accountNameById[tr.dest_id]   ?? tr.dest_label   ?? 'Счёт') : (tr.dest_label   ?? 'Внешний')
            const amt = Math.abs(parseFloat(tr.amount)).toLocaleString('ru-RU')

            return (
              <div key={`tr-${tr.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--accent-tint)', border: '1px solid var(--accent)44', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <DynIcon name="ArrowRightLeft" size={18} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {srcName} → {dstName}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                    {formatTxDate(tr.date, tr.created_at)}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textSecondary, flexShrink: 0 }}>
                  {balanceVisible ? `${amt} ₽` : '••••••'}
                </div>
              </div>
            )
          })}
          {!transactions.isLoading && !transfers.isLoading && recentEntries.length === 0 && (
            <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              Операций пока нет
            </div>
          )}
```

Also add a helper `flatten` function near `getCategoryIcon`:

```tsx
  function flatten(cats: typeof categoryList): typeof categoryList {
    return cats.flatMap((c) => [c, ...flatten(c.children ?? [])])
  }
```

(The existing `getCategoryIcon` and `getCategoryColor` can stay but inline `flatten` there or use the shared one. Whichever is cleaner — just ensure no duplicate.)

- [ ] **Step 3: Update `AllTransactionsModal` similarly**

Replace `frontend/src/features/transactions/AllTransactionsModal.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { transactionsApi } from '../../api/endpoints/transactions'
import { transfersApi } from '../../api/endpoints/transfers'
import { accountsApi } from '../../api/endpoints/accounts'
import { DynIcon } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'
import { formatDate } from '../../shared/lib/format'
import { categoriesApi } from '../../api/endpoints/categories'
import type { CategoryResponse } from '../../api/types'

function flatten(cats: CategoryResponse[]): CategoryResponse[] {
  return cats.flatMap(c => [c, ...flatten(c.children ?? [])])
}

function formatTxDate(isoDate: string, isoCreatedAt: string): string {
  const today = new Date()
  const txDate = new Date(isoDate)
  const time = isoCreatedAt.slice(11, 16)
  const isToday =
    txDate.getFullYear() === today.getFullYear() &&
    txDate.getMonth() === today.getMonth() &&
    txDate.getDate() === today.getDate()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday =
    txDate.getFullYear() === yesterday.getFullYear() &&
    txDate.getMonth() === yesterday.getMonth() &&
    txDate.getDate() === yesterday.getDate()
  const label = isToday ? 'Сегодня' : isYesterday ? 'Вчера' : formatDate(isoDate)
  return `${label}, ${time}`
}

export function AllTransactionsModal() {
  const { modal, closeModal, balanceVisible } = useUIStore()
  const open = modal.type === 'all-transactions'

  const { data: txList = [],       isLoading: txLoading }   = useQuery({ queryKey: ['transactions'], queryFn: transactionsApi.list, enabled: open })
  const { data: transferList = [], isLoading: trLoading }   = useQuery({ queryKey: ['transfers'],   queryFn: transfersApi.list,   enabled: open })
  const { data: categories = [] }                           = useQuery({ queryKey: ['categories'],  queryFn: categoriesApi.list,  enabled: open })
  const { data: accounts = [] }                             = useQuery({ queryKey: ['accounts'],    queryFn: accountsApi.list,    enabled: open })

  const allCats = flatten(categories)
  const accountNameById = Object.fromEntries(accounts.map(a => [a.id, a.bank_name ? `${a.bank_name} · ${a.name}` : a.name]))

  type Entry =
    | { kind: 'tx';       date: string; data: typeof txList[0] }
    | { kind: 'transfer'; date: string; data: typeof transferList[0] }

  const entries: Entry[] = [
    ...txList.map(t => ({ kind: 'tx' as const,       date: t.date, data: t })),
    ...transferList.map(t => ({ kind: 'transfer' as const, date: t.date, data: t })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const isLoading = txLoading || trLoading

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>
          Все операции
        </div>

        {isLoading && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: '12px 0' }}>Загрузка...</div>
        )}

        {entries.map(entry => {
          if (entry.kind === 'tx') {
            const tx = entry.data
            const cat = allCats.find(c => c.id === tx.category_id)
            const iconName = cat?.icon ?? 'Package'
            const catColor = cat?.color ?? '#6366f1'
            const catName  = cat?.name ?? 'Категория'
            const accName  = accountNameById[tx.account_id] ?? 'Счёт'
            const isIncome = tx.type === 'income'
            const amtColor  = isIncome ? COLORS.income : COLORS.expense
            const amtPrefix = isIncome ? '+' : '−'
            const amt = Math.abs(parseFloat(tx.amount)).toLocaleString('ru-RU')
            const direction = isIncome ? `${catName} → ${accName}` : `${accName} → ${catName}`

            return (
              <div key={`tx-${tx.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <DynIcon name={iconName} size={18} color={catColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {direction}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                    {formatTxDate(tx.date, tx.created_at)}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: amtColor, flexShrink: 0 }}>
                  {balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
                </div>
              </div>
            )
          }

          const tr = entry.data
          const srcName = tr.source_id ? (accountNameById[tr.source_id] ?? tr.source_label ?? 'Счёт') : (tr.source_label ?? 'Внешний')
          const dstName = tr.dest_id   ? (accountNameById[tr.dest_id]   ?? tr.dest_label   ?? 'Счёт') : (tr.dest_label   ?? 'Внешний')
          const amt = Math.abs(parseFloat(tr.amount)).toLocaleString('ru-RU')

          return (
            <div key={`tr-${tr.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--accent-tint)', border: '1px solid var(--accent)44', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <DynIcon name="ArrowRightLeft" size={18} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {srcName} → {dstName}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {formatTxDate(tr.date, tr.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textSecondary, flexShrink: 0 }}>
                {balanceVisible ? `${amt} ₽` : '••••••'}
              </div>
            </div>
          )
        })}

        {!isLoading && entries.length === 0 && (
          <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Операций пока нет
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/features/home/hooks/useHomeData.ts \
        frontend/src/features/home/HomeScreen.tsx \
        frontend/src/features/transactions/AllTransactionsModal.tsx
git commit -m "feat: show transfers in transaction history with source→dest arrow format"
```

---

## Task 11: Add initial balance field to AccountEditModal (Frontend)

**Spec:** Let users edit the initial balance when editing an account. `UpdateAccountDTO.balance` and the backend endpoint already support it.

**Files:**
- Modify: `frontend/src/features/accounts/AccountEditModal.tsx`

- [ ] **Step 1: Add balance state and input field**

In `AccountEditModal.tsx`, add `balance` to the state:

```tsx
  const [balance, setBalance] = useState('')
```

Update the `useEffect` that populates fields when `account` loads:

```tsx
  useEffect(() => {
    if (account) {
      setBankName(account.bank_name)
      setName(account.name)
      setBalance(account.balance)
    }
  }, [account])
```

Update the `saveMutation`:

```tsx
  const saveMutation = useMutation({
    mutationFn: () => accountsApi.update(accountId, {
      bank_name: bankName,
      name,
      balance: balance || undefined,
    }),
```

Add the balance input field in the form JSX, after the "Название" field and before the save button:

```tsx
        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>Начальный остаток</div>
          <input
            type="number"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
```

Update `canSave` to still pass even if balance is empty (balance is optional):

```tsx
  const canSave = bankName.trim() && name.trim()
```

(No change needed — `balance` is optional.)

- [ ] **Step 2: Run build**

```bash
cd /home/daniel/xnoll/frontend && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/xnoll
git add frontend/src/features/accounts/AccountEditModal.tsx
git commit -m "feat: account edit modal includes initial balance field"
```

---

## Task 12: Run full test suite and verify (Backend)

- [ ] **Step 1: Run all backend tests**

```bash
cd /home/daniel/xnoll/backend
python -m pytest tests/ -v 2>&1 | tail -40
```

Expected: all tests pass. Fix any failures before proceeding.

- [ ] **Step 2: Run frontend type check**

```bash
cd /home/daniel/xnoll/frontend
npm run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Final commit if needed**

If any fixup commits are needed, create them. Otherwise: done.

---

## Self-Review Checklist

**Spec coverage:**
- [x] Удаление системных категорий (бек + фронт) → Tasks 3, 4
- [x] API детали вклада 405 → Task 5
- [x] Тёмная тема фон → Task 7
- [x] Светлая тема слайдер (фон + белый шрифт) → Task 8
- [x] Lucide иконки категорий → Tasks 1, 2
- [x] Lucide иконки в операциях (через DynIcon нормализацию) → Task 2
- [x] Аналитика: селектор вместо всех панелей сразу → Task 9
- [x] Аналитика: статистика по счетам → Task 9
- [x] Последние операции: переводы в истории → Task 10
- [x] Последние операции: стрелочный формат направления → Task 10
- [x] Детали вклада: бесконечная загрузка → Task 6
- [x] Счета: изменение начального остатка → Task 11

**Type consistency:**
- `GetDepositDTO` defined in Task 5 Step 3 and used in Step 4 and Step 6 ✓
- `UnifiedEntry` type defined and used consistently in Tasks 10 across both components ✓
- `accountNameById` pattern is identical in both `HomeScreen` and `AllTransactionsModal` ✓
- `DynIcon` `toPascalCase` defined in Task 2 and used for all icon lookups ✓
