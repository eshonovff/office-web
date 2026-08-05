# 02 — Конвенсияҳо

Аксарашон аз Nizom мераванд. Ин ҷо танҳо чизҳои муҳим ва фарқиятҳо.

## Ном

| Чиз | Услуб |
|---|---|
| Компонент ва файл | PascalCase — `TaskCard.tsx` |
| Hook | `use` + camelCase — `useCan.ts` |
| API модул | `<domain>Api` — `tasksApi` |
| Роут (саҳифа) | default export — `export default function UsersPage()` |
| Компоненти умумӣ | named export — `export function TaskCard()` |
| Ветка | `feat/fe-phase-N-name` |

## TypeScript

`strict: true`. `interface` барои props ва shape, `type` барои union ва
`z.infer`. `any` танҳо дар `onError: (error: any)`.

## Форма

Ҳамеша `~/hooks/useForm.ts`, на `useForm`-и хоми react-hook-form —
он ҳангоми иваз шудани забон хатогиҳоро аз нав тарҷума мекунад.

Майдони рақамӣ дар Zod: `z.union([z.string(), z.number()])`.
`<input type="number">` ҳамеша сатр медиҳад.

Тугмаи submit дар сарлавҳаи саҳифа, тавассути `form="id"`.

## Дизайн

- `cn()` барои ҳама class-и шартӣ
- `--success` / `--warning` / `--destructive` барои се семантикаи асосӣ
- Статусҳои домен (статуси чат, приоритети таск) → намунаи
  `config/enumOptions.ts`: `Record<Enum, { label(t), className }>`
- `text-2xs` (11px) хурдтарин андоза. `text-[10px]` нанавис
- Сана — танҳо тавассути `lib/date.ts` ё `lib/format.ts`
- `useTheme()` танҳо дар `ModeToggle`. Дар ҷои дигар `dark:`

## i18n

Ҳозир як забон — `tg`. Вале сохтор нигоҳ дошта мешавад:
`public/locales/tg/<ns>.json`, `useTranslation([ns, "common"])`.

Namespace-и нав сохтӣ → **ҳатман** ба `i18nConfig.ns` дар
`lib/i18n.ts` илова кун. Дар Nizom ин ду бор фаромӯш шуд.

Ҳеҷ матни ба корбар намоён дар код нест — на матни маркетингӣ,
на `new Error("...")` ки ба toast мерасад.

## Query

- Калид: `["domain", ...params]` — `["tasks", projectId, filters]`
- Mutation → `invalidateQueries({ queryKey: ["domain"] })`
- **Истисно: Kanban ва инбокс** — optimistic + `setQueryData`.
  `invalidate` дар drag & drop карточкаро мепарронад
- Рӯйхат → `isFetching`-ро ба `DataTable` фирист

## URL state

| Ҷой | Куҷо нигоҳ дошта шавад |
|---|---|
| Саҳифа, ҷустуҷӯ, филтри ҷадвал | Zustand (`createTableStore`) |
| **Инбокс: `conversationId`, `status`, `channelId`** | **URL** |
| **Проект: таски кушода** | **URL** — `?task=` |

Сабаб: линки чат ва таскро ба ҳамкор фиристодан лозим мешавад.
Ин фарқияти дидаву дониста аз Nizom аст.

## Тест

Vitest. Ҳатман барои:
- `canAccessRoute` ва `useCan`
- Ҳисоби `position` дар drag & drop
- Навбати refresh дар interceptor (як refresh барои чанд 401)

Барои компонентҳои визуалӣ тест ҳозир лозим нест.

## Commit

```
feat(board): add drag and drop with optimistic move
fix(auth): queue concurrent 401s into single refresh
chore(deps): add dnd-kit
docs(fe-phase-3): mark task 3.7 done
```
