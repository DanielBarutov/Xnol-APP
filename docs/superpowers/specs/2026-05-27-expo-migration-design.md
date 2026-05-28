# Expo Migration Design: React → Expo (iOS + Android + Web)

**Date:** 2026-05-27  
**Approach:** Variant A — раздельный UI, общий бизнес-слой  
**Status:** Approved

---

## Контекст

Текущий фронтенд — React 19 + Vite + TypeScript, мобильное приложение (PWA-like), работает в браузере. Цель — добавить нативные iOS и Android приложения через Expo, сохранив существующий веб-фронтенд без изменений.

**Приоритеты:**
- Мобилка — основная платформа
- Веб — дополнение, остаётся рабочим
- Старт через Expo Go, публикация в App Store / Google Play через ~1 месяц
- Монорепо: `frontend/` + `mobile/` + `shared/` в одном репозитории

---

## Архитектура монорепо

```
xnoll/
├── frontend/          # существующий React/Vite веб (не трогаем)
├── mobile/            # новый Expo проект
│   ├── app/           # expo-router файловая навигация
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx        # Главная
│   │   │   ├── accounts.tsx     # Счета
│   │   │   ├── analytics.tsx    # Аналитика
│   │   │   └── profile.tsx      # Профиль
│   │   └── _layout.tsx
│   ├── components/    # переиспользуемые RN компоненты
│   ├── features/      # экраны и фичи
│   ├── theme/         # дизайн-токены для RN
│   └── package.json
└── shared/            # общий код: API, store, types
    ├── api/
    │   ├── client.ts
    │   └── endpoints/
    │       ├── auth.ts
    │       ├── accounts.ts
    │       ├── transactions.ts
    │       ├── categories.ts
    │       ├── deposits.ts
    │       ├── transfers.ts
    │       └── stats.ts
    ├── store/
    │   └── auth.ts
    ├── types.ts
    └── package.json
```

---

## Технологический стек

| Категория | Веб (`frontend/`) | Мобилка (`mobile/`) |
|-----------|-------------------|---------------------|
| Фреймворк | React 19 + Vite | Expo SDK 52 |
| Навигация | react-router-dom v7 | expo-router v4 (файловая) |
| Стили | CSS переменные + инлайн | StyleSheet + useTheme хук |
| Графики | recharts | victory-native |
| Иконки | lucide-react | lucide-react-native |
| Состояние | zustand v5 | zustand v5 (тот же) |
| Сервер-стейт | react-query v5 | react-query v5 (тот же) |
| HTTP | axios | axios (тот же) |
| Модалы | кастомный ModalRoot | expo `<Modal>` + `@gorhom/bottom-sheet` |
| Safe area | `env(safe-area-inset-bottom)` | react-native-safe-area-context |
| Хранилище токена | localStorage | expo-secure-store |
| Темы | CSS переменные (4 темы) | ThemeContext с объектами стилей |

---

## Общий слой (`shared/`)

Настраивается как локальный npm-пакет:

```json
// mobile/package.json и frontend/package.json
{
  "dependencies": {
    "@xnoll/shared": "file:../shared"
  }
}
```

**Переезжает из `frontend/src/` в `shared/`:**
- `api/client.ts` — axios instance
- `api/endpoints/*` — все эндпоинты
- `api/types.ts` — TypeScript типы
- `store/auth.ts` — zustand auth стор (токен, юзер)

**Остаётся отдельным в каждой платформе:**
- `store/ui.ts` — тема, модалы (разная логика на вебе и мобилке)
- Все UI компоненты

**`frontend/`** обновит импорты с `../../api/` на `@xnoll/shared/api` — логика не меняется.

---

## Тема и дизайн-токены

CSS-переменные (`--accent`, `--color-bg` и т.д.) заменяются на TypeScript объекты:

```typescript
// mobile/theme/index.ts
export const useTheme = () => {
  const { themeName, themeMode } = useUIStore()
  return buildTheme(themeName, themeMode) // возвращает объект с цветами
}
```

4 темы сохраняются: violet, teal, amber, rose. Логика та же, формат — объект вместо CSS.

---

## Навигация

`react-router-dom` → `expo-router` (файловая навигация):

```
app/
├── _layout.tsx          # RootLayout: QueryClient, ThemeProvider, AuthGuard
├── (auth)/
│   ├── _layout.tsx      # неавторизованные экраны
│   ├── login.tsx
│   └── register.tsx
└── (tabs)/
    ├── _layout.tsx      # Tab навигация с BottomNav
    ├── index.tsx        # /
    ├── accounts.tsx     # /accounts
    ├── analytics.tsx    # /analytics
    └── profile.tsx      # /profile
```

Auth guard: если нет токена → redirect на `/login`, иначе → tabs.

---

## Ключевые решения

- **expo-secure-store** вместо localStorage для JWT — безопаснее на мобилке
- **victory-native** для графиков — поддерживает анимации, хорошо работает с RN
- **lucide-react-native** для иконок — прямой аналог lucide-react
- **react-native-safe-area-context** — правильная обработка notch / home indicator
- **`@gorhom/bottom-sheet`** для модалов (AddTx, детали) — нативный UX на мобилке, совместим с Expo Go
- **store/ui.ts** остаётся платформо-специфичным — разные паттерны UI

---

## 10-частный план реализации

| # | Часть | Описание |
|---|-------|----------|
| 1 | Монорепо + shared пакет | Создаём `shared/`, переносим API-слой, обновляем импорты в `frontend/` |
| 2 | Expo проект | Инициализация, TypeScript, expo-router, базовая конфигурация |
| 3 | Тема и дизайн-токены | ThemeContext, цвета, типографика — аналог `tokens.ts` для RN |
| 4 | Auth экраны | Login, Register, AuthGuard, expo-secure-store для токена |
| 5 | Навигация + Layout | `_layout.tsx`, tabs, BottomNav с floating кнопкой |
| 6 | Главный экран (Home) | Баланс, последние транзакции, карточки счетов |
| 7 | Экран счетов (Accounts) | Список, создание, редактирование, переводы, депозиты |
| 8 | Транзакции и модалы | AddTx, TransactionDetail, AllTransactions, bottom sheets |
| 9 | Аналитика (Analytics) | Графики victory-native, категории, фильтры |
| 10 | Профиль + полировка | ProfileScreen, смена темы, подготовка к публикации |

---

## Критерии успеха

- Expo Go запускает приложение на iOS и Android
- Все 4 основных экрана работают
- Auth (login/logout) работает через общий `@xnoll/shared` пакет
- Веб (`frontend/`) продолжает работать без изменений в поведении
- Токены хранятся в expo-secure-store
- Через ~1 месяц: готовность к публикации в App Store и Google Play
