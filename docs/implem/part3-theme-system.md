# Part 3: Theme System + Ambient Background Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix theme endpoint URL mismatch (backend serves at wrong path), implement the ambient background glow effect, and verify the rest of the theme system per spec §1.1 and §6.

**Architecture:**
- **Backend:** Theme routes currently live at `/api/v1/auth/users/me/theme` (wrong). The spec requires `/api/v1/users/me/theme`. Fix: create a `users_router` with prefix `/api/v1/users` in the auth presentation layer and register it in `main.py`. The auth-prefixed routes can stay as internal aliases but frontend must call the correct URLs.
- **Frontend (glow):** `THEMES` tokens need two new fields per theme (`bgGlowDark`, `bgGlowLight`). The `[theme]` `useEffect` in `App.tsx` must also depend on `themeMode` and write `--bg-gradient` to `document.documentElement`. The root div must use `background: 'var(--bg-gradient)'`.
- Everything else (CSS vars, store, ProfileScreen toggle, Alembic migration) is already in place.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend); React 18/TypeScript/Zustand (frontend)

---

## File Map

| Action   | File                                                              |
|----------|-------------------------------------------------------------------|
| **Create** | `backend/app/modules/auth/presentation/users_router.py`        |
| **Modify** | `backend/app/main.py`                                          |
| **Modify** | `frontend/src/shared/tokens.ts`                                |
| **Modify** | `frontend/src/App.tsx`                                         |
| Verify   | `backend/app/modules/auth/infrastructure/models.py`             |
| Verify   | `backend/migrations/versions/65cb8ce70fe0_add_theme_fields_to_users.py` |
| Verify   | `backend/app/modules/auth/presentation/router.py`               |
| Verify   | `frontend/src/index.css`                                        |
| Verify   | `frontend/src/store/ui.ts`                                      |
| Verify   | `frontend/src/api/endpoints/auth.ts`                            |
| Verify   | `frontend/src/features/profile/ProfileScreen.tsx`               |

---

## Task 1: Fix Theme Endpoint URL — Create `/api/v1/users` Router

**Spec §6.2** — Endpoints must be at `GET /api/v1/users/me/theme` and `PATCH /api/v1/users/me/theme`.  
**Bug:** The auth router has prefix `/api/v1/auth`, so theme routes are currently served at `/api/v1/auth/users/me/theme`. The frontend correctly calls `/api/v1/users/me/theme` — so the backend needs fixing.

**Files:**
- Create: `backend/app/modules/auth/presentation/users_router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create a conftest for the theme tests**

Create `backend/tests/integration/auth/conftest_theme.py` — actually, place the conftest directly alongside the test. First check if a conftest exists:
```bash
ls backend/tests/integration/auth/
```
There's no existing conftest in this directory (auth tests use the root conftest's `client` fixture). Create `backend/tests/integration/auth/conftest.py`:
```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.dependencies import get_user_repository
from app.modules.auth.infrastructure.fake_repository import FakeUserRepository


@pytest.fixture
async def client():
    fresh_repo = FakeUserRepository()
    app.dependency_overrides[get_user_repository] = lambda: fresh_repo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "theme@example.com", "password": "pass1234",
        "full_name": "Theme User", "primary_currency": "RUB",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "theme@example.com", "password": "pass1234",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/integration/auth/test_theme_router.py`:
```python
from httpx import AsyncClient


async def test_get_theme_at_correct_url(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/users/me/theme", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "theme_mode" in data
    assert "theme_color" in data


async def test_patch_theme_mode(client: AsyncClient, auth_headers: dict):
    resp = await client.patch("/api/v1/users/me/theme", json={"theme_mode": "light"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["theme_mode"] == "light"


async def test_patch_theme_color(client: AsyncClient, auth_headers: dict):
    resp = await client.patch("/api/v1/users/me/theme", json={"theme_color": "teal"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["theme_color"] == "teal"
```

- [ ] **Step 3: Run the failing tests**

```bash
cd backend && python -m pytest tests/integration/auth/test_theme_router.py -v 2>&1 | tail -20
```
Expected: FAIL (404 or similar) — confirms the URL is wrong.

- [ ] **Step 4: Create `users_router.py`**

Create `backend/app/modules/auth/presentation/users_router.py`:
```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user_id, get_user_repository
from app.modules.auth.domain.interfaces import IUserRepository
from app.modules.auth.presentation.schemas import ThemePatchRequest, ThemeResponse

users_router = APIRouter(prefix="/api/v1/users", tags=["users"])


@users_router.get("/me/theme", response_model=ThemeResponse)
async def get_theme(
    user_id: UUID = Depends(get_current_user_id),
    repo: IUserRepository = Depends(get_user_repository),
) -> ThemeResponse:
    user = await repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return ThemeResponse(theme_mode=user.theme_mode, theme_color=user.theme_color)


@users_router.patch("/me/theme", response_model=ThemeResponse)
async def patch_theme(
    body: ThemePatchRequest,
    user_id: UUID = Depends(get_current_user_id),
    repo: IUserRepository = Depends(get_user_repository),
) -> ThemeResponse:
    user = await repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.theme_mode is not None:
        user.theme_mode = body.theme_mode
    if body.theme_color is not None:
        user.theme_color = body.theme_color
    updated = await repo.update(user)
    return ThemeResponse(theme_mode=updated.theme_mode, theme_color=updated.theme_color)
```

- [ ] **Step 5: Register `users_router` in `main.py`**

Open `backend/app/main.py`. After the existing auth_router import, add:
```python
from app.modules.auth.presentation.users_router import users_router
```
After `app.include_router(auth_router)`, add:
```python
app.include_router(users_router)
```

The full relevant section:
```python
from app.modules.auth.presentation.router import router as auth_router
from app.modules.auth.presentation.users_router import users_router
# ...
app.include_router(auth_router)
app.include_router(users_router)
```

- [ ] **Step 6: Run the tests — they must pass now**

```bash
cd backend && python -m pytest tests/integration/auth/test_theme_router.py -v 2>&1 | tail -20
```
Expected: all three tests PASS.

- [ ] **Step 7: Run full backend test suite**

```bash
cd backend && python -m pytest --tb=short 2>&1 | tail -20
```
Expected: no regressions.

- [ ] **Step 8: Commit**
```bash
git add backend/app/modules/auth/presentation/users_router.py backend/app/main.py backend/tests/integration/auth/test_theme_router.py
git commit -m "fix: theme endpoints at /api/v1/users/me/theme (correct URL per spec)"
```

---

## Task 2: Implement Ambient Background Glow

**Spec §1.1** — The app background must be a two-layer radial gradient: a glow emanating from the top-center of the viewport over a solid base color. Glow color and opacity are theme-specific. Recomputed when either `theme` or `themeMode` changes.

**Files:**
- Modify: `frontend/src/shared/tokens.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add `bgGlowDark` / `bgGlowLight` to the `Theme` interface in `tokens.ts`**

Open `frontend/src/shared/tokens.ts`. Find the `Theme` interface and add two fields:
```ts
export interface Theme {
  name: string
  accent: string
  accent2: string
  accent3: string
  glow: string
  shadow: string
  swatches: [string, string, string]
  bgGlowDark: string   // rgba color at 0% stop of background radial gradient (dark mode)
  bgGlowLight: string  // rgba color at 0% stop of background radial gradient (light mode)
}
```

- [ ] **Step 2: Add `bgGlowDark` / `bgGlowLight` to each theme object in `THEMES`**

Per-theme opacities from spec §1.1:
| theme  | dark | light |
|--------|------|-------|
| violet | 0.30 | 0.06  |
| teal   | 0.26 | 0.05  |
| amber  | 0.22 | 0.04  |
| rose   | 0.28 | 0.05  |

Replace the `THEMES` constant with:
```ts
export const THEMES: Record<ThemeName, Theme> = {
  violet: {
    name: 'Violet',
    swatches: ['#6366f1', '#8b5cf6', '#a855f7'],
    accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7',
    glow: 'rgba(99,102,241,0.20)', shadow: 'rgba(99,102,241,0.45)',
    bgGlowDark: 'rgba(99,102,241,0.30)', bgGlowLight: 'rgba(99,102,241,0.06)',
  },
  teal: {
    name: 'Teal',
    swatches: ['#0f766e', '#14b8a6', '#06b6d4'],
    accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4',
    glow: 'rgba(20,184,166,0.18)', shadow: 'rgba(20,184,166,0.45)',
    bgGlowDark: 'rgba(20,184,166,0.26)', bgGlowLight: 'rgba(20,184,166,0.05)',
  },
  amber: {
    name: 'Amber',
    swatches: ['#f59e0b', '#f97316', '#fbbf24'],
    accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24',
    glow: 'rgba(245,158,11,0.18)', shadow: 'rgba(245,158,11,0.45)',
    bgGlowDark: 'rgba(245,158,11,0.22)', bgGlowLight: 'rgba(245,158,11,0.04)',
  },
  rose: {
    name: 'Rose',
    swatches: ['#e11d48', '#ec4899', '#f43f5e'],
    accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e',
    glow: 'rgba(236,72,153,0.18)', shadow: 'rgba(236,72,153,0.45)',
    bgGlowDark: 'rgba(236,72,153,0.28)', bgGlowLight: 'rgba(236,72,153,0.05)',
  },
}
```

- [ ] **Step 3: TypeScript check — tokens only**
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "tokens" | head -10
```
Expected: no errors about the `Theme` interface or `THEMES`.

- [ ] **Step 4: Update the `[theme]` effect in `App.tsx` to also depend on `themeMode` and write `--bg-gradient`**

Open `frontend/src/App.tsx`. Replace the first `useEffect`:
```ts
useEffect(() => {
  const t = THEMES[theme]
  const r = document.documentElement
  r.style.setProperty('--accent', t.accent)
  r.style.setProperty('--accent-2', t.accent2)
  r.style.setProperty('--accent-3', t.accent3)
  r.style.setProperty('--accent-glow', t.glow)
  r.style.setProperty('--accent-shadow', t.shadow)
  r.style.setProperty('--accent-tint', t.accent + '22')
}, [theme])
```
With:
```ts
useEffect(() => {
  const t = THEMES[theme]
  const r = document.documentElement
  r.style.setProperty('--accent', t.accent)
  r.style.setProperty('--accent-2', t.accent2)
  r.style.setProperty('--accent-3', t.accent3)
  r.style.setProperty('--accent-glow', t.glow)
  r.style.setProperty('--accent-shadow', t.shadow)
  r.style.setProperty('--accent-tint', t.accent + '22')
  const glowColor = themeMode === 'dark' ? t.bgGlowDark : t.bgGlowLight
  const bgBase = themeMode === 'dark' ? '#04060d' : '#f4f6fb'
  r.style.setProperty(
    '--bg-gradient',
    `radial-gradient(ellipse 90% 42% at 50% -2%, ${glowColor} 0%, transparent 62%), ${bgBase}`
  )
}, [theme, themeMode])
```

- [ ] **Step 5: Change the root div to use `--bg-gradient`**

In `App.tsx`, find the root div:
```tsx
<div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', color: 'var(--color-text-primary)', overflowY: 'auto', overflowX: 'hidden' }}>
```
Change `background: 'var(--color-bg)'` to `background: 'var(--bg-gradient)'`:
```tsx
<div style={{ position: 'fixed', inset: 0, background: 'var(--bg-gradient)', color: 'var(--color-text-primary)', overflowY: 'auto', overflowX: 'hidden' }}>
```

- [ ] **Step 6: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 7: Visual smoke test** — start the dev server and check that the background has a visible glow behind the balance card.

```bash
cd frontend && npm run dev
```
Open the app in a browser. With the violet theme in dark mode, the top of the screen should show a soft purple radial glow emanating from the top-center. Switch to light mode — glow should become much subtler. Switch themes (teal, amber, rose) — glow color should change accordingly.

- [ ] **Step 8: Commit**
```bash
git add frontend/src/shared/tokens.ts frontend/src/App.tsx
git commit -m "feat: ambient background glow — per-theme radial gradient via --bg-gradient CSS var"
```

---

## Task 3: Verify Backend Data Model + Migration

**Spec §6.1** — `users` table has `theme_mode STRING(10) NOT NULL DEFAULT 'dark'` and `theme_color STRING(20) NOT NULL DEFAULT 'violet'`.

**Files:**
- Verify: `backend/app/modules/auth/infrastructure/models.py`
- Verify: `backend/app/modules/auth/domain/entities.py`
- Verify: `backend/migrations/versions/65cb8ce70fe0_add_theme_fields_to_users.py`

- [ ] **Step 1: Verify `UserModel` has the columns**

```bash
grep "theme_mode\|theme_color" backend/app/modules/auth/infrastructure/models.py
```
Expected:
```python
theme_mode: Mapped[str] = mapped_column(String(10), default="dark")
theme_color: Mapped[str] = mapped_column(String(20), default="violet")
```

- [ ] **Step 2: Verify `User` entity has the fields**

```bash
grep "theme_mode\|theme_color" backend/app/modules/auth/domain/entities.py
```
Expected:
```python
theme_mode: str = "dark"
theme_color: str = "violet"
```

- [ ] **Step 3: Verify migration is correct and has downgrade**

```bash
cat backend/migrations/versions/65cb8ce70fe0_add_theme_fields_to_users.py
```
Expected: `upgrade()` calls `op.add_column` for both columns with `server_default`. `downgrade()` calls `op.drop_column` for both.

- [ ] **Step 4: Apply migration to running DB (if not already applied)**

```bash
docker compose exec backend alembic upgrade head
```
Expected: exits 0. If the migration was already applied, Alembic prints "Running upgrade … -> 65cb8ce70fe0" only if it wasn't run. If it was already applied, it prints nothing.

---

## Task 4: Verify Backend Schemas and Repository `update`

**Spec §6.2** — `ThemeResponse` and `ThemePatchRequest` schemas. Repository `update()` persists `theme_mode` and `theme_color`.

- [ ] **Step 1: Verify schemas**

```bash
grep -A 5 "ThemeResponse\|ThemePatchRequest" backend/app/modules/auth/presentation/schemas.py
```
Expected:
```python
class ThemeResponse(BaseModel):
    theme_mode: str
    theme_color: str

class ThemePatchRequest(BaseModel):
    theme_mode: Optional[str] = None
    theme_color: Optional[str] = None
```

- [ ] **Step 2: Verify `SQLAlchemyUserRepository.update` persists theme fields**

```bash
grep "theme_mode\|theme_color" backend/app/modules/auth/infrastructure/repository.py
```
Expected: `model.theme_mode = user.theme_mode` and `model.theme_color = user.theme_color` in the `update` method.

---

## Task 5: Verify Frontend Store, CSS Vars, and Login Sync

**Spec §6.3, §6.4** — `useUIStore` persists `theme` and `themeMode`. On login, fetches theme from backend and applies it.

- [ ] **Step 1: Verify UIStore persists theme fields**

```bash
grep "theme\|themeMode" frontend/src/store/ui.ts | grep -v "//\|import"
```
Expected: `theme: ThemeName`, `themeMode: 'dark' | 'light'`, `setTheme`, `setThemeMode` all present. The `partialize` option must include both `theme` and `themeMode`.

- [ ] **Step 2: Verify `App.tsx` fetches theme on login**

```bash
grep -A 10 "useEffect.*accessToken" frontend/src/App.tsx
```
Expected:
```ts
useEffect(() => {
  if (accessToken) {
    authApi.me().then(setUser).catch(() => {})
    authApi.getTheme().then(t => {
      setThemeMode(t.theme_mode as 'dark' | 'light')
      if (['violet', 'teal', 'amber', 'rose'].includes(t.theme_color)) {
        setTheme(t.theme_color as ThemeName)
      }
    }).catch(() => {})
  }
}, [accessToken])
```

- [ ] **Step 3: Verify CSS tokens in `index.css`**

```bash
grep "data-theme" frontend/src/index.css
```
Expected: two blocks — `[data-theme="dark"]` and `[data-theme="light"]` — each defining `--color-bg`, `--color-surface`, `--color-surface2`, `--color-border`, `--color-border-strong`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`.

- [ ] **Step 4: Verify `[themeMode]` effect sets `data-theme`**

```bash
grep -A 3 "useEffect.*themeMode\b" frontend/src/App.tsx
```
Expected:
```ts
useEffect(() => {
  document.documentElement.setAttribute('data-theme', themeMode)
}, [themeMode])
```

---

## Task 6: Verify ProfileScreen Theme Controls

**Spec §6.5** — Light/Dark toggle uses `Moon`/`Sun` Lucide icons. On change: `setThemeMode(next)` + `authApi.patchTheme(...)`. Color picker is a 2-column grid of swatches. On pick: `setTheme(key)` + `authApi.patchTheme(...)`.

- [ ] **Step 1: Verify Moon/Sun import**

```bash
grep "Moon\|Sun" frontend/src/features/profile/ProfileScreen.tsx | head -3
```
Expected: `import { ..., Sun, Moon } from 'lucide-react'`

- [ ] **Step 2: Verify toggle calls patchTheme**

```bash
grep -A 5 "handleToggleMode" frontend/src/features/profile/ProfileScreen.tsx
```
Expected:
```ts
const handleToggleMode = () => {
  const next = themeMode === 'dark' ? 'light' : 'dark'
  setThemeMode(next)
  authApi.patchTheme({ theme_mode: next }).catch(() => {})
}
```

- [ ] **Step 3: Verify color picker calls patchTheme**

```bash
grep -A 4 "handleSetTheme" frontend/src/features/profile/ProfileScreen.tsx
```
Expected:
```ts
const handleSetTheme = (t: keyof typeof THEMES) => {
  setTheme(t)
  authApi.patchTheme({ theme_color: t }).catch(() => {})
}
```

- [ ] **Step 4: Verify toggle switch spec dimensions (44×26px, thumb 20×20)**

```bash
grep "44\|26\|themeMode === 'dark'" frontend/src/features/profile/ProfileScreen.tsx | head -5
```
Expected: `width: 44, height: 26, borderRadius: 99` for the track. Thumb `width: 20, height: 20, top: 3, left: 3` (off) / `left: 21` (on).

---

## Verification

- [ ] **Frontend TypeScript — no errors:**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Frontend unit tests:**
```bash
cd frontend && npm test -- --run
```

- [ ] **Backend tests — including new theme route tests:**
```bash
cd backend && python -m pytest --tb=short 2>&1 | tail -30
```
Expected: all pass.

- [ ] **DevOps — apply migration if DB containers are running:**
```bash
docker compose exec backend alembic upgrade head
```

- [ ] **Final visual check** — the ambient glow visible in dark mode with the violet theme, subtler on other themes, nearly invisible in light mode.
