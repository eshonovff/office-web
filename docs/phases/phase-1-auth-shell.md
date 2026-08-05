# Фазаи 1 — Auth ва shell

**Ҳадаф:** даромадан, refresh-и хомӯшона, ҳимояи роут, sidebar.
**Пешшарт:** Фазаи 0 ✅ · backend фазаи 1 ✅
**Тахмин:** 4 рӯз.
**Ҳатман хон:** `docs/03-permissions-frontend.md`, `docs/04-api-contract.md`, `docs/05-from-nizom.md`

## Дарун
Axios бо refresh, auth store, `useCan`, guard, layout, login, change-password.

## Берун
Саҳифаҳои кормандон, проект, инбокс.

## Вазифаҳо

### HTTP ва auth ⚠️ ҷои муҳимтарин
- [ ] 1.1 `lib/client.ts` — instance, `withCredentials: true`
- [ ] 1.2 Request interceptor: токен аз `useAuthStore`, **на аз cookie**
- [ ] 1.3 Response interceptor — хатогиҳо ва toast (аз Nizom, `SILENT_URLS` мемонад)
- [ ] 1.4 **Навбати refresh:** 401 → агар refresh давида истода бошад,
      request дар навбат истад; вагарна як refresh сар шавад.
      Баъди муваффақият ҳамаи request-ҳои навбат бо токени нав такрор шаванд
- [ ] 1.5 Агар refresh 401 диҳад → `logout()` + `/login` + тоза кардани QueryClient
- [ ] 1.6 **Тест:** 5 request-и ҳамзамон бо 401 → танҳо як даъвати `/auth/refresh`
- [ ] 1.7 `store/useAuthStore.ts` — `accessToken`, `user`, `roles`, `permissions`. **Бе `persist`**

### Доступ
- [ ] 1.8 `config/permissions.ts` — `Record<path, PermissionKey>`
- [ ] 1.9 `canAccessRoute` — **роути номаълум → `false`**
- [ ] 1.10 `hooks/useCan.ts` — `can(key)`, `can([keys])` OR, `canAll([keys])` AND
- [ ] 1.11 **Тестҳо:** роути номаълум, permission ҳаст/нест, OR, AND

### Роут ва shell
- [ ] 1.12 `routes.ts` — дастӣ, `(auth)` ва `(app)`
- [ ] 1.13 `(app)/layout.tsx` `clientLoader` — `/auth/me`, ҳифзи як ҷоя
- [ ] 1.14 `mustChangePassword: true` → маҷбуран `/change-password`
- [ ] 1.15 `HydrateFallback` — `<Splash>` то боркунӣ
- [ ] 1.16 Sidebar аз `config/navigation.ts`, филтр бо `permission`
- [ ] 1.17 Header: ном, аватар, ModeToggle, logout
- [ ] 1.18 `ErrorBoundary` — 404 ва хатои умумӣ

### Саҳифаҳо
- [ ] 1.19 `/login` — форма, Zod, хатои inline (бе toast)
- [ ] 1.20 `/change-password`
- [ ] 1.21 `/` dashboard — ҳозир холӣ, танҳо салом ва ном
- [ ] 1.22 Саҳифаи `403` — «доступ надоред»

## Definition of Done
- Login → dashboard, sidebar танҳо пунктҳои иҷозатдодашударо нишон медиҳад
- Баъди 15 дақиқа request худаш кор мекунад (refresh хомӯшона)
- Дар DevTools: 5 request-и якҷоя баъди тамом шудани токен → як `/auth/refresh`
- Роути беиҷозат бо URL-и мустақим → редирект
- Роути дар `ROUTE_PERMISSIONS` набуда → редирект (на кушода)
- Owner ҳамаро мебинад
- `npm run test` сабз
