# Design: Полный фикс всех разделов (fixing.md)

**Дата:** 2026-05-26  
**Статус:** Утверждён

---

## 1. Главный экран (Дашборд)

### 1.1 Кнопки «Доход» / «Расход»
- Убрать `<span>Добавить</span>` из каждой кнопки.
- Сделать кнопки горизонтальными (иконка + текст в ряд, `flexDirection: 'row'`), уменьшить padding.

### 1.2 Скрытие баланса (`balanceVisible`)
- Текущее поведение: скрывает только `totalBalance`.
- Новое: при `balanceVisible=false` скрывать также:
  - баланс каждой карточки счёта (`••••••`)
  - суммы в строках последних операций (`••••••`)

### 1.3 Кликабельные карточки счётов
- Обернуть карточку счёта в `<button>`, добавить `onClick={() => openModal('account-detail', { accountId: account.id })}`.

### 1.4 Ссылка «Все» над счетами
- Заменить `<button>` на `useNavigate` (из react-router), переход на `/accounts`.

### 1.5 Ссылка «Все» над операциями
- Открывает новую модалку `all-transactions`.
- Добавить тип `'all-transactions'` в `ModalType` (store/ui.ts).
- Новый компонент `AllTransactionsModal` — список всех транзакций без лимита (переиспользует уже существующий `transactionsApi.list()`).
- Зарегистрировать в `ModalRoot`.

---

## 2. Счета & Переводы

### 2.1 Редактирование счёта — новая модалка `account-edit`
- Добавить тип `'account-edit'` в `ModalType`.
- Новый компонент `AccountEditModal`:
  - Поля: `bank_name`, `name` (prefill из данных счёта).
  - Кнопка «Сохранить» → `accountsApi.update(id, { bank_name, name })`.
  - Кнопка «Удалить» (красная) → confirm + `accountsApi.delete(id)`.
  - После успеха: `invalidateQueries(['accounts'])`, закрыть.
- `AccountsScreen`: клик по счёту → `openModal('account-edit', { accountId: a.id })`.
- `HomeScreen`: карточки счётов → `openModal('account-detail', ...)` (история — без изменений).
- `PUT /api/v1/accounts/{id}` и `DELETE /api/v1/accounts/{id}` уже реализованы в backend.

### 2.2 Баг одинаковых счётов в переводе
- В `TransferModal`, при рендере списка «Куда» (`destItems.map`):
  - Если `sourceType === destType`, фильтровать `item.id !== sourceId`.
- Итог: невозможно выбрать один и тот же счёт в обоих полях.

### 2.3 Кнопка «Далее» — layout
- Убрать `{Icons.chev(14)}` из строки `Далее {Icons.chev(14)}`.
- Заменить на стрелку через Unicode `›` или убрать совсем, чтобы не было переноса.

---

## 3. Аналитика

### 3.1 Баг белого оверлея при клике на бар
- В `AnalyticsScreen`, добавить к `<Tooltip>`:
  ```tsx
  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
  ```
- Это убирает непрозрачный белый прямоугольник при hover/tap на баре.

---

## 4. Категории

### 4.1 CRUD: редактирование и удаление
- В `CategoryManageModal`, к каждому элементу списка добавить кнопки-иконки:
  - ✏️ `Edit` (Lucide) → переключает компонент в режим `editing` с prefill полей (name, icon, color).
  - 🗑️ `Trash2` (Lucide) → `window.confirm` + `categoriesApi.delete(cat.id)`.
- Режим `editing` — аналог режима `creating` (та же форма, но заголовок «Изменить категорию», кнопка «Сохранить» → `categoriesApi.update()`).
- Системные категории (`is_system=true`): кнопки скрыть.

### 4.2 Поддержка parent_id (опциональная вложенность)
- В форме создания категории (режим `creating`) добавить поле «Родительская категория»:
  - `<select>` или custom dropdown со списком категорий того же `type`.
  - Значение nullable (первый пункт — «Без родительской»).
- В `CreateCategoryRequest` frontend тип уже предполагает `parent_id?: string | null`.
- В `categoriesApi.create()`: передавать `parent_id: parentId || null`.

### 4.3 Фронтенд API
Добавить в `frontend/src/api/endpoints/categories.ts`:
```ts
update: (id: string, data: UpdateCategoryRequest) => api.put(`/api/v1/categories/${id}`, data).then(r => r.data),
delete: (id: string) => api.delete(`/api/v1/categories/${id}`),
```

---

## 5. Система тем оформления

### 5.1 База данных
Добавить в `UserModel` (`backend/app/modules/auth/infrastructure/models.py`):
```python
theme_mode: Mapped[str] = mapped_column(String(10), default="dark")
theme_color: Mapped[str] = mapped_column(String(20), default="violet")
```
Создать Alembic миграцию: `alembic revision --autogenerate -m "add theme fields to users"`.

### 5.2 Backend — FastAPI
- Новый роутер `theme` в `backend/app/modules/auth/presentation/`:
  - `GET /api/v1/users/me/theme` → возвращает `{ theme_mode, theme_color }`.
  - `PATCH /api/v1/users/me/theme` → принимает `{ theme_mode?, theme_color? }`, обновляет запись пользователя.
- Зарегистрировать роутер в `main.py`.

### 5.3 Frontend — CSS переменные
Расширить систему CSS переменных для поддержки светлой темы:

Добавить в `index.css`:
```css
:root[data-theme="dark"] {
  --color-bg: #04060d;
  --color-surface: #0a0e1a;
  --color-surface2: #131826;
  --color-border: rgba(255,255,255,0.06);
  --color-text-primary: #e6e9f2;
  --color-text-secondary: #6c7488;
  --color-text-muted: #3e455a;
}
:root[data-theme="light"] {
  --color-bg: #f4f6fb;
  --color-surface: #ffffff;
  --color-surface2: #eef0f7;
  --color-border: rgba(0,0,0,0.08);
  --color-text-primary: #0d1120;
  --color-text-secondary: #5a6275;
  --color-text-muted: #9ca3b0;
}
```

Обновить `COLORS` в `tokens.ts` — заменить хардкод на `var()`:
```ts
export const COLORS = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surface2: 'var(--color-surface2)',
  border: 'var(--color-border)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  income: '#34d399',
  expense: '#f87171',
}
```

### 5.4 Frontend — Zustand store
В `store/ui.ts` добавить:
```ts
themeMode: 'dark' | 'light'
themeColor: ThemeName
setThemeMode: (mode: 'dark' | 'light') => void
setThemeColor: (color: ThemeName) => void
```
Persist оба поля. При изменении — применять `data-theme` атрибут на `document.documentElement`.

### 5.5 Frontend — Синхронизация с backend
- При логине (`authApi.me()`): получать тему из backend и применять локально.
- При смене темы: вызывать `PATCH /api/v1/users/me/theme`.

### 5.6 Frontend — UI переключения
В `ProfileScreen` добавить секцию «Оформление»:
- Переключатель Light / Dark (toggle).
- Цветовые свотчи (violet, teal, amber, rose) — уже реализованы частично.

### 5.7 Исправить хардкод тёмного фона в App.tsx
Строка: `background: 'radial-gradient(ellipse at top, #11162a 0%, #060914 50%, #04060d 100%)'`
Заменить на `background: 'var(--color-bg)'` (с упрощением градиента для light mode).

---

## 6. DevOps (выполняется вручную после раздела 5)

После всех изменений в БД:
1. `docker compose down -v` — сброс volumes (БД).
2. `docker compose up --build -d` — пересборка и запуск.
3. Alembic-миграции применяются автоматически при старте (или вручную: `alembic upgrade head`).

---

## Порядок реализации (для параллельного выполнения)

**Группа A — Frontend-only (параллельно):**
- A1: Дашборд (секция 1) — HomeScreen.tsx
- A2: Счета & Переводы UI (секция 2) — TransferModal, AccountsScreen, новая AccountEditModal
- A3: Аналитика (секция 3) — AnalyticsScreen.tsx (1 строка)
- A4: Категории CRUD (секция 4) — CategoryManageModal.tsx + categories API

**Группа B — Backend + Frontend (последовательно после A):**
- B1: Backend тема (секция 5.1-5.2) — DB migration + FastAPI endpoints
- B2: Frontend тема (секция 5.3-5.6) — CSS vars + Zustand + ProfileScreen
- B3: DevOps (секция 6) — вручную пользователем

**Зависимости:**
- A1, A2, A3, A4 — независимы, параллельно.
- B1 и B2 — B2 зависит от B1 (нужны endpoint'ы).
- B3 — после B1.
