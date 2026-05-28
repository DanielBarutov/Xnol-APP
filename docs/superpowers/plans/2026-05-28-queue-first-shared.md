# Queue-First: Shared — CreateAccountRequest with Optional id

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `id?: string` field to the shared `CreateAccountRequest` type so the mobile client can include the client-generated UUID when enqueueing an account creation.

**Architecture:** Single type change in `shared/api/types.ts`. No API endpoint logic lives in the shared package — the type just contracts what fields the POST body may contain.

**Tech Stack:** TypeScript, shared package consumed by both `mobile` and `frontend` workspaces.

---

## Files

| File | Change |
|---|---|
| `shared/api/types.ts` | Add `id?: string` to `CreateAccountRequest` |

---

### Task 1: Add `id` to the shared type and verify compilation

- [ ] **Step 1: Edit `shared/api/types.ts`**

Find line 19:
```ts
export interface CreateAccountRequest { name: string; bank_name: string; currency: Currency; balance: string }
```

Replace with:
```ts
export interface CreateAccountRequest { id?: string; name: string; bank_name: string; currency: Currency; balance: string }
```

- [ ] **Step 2: Verify TypeScript compilation in shared**

```bash
cd shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify mobile still compiles (consumes the shared type)**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: same pre-existing errors as before (3 Expo Router path errors unrelated to this change), no new errors.

- [ ] **Step 4: Commit**

```bash
git add shared/api/types.ts
git commit -m "feat(shared): add optional id to CreateAccountRequest"
```
