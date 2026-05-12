# Admin Settings — API Integration

Stage 14.3.6. Real backend wire-up for the admin Settings page. Source:
`admin/src/lib/api/settings.ts`,
`admin/src/app/(authenticated)/settings/SettingsClient.tsx`. Backend
contracts: `docs/settings.md` + the change-password section of
`docs/auth.md`.

## Surface

```
admin/src/
├── lib/api/
│   ├── keys.ts                  # + settingsKeys factory
│   └── settings.ts              # useSettings + useUpdateSettings + useChangeAdminPassword
└── app/(authenticated)/settings/
    ├── page.tsx                 # comment refreshed to point at §14.3.6
    └── SettingsClient.tsx       # TTL form + password form + admin profile block
```

No mock module existed for settings — the previous skeleton was inline
state in the client component (Stage 14.1.7).

## Hooks

| Hook | Endpoint | Method | Notes |
|---|---|---|---|
| `useSettings()` | `/admin/settings` | GET | `staleTime: 60s` — admin edits it manually; no need for instant freshness on other tabs. |
| `useUpdateSettings()` | `/admin/settings` | PATCH | Body partial; on success writes the response into the cache via `setQueryData(settingsKeys.current(), data)`. |
| `useChangeAdminPassword()` | `/auth/admin/change-password` | POST | Returns 204; no payload to cache. Errors propagate through `ApiError` so the form can render them inline. |

`useChangeAdminPassword` lives in `settings.ts` because the page is its
only consumer today. Move it to `lib/auth/use-auth.ts` if a second
caller appears.

## Query keys

```ts
settingsKeys.all      // ["settings"]
settingsKeys.current  // ["settings", "current"]
```

Singleton resource — one entry is enough. The hierarchy leaves room for
future sub-resources (history log, etc.) without rewriting consumers.

## DTO ↔ domain

`AppSettings` is a structural alias of `AppSettingsDto` — same fields
(`photoTtlDays: number`, `updatedAt: ISOString`). No remap needed today;
keep the named type so a future audit field (e.g. `updatedBy`) can be
introduced without touching the call sites.

## Form behaviour

### TTL form

- Controlled `photoTtl` state — synced from `settings.photoTtlDays` via
  `useEffect` so server-side changes are reflected without resetting the
  user's in-progress edit (the effect only fires when `settings` changes
  identity, not on every keystroke).
- Client-side guard before submit: integer in `[1, 365]`. Out-of-range
  shows the toast `TTL должен быть целым числом от 1 до 365 дней`;
  backend has the same `@IsInt @Min(1) @Max(365)` bound (defence in
  depth — backend rejects with 400 if a non-UI caller bypasses the
  guard).
- "No-op" detection: if the typed value equals the current setting, the
  toast says `TTL не изменился` and we skip the PATCH. Saves a
  round-trip and avoids bumping `updatedAt` for nothing.
- Last-updated hint is shown under the form once data is loaded
  (`Последнее обновление: dd.mm.yyyy, HH:mm`, ru-RU locale).
- Submit button is `disabled` while `settings` is undefined (loading);
  isLoading on the button is the mutation's `isPending`.

### Password form

- Pre-submit validation, in order: non-empty → `≥8` chars → new ≠
  current → new == confirm. First failure sets `passwordError` and
  short-circuits. Backend has its own `@MinLength(8)` so this is purely
  UX.
- On submit, `mutateAsync` is awaited inside a `try/catch`. Success
  clears all three fields and toasts:
  `Пароль обновлён. Другие сессии будут разлогинены автоматически.`
  Failure routes through `extractMessage` and renders inline under the
  confirm input.
- After a successful change, the backend revokes all refresh tokens for
  this admin — see `docs/auth.md` for the security rationale. The
  current session keeps its short-TTL access token (max 15 min, default
  `JWT_ACCESS_TTL`), so the user is not yanked back to `/login` mid-form
  — the redirect happens on the first 401 that can't be refreshed.

## Error rendering

`extractMessage(error, fallback)` collapses `ApiError`'s `messages()`
array (class-validator returns `string[]`) to the first non-empty
string. Falls back to `error.message`, then to the provided default.
Used by both forms so backend messages (e.g.
`Current password is incorrect`, `photoTtlDays must not be greater than 365`)
surface verbatim.

The GET-side error case is shown as a `bg-error-primary` banner above
the TTL form (same styling as `LoginForm`'s `<p role="alert">`). PATCH /
POST errors stay inside their form — a transient mutation failure should
not blank the page.

## Admin profile block

`useUser()` from `lib/auth/use-auth.ts` drives the read-only fields
(Логин, Полное имя). The mock used to render Created / Last login — both
removed because the backend's `/auth/admin/login` response carries only
`{ id, username, fullName }`. Adding them would need a new
`GET /api/auth/me` endpoint; tracked implicitly by §7.x but out of scope
for this stage.

## What is NOT here yet

- **Toast queue management** — the current `setTimeout(remove, 3s)` is
  fine for one-shot saves. Stacked toasts with manual dismiss would need
  a real toast library.
- **`GET /api/auth/me`** — see profile block note above. Would also let
  us show created-at / last-login-at and a more helpful "current session"
  hint after change-password.
- **Optimistic updates** — both mutations write through to cache on
  success only. The endpoints are slow only in pathological cases; an
  optimistic write would conflict with the cleanup-cron-style
  invariants admins care about (`updatedAt` is authoritative).
