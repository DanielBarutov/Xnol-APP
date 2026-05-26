# Spec: Fixing Backlog — Deposits, Stats, Categories, UI/UX

Date: 2026-05-26

---

## 1. System Categories Isolation

**Goal:** Remove shared global categories (`user_id IS NULL`) and provide per-user default categories created at registration.

**Backend changes:**
- New Alembic migration: `DELETE FROM categories WHERE user_id IS NULL`
- `RegisterUserUseCase.execute()` calls a new helper `_create_default_categories(user_id, repo)` immediately after saving the user. The helper bulk-inserts the same 12 default categories (same names/icons/colors as current seed).
- `SQLAlchemyCategoryRepository.list_for_user()` removes the `user_id IS NULL` OR clause — returns only `user_id == user_id`.
- DB reset required after migration (per fixing.md §6).

**Constraint:** `CategoryModel.is_system` column and `is_system` flag stay in place — newly seeded per-user categories are created with `is_system=True` so the frontend correctly marks them as undeletable.

---

## 2. Stats — `day` Period

**Goal:** Add "today" period to all three stats endpoints.

**Backend changes:**
- `resolve_period` in `stats/presentation/router.py`: extend Annotated Query pattern to `^(this_month|prev_month|this_year|day)$`. Add `elif target == "day": return today, today`.

**Frontend changes:**
- `StatPeriod` type in `api/types.ts`: add `'day'`.
- `AnalyticsScreen.tsx`: add `{ value: 'day', label: 'День' }` to `PERIODS` array.
- Custom date range tab `'custom'`: shown as two `<input type="date">` fields (date_from / date_to). When active, calls `statsApi.categories(undefined, { date_from, date_to })` — passes `date_from`/`date_to` params instead of `period`. The `useStats` hook is extended to accept an optional `customRange` parameter.
- `statsApi` endpoints accept an overload: `period` OR `{ date_from, date_to }` query params.

---

## 3. Deposit Yield Calculator (frontend-only)

**Goal:** Show projected yield inside `DepositDetailModal` without a new API endpoint.

**Logic (frontend):**
```
months = max(1, round(days_until_close / 30.44))
rate = parseFloat(interest_rate)   // e.g. 0.12 for 12%
balance = parseFloat(balance)

if interest_type === 'simple':
  yield = balance × rate × (months / 12)
else:  // compound, monthly capitalization
  yield = balance × (1 + rate / 12) ^ months − balance

projected_balance = balance + yield
```

**UI:** New card block below the existing rows in `DepositDetailModal` — displays "Ожидаемый доход", yield amount (green), and projected balance.

---

## 4. Emoji → Lucide Icon Migration

**Goal:** Replace 💰 emoji in `AccountsScreen.tsx` deposit rows.

- Replace `💰` with `<Landmark size={18} />` from `lucide-react`.

---

## 5. UI/UX — Dark Theme Glows

**Goal:** Add subtle glow/shadow to interactive cards and elements (return to original reference design).

- Account/deposit cards in `AccountsScreen` and `HomeScreen`: add `boxShadow: '0 4px 20px rgba(0,0,0,0.35)'`.
- Surface cards gain a faint colored glow when the accent is set. Done via `--color-surface` upgrade in index.css adding a subtle `box-shadow` to `.card`-like elements, or inline in components.

---

## 6. UI/UX — Light Theme BottomNav

**Goal:** Remove dark metallic gradient from bottom nav in light mode. Add separation shadow.

- `BottomNav.tsx` reads `themeMode` from `useUIStore`. In dark mode: keep existing `linear-gradient(to top, rgba(8,10,20,0.97) 60%, rgba(8,10,20,0))`. In light mode: `background: var(--color-surface)` + `backdropFilter: 'blur(20px)'`.
- In both modes add `boxShadow: themeMode === 'light' ? '0 -4px 16px rgba(0,0,0,0.06)' : 'none'` for separation.

---

## 7. UI/UX — Light Theme Account Cards

**Goal:** Account slider cards on dashboard should not have a static dark background in light mode.

- `HomeScreen` account cards: `background: var(--color-surface)`, `border: 1px solid var(--color-border)`. Remove any hardcoded `#` dark colors.

---

## 8. UI/UX — Balance Container Theming Bug

**Goal:** Balance container (total balance on HomeScreen) must update its color palette when the color scheme changes.

- The balance card in `HomeScreen.tsx` uses a hardcoded violet gradient (`#1a1060, #2d1b69, #4c1d95`), hardcoded border `rgba(139,92,246,0.4)`, and hardcoded glow `rgba(99,102,241,0.3)`.
- Fix: replace with CSS-variable-driven values. In `App.tsx` `useEffect([theme])`, set two new CSS vars: `--accent-bg-start` and `--accent-bg-end` derived from the theme's dark glow color (already computed). The balance card background becomes `linear-gradient(135deg, var(--accent-bg-start) 0%, var(--accent-bg-end) 100%)`. Border and shadow use `var(--accent)` with opacity.
- The account slider cards use hardcoded `background: '#0d1220'`. Replace with `var(--color-surface2)` so they adapt in light mode.

---

## 9. Docker — alembic upgrade head on Start

**Goal:** Container runs migrations automatically before starting the API.

- `docker-compose.yml` `api.command`: change from `uvicorn ...` to `sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"`.

---

## Out of Scope

- OAuth / social login changes
- Transfers screen bug fixes (from old fixing.md version — superseded by new spec)
- Dashboard "Добавить" button removal (from old fixing.md version)
