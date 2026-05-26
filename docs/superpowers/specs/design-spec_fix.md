# Design & Feature Specification

> Source: `fixing.md` backlog + visual reference screenshot (May 2026).
> Icons: Lucide React only — no emoji anywhere in the UI.

---

## 1. Visual Design System

### 1.1 Ambient Background Glow

The app background is a two-layer composition: a solid base color beneath a radial accent glow that emanates from the top-center of the viewport. This creates the "deep space" atmosphere visible in the reference screenshot.

**Token additions to `index.css`:**

```css
:root[data-theme="dark"] {
  /* existing color tokens … */
  --bg-glow-opacity: 0.30;
}

:root[data-theme="light"] {
  /* existing color tokens … */
  --bg-glow-opacity: 0.06;
}
```

**App.tsx root div background (replaces plain `var(--color-bg)`):**

```tsx
background: `radial-gradient(
  ellipse 90% 42% at 50% -2%,
  color-mix(in srgb, var(--accent) calc(var(--bg-glow-opacity) * 100%), transparent),
  transparent 62%
), var(--color-bg)`
```

If `color-mix` browser support is a concern, set the composed value directly from the `useEffect` that already writes accent CSS vars:

```ts
r.style.setProperty(
  '--bg-gradient',
  `radial-gradient(ellipse 90% 42% at 50% -2%, ${t.glow.replace('0.20', '0.30')} 0%, transparent 62%), ${darkMode ? '#04060d' : '#f4f6fb'}`
)
```

And in JSX: `background: 'var(--bg-gradient)'`

**Glow parameters by theme color:**

| ThemeName | Center opacity (dark) | Center opacity (light) |
|-----------|----------------------|------------------------|
| violet    | 0.30                 | 0.06                   |
| teal      | 0.26                 | 0.05                   |
| amber     | 0.22                 | 0.04                   |
| rose      | 0.28                 | 0.05                   |

The glow must be recomputed whenever `theme` or `themeMode` changes — hook it into the existing `useEffect([theme])` in `App.tsx`.

### 1.2 Surface Layers

| Layer        | Dark token            | Light token          | Usage                        |
|--------------|-----------------------|----------------------|------------------------------|
| `bg`         | `#04060d`             | `#f4f6fb`            | Page background              |
| `surface`    | `#0a0e1a`             | `#ffffff`            | Cards, modals                |
| `surface2`   | `#131826`             | `#eef0f7`            | Inputs, secondary cards      |
| `border`     | `rgba(255,255,255,.06)`| `rgba(0,0,0,.08)`   | Dividers, card borders       |
| `borderStrong`| `rgba(255,255,255,.10)`| `rgba(0,0,0,.14)`  | Focused inputs, active state |

### 1.3 Typography

| Role            | Size | Weight | Color token          |
|-----------------|------|--------|----------------------|
| Screen title    | 22px | 800    | `textPrimary`        |
| Section label   | 12px | 600    | `textSecondary`, uppercase, +0.5 letter-spacing |
| Body / row text | 14px | 600    | `textPrimary`        |
| Sub-text / date | 12px | 400    | `textSecondary`      |
| Muted hint      | 11px | 500    | `textMuted`          |

### 1.4 Interactive Elements

**Buttons — primary action:**
```
background: linear-gradient(135deg, var(--accent), var(--accent-2))
border-radius: 14–18px
padding: 14px 0
font-size: 14px, weight 700
color: #fff (dark) / #0a0e1a (light — ensure contrast)
```

**Buttons — destructive:**
```
background: {COLORS.expense}18
border: 1px solid {COLORS.expense}44
color: COLORS.expense
```

**Toggle switch (balance visibility, dark/light mode):**
```
Track width: 44px, height: 26px, border-radius: 99px
Thumb: 20×20px, top: 3px, left: 3px (off) / 21px (on)
Active track: var(--accent)
Inactive track: COLORS.border
Transition: background 0.2s, left 0.2s
```

**Icon bubbles (category icons, nav icons):**
```
width/height: 36–44px, border-radius: 12–14px
background: {catColor}22
border: 1px solid {catColor}44
```

### 1.5 Icon Policy

All icons must come from `lucide-react`. No emoji, no custom SVG assets, no icon fonts. When an icon is not available in Lucide, choose the closest semantic alternative.

---

## 2. HomeScreen (Dashboard)

### 2.1 Balance Card

- Full-width gradient pill at the top of the screen.
- Contains: greeting + month, total balance, income/expense stats, quick-action buttons.
- The ambient glow (§1.1) sits behind the card and creates the halo visible in the reference screenshot.

**Balance visibility toggle behavior:**
When `balanceVisible === false` render `'••••••'` (six bullets) in place of every numeric value:
- Main balance (balance card)
- Per-account balance (account slider cards)
- Transaction amounts (both in the recent list and in AllTransactionsModal)

### 2.2 Income / Expense Quick-Action Buttons

Layout: `flexDirection: 'row'`, `justifyContent: 'center'`, `gap: 8`.  
Icon size: 20px. Padding: `12px 0`. No "Добавить" label.  
Icons: `Plus` (income, color `COLORS.income`), `Minus` (expense, color `COLORS.expense`).

### 2.3 Account Slider

- Horizontally scrollable card strip, snap scrolling.
- Each card: bank name, account name, balance (masked by toggle), currency.
- **"Все →" link:** navigates to `/accounts` via `useNavigate`.
- **Card tap:** opens a modal with recent transactions filtered to that account (future scope — outside current plan).

### 2.4 Recent Transactions

- Shows last N transactions (limit configurable, default 5).
- Row: 40×40 category icon bubble, description + date, amount (masked by toggle).
- Amount color: `COLORS.income` (+) / `COLORS.expense` (−).
- **"Все →" link:** opens `AllTransactionsModal` via `openModal('all-transactions')`.

---

## 3. Accounts Screen & Transfers

### 3.1 Account Row Click

Clicking an account row opens `AccountEditModal` (not a read-only detail view).

### 3.2 AccountEditModal

Fields: Bank name (`bank_name`), Account name (`name`).  
Pre-filled with current values via `useEffect([account])`.  
Actions:
- **Save** — calls `accountsApi.update(id, { bank_name, name })`, invalidates `['accounts']`, shows toast, closes modal.
- **Delete** — `window.confirm` guard → `accountsApi.delete(id)`, invalidates, shows toast, closes.

Disabled Save when either field is empty. Loading states on both buttons.

### 3.3 Transfer Same-Account Guard

When `sourceType === destType`, the destination list must exclude the item already selected as source:

```ts
const rawDestItems = destType === 'savings_account' ? accounts : deposits
const destItems = sourceType === destType
  ? rawDestItems.filter(item => item.id !== sourceId)
  : rawDestItems
```

This prevents the user from transferring to the same account and the resulting false-positive toast.

### 3.4 "Далее" Button

Text: `Далее ›` — a Unicode right chevron (`›`, U+203A), not a Lucide icon, not `>`.  
This avoids the line-break issue caused by rendering a component inside button text.

---

## 4. Analytics Screen

### 4.1 Bar Chart Cursor

The Recharts `<Tooltip>` white-rectangle overlay on hover is fixed by:

```tsx
<Tooltip
  contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
  formatter={(v) => typeof v === 'number' ? `${formatAmount(v)} ₽` : String(v)}
  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
/>
```

For the light theme the cursor fill should remain the same — `rgba(255,255,255,0.05)` is near-invisible on both backgrounds.

---

## 5. Categories

### 5.1 Category CRUD in CategoryManageModal

Modal has three views controlled by `creating: boolean` and `editing: string | null`:

```
editing !== null  →  Edit form
!creating         →  List view
creating          →  Create form
```

Back button runs `setCreating(false); setEditing(null)` — handles both modes.

**List view — per-row actions (non-system categories only):**

| Action | Icon        | Behavior                                         |
|--------|-------------|--------------------------------------------------|
| Edit   | `Edit` (15) | Sets `editing = cat.id`, prefills `editName/Icon/Color` |
| Delete | `Trash2` (15, `COLORS.expense`) | `window.confirm` → `categoriesApi.delete(id)` |

System categories (`is_system: true`) show only a "системная" muted label — no action buttons.

**Edit form fields:** Name input, color swatches, icon grid, live preview row, Save button.  
Save calls `categoriesApi.update(editing!, { name: editName, icon: editIcon, color: editColor })`.

### 5.2 Category Hierarchy (parent_id)

A category may optionally belong to a parent category of the same type.

**`CreateCategoryRequest`** already includes `parent_id?: string`.  
In the Create form, above the Name input, show a `<select>` listing root-level categories of the current tab (`type === tab && !parent_id`). First option: "Без родительской" (`value=""`).

Mutation:
```ts
categoriesApi.create({ name, type: tab, icon, color, parent_id: parentId || undefined })
```

Reset `parentId` to `''` on success.

Maximum nesting depth: 2 levels (root → child). The UI does not need to support grandchildren.

---

## 6. Theme System

### 6.1 Data Model

Two new columns on `users`:

| Column       | Type        | Default   |
|--------------|-------------|-----------|
| `theme_mode` | `String(10)`| `"dark"`  |
| `theme_color`| `String(20)`| `"violet"`|

Alembic migration adds both with `server_default` and `NOT NULL`.

### 6.2 Backend Endpoints

```
GET  /api/v1/users/me/theme   → ThemeResponse { theme_mode, theme_color }
PATCH /api/v1/users/me/theme  → ThemeResponse (partial update — either field optional)
```

Both require a valid JWT (`get_current_user_id` dependency).

### 6.3 Frontend Store

`useUIStore` persists `theme` (ThemeName) and `themeMode` ('dark' | 'light') via Zustand `persist`.

On login (`accessToken` changes): fetch `authApi.getTheme()` and apply `setThemeMode` + `setTheme` from the response. Errors are silently ignored (local persisted state is the fallback).

### 6.4 CSS Variable Application

`App.tsx` has two `useEffect` hooks:

1. `[theme]` — writes `--accent`, `--accent-2`, `--accent-3`, `--accent-glow`, `--accent-shadow`, `--accent-tint`, and **`--bg-gradient`** to `document.documentElement`.
2. `[themeMode]` — sets `data-theme` attribute on `document.documentElement`.

The `data-theme` attribute triggers the `[data-theme="dark"]` / `[data-theme="light"]` CSS blocks in `index.css`.

### 6.5 ProfileScreen Toggle

Light/Dark toggle row in the Appearance section:

- Icon: `Moon` (dark) / `Sun` (light) from Lucide, `COLORS.textSecondary` color.
- Label: "Тёмная тема" / "Светлая тема".
- Toggle switch (§1.4 spec).
- On change: `setThemeMode(next)` + `authApi.patchTheme({ theme_mode: next }).catch(() => {})`.

Color theme picker: 2-column grid of swatches. On pick: `setTheme(key)` + `authApi.patchTheme({ theme_color: key }).catch(() => {})`.

---

## 7. DevOps (Post-Schema Change)

After any backend model change requiring a new migration:

```bash
# Preferred — no data loss:
docker compose exec backend alembic upgrade head

# Nuclear reset (only when wiping data is acceptable):
docker compose down -v && docker compose up --build -d
```

Alembic migration files live in `backend/migrations/versions/`. Each migration must include both `upgrade()` and `downgrade()`.
