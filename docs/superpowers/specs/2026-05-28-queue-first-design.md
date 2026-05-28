# Queue-First Offline Architecture Design

## Goal

Переработать мобильное приложение так, чтобы все операции записи (транзакции, переводы, счета) всегда шли через локальную очередь сначала — без network-check и прямых вызовов API из UI. Приложение работает автономно; фоновый sync отправляет данные на сервер при появлении сети. Пользователь не должен замечать разницы между онлайн и офлайн режимами.

## Architecture

Три слоя:

1. **UI (листы создания)** — всегда пишет в очередь + обновляет React Query кэш оптимистично. Не знает о сети.
2. **Mutation Queue (Zustand + AsyncStorage)** — персистентный FIFO-буфер. Каждый элемент имеет клиентский UUID v4 как id.
3. **Sync Hook** — фоновый процесс, отправляет элементы очереди на сервер когда сеть доступна.

## Tech Stack

React Native (Expo SDK 56), Zustand v5 + AsyncStorage, @tanstack/react-query v5, FastAPI + SQLAlchemy (backend)

---

## Section 1: Write Flow

**Было:** три ветки в каждом листе — офлайн → enqueue, онлайн → try API → on fail → enqueue.

**Станет:** одна ветка — всегда enqueue, затем оптимистично обновить кэш.

Из всех трёх листов (`AddTxSheet`, `TransferSheet`, `CreateAccountSheet`) удаляем:
- `useNetworkStatus` и проверку `network !== 'online'`
- `useState(loading)` и `setLoading`
- `try/catch` с прямым вызовом API из листа
- `qc.invalidateQueries(...)` после создания (ответственность переходит к sync-хуку)

Тост становится единым: `'Добавлено'` (зелёный) — без условных сообщений для онлайн/офлайн.

## Section 2: Client UUID v4 + Optimistic Cache Patching

### genId()

`genKey()` переименовывается в `genId()` и использует `crypto.randomUUID()` (доступен глобально в RN 0.79 / Expo SDK 56). Этот UUID служит одновременно:
- идемпотентным ключом (`X-Idempotency-Key` на сервер)
- реальным id сущности (для счетов — сервер принимает и сохраняет его)

### patchBalance()

```ts
// mobile/store/mutationQueue.ts (рядом с genId)
export function patchBalance(qc: QueryClient, accountId: string, delta: number): void {
  qc.setQueryData<AccountResponse[]>(['accounts'], (accounts = []) =>
    accounts.map(a =>
      a.id === accountId
        ? { ...a, balance: (parseFloat(a.balance) + delta).toFixed(2) }
        : a
    )
  )
}
```

**Для транзакций:**
- `expense` → `patchBalance(qc, accountId, -amount)`
- `income` → `patchBalance(qc, accountId, +amount)`

**Для переводов:**
- `patchBalance(qc, sourceId, -amount)`
- `patchBalance(qc, destId, +amount)`

### Создание счёта (CreateAccountSheet)

```ts
const id = genId()
enqueue({ id, type: 'account', payload: { id, name, bank_name: bank, currency, balance } })
qc.setQueryData<AccountResponse[]>(['accounts'], (accounts = []) => [
  ...accounts,
  {
    id,
    name,
    bank_name: bank || null,
    currency,
    balance,
    created_at: new Date().toISOString(),
    user_id: '',   // неизвестен на клиенте, заполнится после invalidate
  },
])
```

Счёт появляется в списке немедленно с тем же UUID, который сервер сохранит. Это позволяет тут же выбрать его при создании транзакции офлайн — `account_id` будет корректным после sync.

### Backend: принять client-provided id для счёта

`CreateAccountRequest` принимает опциональный `id: UUID | None = None`. Если передан — использует его, иначе генерирует сам. Обратная совместимость сохраняется.

Затронутые файлы:
- `backend/app/modules/accounts/presentation/schemas.py`
- `backend/app/modules/accounts/application/dtos.py`
- `backend/app/modules/accounts/application/use_cases.py`

Shared type:
- `shared/api/types.ts` — добавить `id?: string` в `CreateAccountRequest`

## Section 3: Sync Flow

`useMutationSync` почти не меняется. Добавляем запуск при выходе из фона через `AppState`:

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active' && network === 'online') processQueue()
  })
  return () => sub.remove()
}, [network])
```

После успешной синхронизации `invalidateQueries(['accounts'])` заменит оптимистичные балансы реальными с сервера.

Порядок синхронизации — FIFO (уже реализован). Счёт создаётся раньше транзакций, которые его используют, если добавлен в очередь раньше — что естественно для пользовательского flow.

## Section 4: UX / Pending States

**Листы создания:** единый тост `'Добавлено'` (зелёный). Нет разницы онлайн/офлайн.

**AllTransactionsSheet и HomeScreen:** уже показывают pending-элементы с `opacity: 0.6` и Clock-иконкой. Без изменений.

**Список счетов (`mobile/features/accounts/AccountsScreen.tsx`):** офлайн-счёт появляется немедленно. Показываем Clock-бейдж рядом с именем пока `queueItems.some(i => i.type === 'account' && i.id === account.id)`.

**AddTxSheet:** офлайн-счёт полностью доступен для выбора — благодаря клиентскому UUID он корректно синхронизируется.

## Files Changed

| Файл | Изменение |
|---|---|
| `backend/app/modules/accounts/presentation/schemas.py` | `id: UUID \| None = None` в `CreateAccountRequest` |
| `backend/app/modules/accounts/application/dtos.py` | `id: UUID \| None = None` в `CreateAccountDTO` |
| `backend/app/modules/accounts/application/use_cases.py` | использовать `dto.id or uuid4()` |
| `backend/tests/integration/accounts/` | обновить тесты под новую схему |
| `shared/api/types.ts` | `id?: string` в `CreateAccountRequest` |
| `mobile/store/mutationQueue.ts` | `genId()` через `crypto.randomUUID()`, экспорт `patchBalance()` |
| `mobile/features/transactions/AddTxSheet.tsx` | queue-first, убрать network/loading/try-catch, вызвать `patchBalance` |
| `mobile/features/accounts/TransferSheet.tsx` | queue-first, patch обоих счетов |
| `mobile/features/accounts/CreateAccountSheet.tsx` | queue-first, patch accounts cache с новым счётом |
| `mobile/hooks/useMutationSync.ts` | добавить AppState trigger |
| `mobile/features/accounts/AccountsScreen.tsx` | Clock-бейдж для pending счетов |
