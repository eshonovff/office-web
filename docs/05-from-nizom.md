# 05 — Чӣ аз Nizom бигирем, чиро не

> Пеш аз нусхабардории ҳар файл аз Nizom ин ҷадвалҳоро бубин.

## ✅ Бе тағйирот бигир

| Чиз | Ҷой |
|---|---|
| Ҳамаи `components/ui/*` | base-ui primitives, 28 файл |
| `DataTable`, `FilterSheet`, `Modal`, `ConfirmDialog`, `EmptyState`, `ByIdSkeleton`, `InfoItem`, `CustomSelect`, `CustomInput`, `DateInputField`, `UniversalImage`, `UserAvatar`, `CommandPalette` | `components/shared/` |
| `layout/` — Sidebar, Header, ModeToggle, NavMain | + bug-и `Panel` ислоҳ шавад |
| `styles/global.css` — токенҳои OKLCH, radius, shadow, animation | пурра |
| `lib/utils.ts` (`cn`), `lib/date.ts`, `lib/format.ts`, `lib/form-data.ts` | пурра |
| `store/useTableStore.ts`, `store/createModalStore.ts` | factory-ҳо |
| `hooks/useForm.ts`, `hooks/useDataTable.ts` | пурра |
| Намунаи `config/enumOptions.ts` (`Record<Enum, {label(t), className}>`) | сохтор, на мазмун |
| Намунаи Zod factory (`createXSchema(t)`), қоидаи `z.union([z.string(), z.number()])` | пурра |
| Ҷадвали «где что лежит» (§2.2-и PROJECT_CONTEXT) | пурра |
| Namunai саҳифаи рӯйхат ва create/edit | пурра |

## ⚠️ Бо тағйироти ҷиддӣ бигир

### `lib/client.ts` — аз нав навишта мешавад

| Nizom | Office |
|---|---|
| токен аз cookie дар ҳар request | токен аз `useAuthStore` (хотира) |
| 401 → `window.location.replace('/login')` | 401 → `/auth/refresh` → **такрори ҳамон request** |
| refresh нест | ротатсия, cookie httpOnly, `withCredentials: true` |

Навбат ҳатмист: агар 5 request якҷоя 401 гиранд, танҳо **як**
refresh равад, чорто интизор шаванд ва баъд такрор шаванд.
Агар refresh ҳам 401 диҳад — он гоҳ logout.

Interceptor-и хатогӣ ва `SILENT_URLS` — ҳамон тавр мемонад.

### `config/permissions.ts` — модели дигар

| Nizom | Office |
|---|---|
| `Record<path, Role[]>` | `Record<path, PermissionKey>` |
| як роли корбар | якчанд роль, вале месанҷем **permission**, на роль |
| роль → permission дар frontend ҳисоб мешавад | backend ҳисоб мекунад, `/auth/me` рӯйхат медиҳад |
| **роути номаълум → кушода** | **роути номаълум → манъ** |

Он инверсия ҳатмист. Дар Nizom он хатои амниятии воқеӣ шуд
(`/centers/create` ба ҳар Student кушода буд).

`useCan(permission)` мустақим `permissions.includes(key)`-ро месанҷад.
Мантиқи «роль ∪ иҷозат − манъ»-ро дар frontend **такрор накун** —
backend аллакай кардааст.

### `lib/auth-utils.ts`

`jwt-decode`-и клиентӣ лозим нест. Сарчашмаи ҳақиқат `GET /auth/me`.
Токенро парс накун — танҳо нигоҳ дор ва фирист.

## ❌ Нагир

| Чиз | Чаро |
|---|---|
| `centerId` ва ҳама чизи multi-tenant | як ширкат |
| `store/useFilterStore.ts` | коди мурда |
| се забон (`ru`/`en`/`tg`) | танҳо `tg`. Сохтори i18n мемонад, файлҳо як забон |
| `i18next-fs-backend`, `remix-i18next` | SSR-и Nizom-ро хизмат мекарданд |
| Филтр/саҳифа танҳо дар Zustand | барои **инбокс** URL лозим: `?conversationId=`, `?status=` — то линки чат фиристода шавад |
| «mutation → invalidate → refetch» барои Kanban | drag & drop **optimistic** бошад, вагарна карточка ҷаҳида бармегардад |
| Набудани тест/ESLint/CI | ин ҷо ҳастанд |

## Bug-ҳое ки ҳангоми кӯчонидан ислоҳ шаванд

1. **`Panel`** — `className` танҳо ба div-и дарунӣ мерасад, на ба
   контейнери берунӣ. Ҳарду ҷо `cn()` гузор.
2. **`text-[10px]` / `text-[11px]` / `text-[13px]`** — 50 ҷо дар Nizom.
   Ҳангоми кӯчонидан ба `text-2xs` иваз кун.
3. **Матни сахти русӣ** — login hero ва `new Error('...')`.
   Дар office ҳама тавассути `t()`.
4. **Empty state-и card grid** — `EmptyState`-ро истифода бар,
   на блоки дастнавис.
