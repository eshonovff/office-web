# 01 — Архитектура

## Сохтори папкаҳо

```
office-web/
  app/
    root.tsx
    routes.ts                  # роутҳо дастӣ, на fs-routing
    entry.client.tsx

    routes/
      (auth)/login/route.tsx
      (app)/
        layout.tsx             # requireAuth — ЯК guard барои ҳама
        dashboard/route.tsx
        users/                 # route.tsx, id/, create/, components/, store.ts
        roles/
        projects/              # route.tsx, id/ (board), configs/
        inbox/                 # route.tsx (chat), board/route.tsx (kanban)
        settings/

    components/
      ui/                      # base-ui primitives (аз Nizom)
      shared/                  # DataTable, Modal, ConfirmDialog... (аз Nizom)
      layout/                  # Sidebar, Header, Panel
      board/                   # ⚡ НАВ — Kanban: BoardColumn, TaskCard, DragOverlay
      inbox/                   # ⚡ НАВ — ChatList, MessageThread, Composer

    api/                       # як файл барои як домен
    types/
    validations/               # Zod factory-ҳо
    hooks/                     # useCan, useForm, useDataTable, useSignalR
    store/                     # createTableStore, createModalStore, useAuthStore
    config/                    # permissions.ts, navigation.ts, enumOptions.ts
    lib/                       # client.ts, auth.ts, signalr.ts, position.ts, utils.ts
    styles/global.css
```

## Қабатҳо

```
routes/**            → саҳифа + orchestration (useQuery/useMutation ин ҷо)
components/**        → презентатсия
api/*.ts             → Axios wrapper, як файл барои як домен
lib/client.ts        → як instance, interceptor-ҳо
lib/signalr.ts       → ⚡ як connection, event → queryClient
```

Қабати «domain/service» нест — API-ро мустақим аз route даъват кун.
Ин ҳамон намунаи Nizom аст ва барои ин ҳаҷм дуруст мемонад.

## Чор қабати state

Дар Nizom се то буд. Ин ҷо чорум илова мешавад.

1. **Server cache** — TanStack Query. `staleTime: 60_000` глобалӣ,
   `placeholderData: keepPreviousData`. Рӯйхатҳо `isFetching`-ро
   ба `DataTable` мефиристанд.
2. **Table/list UI** — `createTableStore()` дар `store.ts`-и роут.
   Ҳеҷ гоҳ мустақим дар саҳифа import накун.
3. **Modal** — `createModalStore<T>(keys)`, як `onAction(action)`
   бо discriminated union, на чанд prop.
4. **⚡ Auth** — `useAuthStore` (zustand, **бе persist**):
   `accessToken`, `user`, `permissions[]`, `roles[]`.
   Access token 15-дақиқаӣ аст — дар хотира мемонад, на дар cookie.

## Package-ҳои иҷозатдодашуда

Ҳамаи он чи дар Nizom `package.json` ҳаст, ғайр аз:
`i18next-fs-backend`, `remix-i18next` (SSR-и Nizom-ро хизмат мекарданд),
`radix-ui` (истифода намешавад).

Иловаҳои нав:
```
@dnd-kit/core  @dnd-kit/sortable  @dnd-kit/utilities
@microsoft/signalr
vitest + @testing-library/react     (Nizom тест надошт — ин ҷо дорад)
eslint + typescript-eslint          (Nizom надошт)
```

Package-и дигар — аввал пурс.

## Сарҳадҳо

- Танҳо `lib/client.ts` бо backend гап мезанад. `fetch` мустақим нест
- SignalR танҳо як connection дар тамоми барнома
- `VITE_API_URL` ягона env var
