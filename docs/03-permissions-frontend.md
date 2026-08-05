# 03 — Доступ дар frontend

## Қоидаи асосӣ

**Backend сарчашмаи ҳақиқат аст.** `GET /auth/me` рӯйхати тайёри
`permissions[]`-ро медиҳад, ки backend аллакай бо формулаи
«ролҳо ∪ иҷозат − манъ» ҳисоб кардааст.

Frontend он мантиқро **такрор намекунад**. Танҳо `includes()`.

Ҳар чизе ки дар frontend пинҳон мешавад, дар backend ҳам бояд
манъ бошад. Пинҳон кардани тугма — қулайии интерфейс, на ҳимоя.

## `useCan`

```ts
const { can } = useCan();

can("tasks.assign")                      // як permission
can(["inbox.reply", "inbox.close"])      // OR
canAll(["tasks.edit", "tasks.move"])     // AND
```

Манбаъ — `useAuthStore().permissions`. Роли `owner` дар backend
bypass дорад; дар frontend `/auth/me` ба Owner ҳамаи калидҳоро
бармегардонад, пас коди махсус лозим нест.

## Ҳимояи роут

```ts
// app/config/permissions.ts
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/users":         "users.view",
  "/users/create":  "users.manage",
  "/users/:id":     "users.view",
  "/roles":         "roles.view",
  "/projects":      "projects.view",
  "/projects/:id":  "tasks.view",
  "/inbox":         "inbox.view",
  "/inbox/board":   "inbox.view",
  "/settings":      "templates.manage",
};
```

### ⚠️ Роути номаълум = МАНЪ

```ts
export function canAccessRoute(pathname: string, permissions: string[]) {
  const match = longestMatch(pathname, Object.keys(ROUTE_PERMISSIONS));
  if (!match) return false;          // ← баръакси Nizom
  return permissions.includes(ROUTE_PERMISSIONS[match]);
}
```

Дар Nizom ин `return true` буд ва `/centers/create`-ро ба ҳама
кушод. Роути нав илова кардӣ — калидашро ҳам илова кун, вагарна
худат ба он дохил намешавӣ ва фавран мефаҳмӣ.

Санҷиш дар `clientLoader`-и `(app)/layout.tsx` — **як ҷо** барои
тамоми дарахт.

## Пинҳон кардани элемент

```tsx
{can("tasks.assign") && <AssignButton />}
```

Дар sidebar: `navigation.ts` ҳар пунктро бо `permission` нишон медиҳад
ва рӯйхат филтр мешавад.

## Тағйири доступ дар мобайни кор

Backend ҳангоми тағйири роль `permissions_version`-ро +1 мекунад ва
refresh token-ҳоро revoke мекунад. Натиҷа: request-и оянда 401 мегирад,
refresh ҳам 401 медиҳад → logout. Ин рафтори дуруст аст.

Баъди logout паёми фаҳмо: «Доступи шумо тағйир ёфт, аз нав дароед.»

## Тестҳои ҳатмӣ

- `canAccessRoute` — роути номаълум → `false`
- `canAccessRoute` — permission ҳаст / нест
- `useCan` — як калид, массив (OR), `canAll` (AND)
