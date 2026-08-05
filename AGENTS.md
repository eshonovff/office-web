# AGENTS.md — office.nizom.tj (Frontend)

> Ин файлро **ҳамеша аввал бихон**. Баъд `docs/PROGRESS.md`, баъд файли фазаи ҷорӣ.

## Проект чист

Frontend-и платформаи дохилии SMARTWEB TJ. Backend аллакай тайёр аст
(`office-api`, .NET 10). Ин SPA бо он API кор мекунад.

Чор вазифа:
1. Кормандон + доступи дақиқ
2. Проект ва таск бо drag & drop
3. Инбокси Instagram / Facebook / WhatsApp
4. Realtime — таск ва чат дар ҳама браузер фавран нав шаванд

## Ин дар проект НЕСТ

- Молия, маош, HR
- Telegram
- Multi-tenant / `centerId` — ин **як** ширкат аст
- SSR, SEO, server components — тамоми барнома паси login аст
- Мобилӣ

## Асос: Nizom CRM

Ин проект аз коди Nizom CRM (`PROJECT_CONTEXT.md`) мерос мегирад.
**Вале на ҳама чиз.** Пеш аз нусхабардории ҳар файл
`docs/05-from-nizom.md`-ро бихон — он ҷо се рӯйхат ҳаст:
бигир / бо тағйирот бигир / нагир.

Хатои маъмул: `client.ts`, `permissions.ts` ва `auth-utils.ts`-и
Nizom-ро рост нусхабардорӣ кардан. Ҳар сеи онҳо дар office
**тамоман дигар** мешаванд.

## Стек

| Қабат | Технология |
|---|---|
| Framework | React Router v7 (framework mode, `ssr: false`) |
| React | 19, TypeScript strict |
| Build | Vite 7 |
| CSS | Tailwind v4 (CSS-first, бе `tailwind.config.js`) |
| UI | shadcn-услуб дар `@base-ui/react` — **на Radix** |
| Server state | TanStack Query v5 |
| Table | TanStack Table v8 + Virtual |
| Client state | Zustand v5 (factory-ҳо) |
| Форма | react-hook-form + Zod v4 |
| Drag & drop | **dnd-kit** (нав, дар Nizom нест) |
| Realtime | **@microsoft/signalr** (нав) |
| HTTP | Axios |
| i18n | i18next — **танҳо `tg`** ҳозир |
| Icons | lucide-react · Toast: sonner · Theme: next-themes |

Path alias `~/` → `app/`

## Қоидаҳои кор

1. Як фаза — як ветка: `feat/fe-phase-N-name`
2. Пеш аз сар кардан `docs/PROGRESS.md`-ро хон
3. Танҳо вазифаҳои файли фазаи ҷорӣ. Ба фазаи оянда нагузар
4. Баъди ҳар вазифа checkbox-ро `[x]` кун
5. Ҳар фаза **Definition of Done** дорад
6. Package-и нав танҳо агар дар `01-architecture.md` бошад — вагарна пурс
7. `npm run typecheck` бояд ҳамеша тоза бошад
8. Матни ба корбар намоён — ҳамеша тавассути `t()`, ҳеҷ гоҳ дар код

## Тартиби пӯшидани фаза

Танҳо агар ҳар се шарт иҷро шуда бошад:
1. `npm run typecheck` тоза
2. `npm run build` бе хато
3. Definition of Done банд ба банд бо далели воқеӣ тасдиқ

Баъд: checkbox-ҳо → `PROGRESS.md` → commit → merge `--no-ff` ба `dev` →
санҷиши тоза → merge ба `main` → tag `fe-phase-N` → push → нест кардани
ветка → хулоса ба корбар.

Conflict шавад — худат ҳал накун, нишон деҳ.

## Забон

Код ва commit — англисӣ (Conventional Commits).
Матни хатогӣ ва интерфейс — тоҷикӣ, тавассути `t()`.
Комментарий — англисӣ (дар Nizom омехта буд, ин ҷо не).
