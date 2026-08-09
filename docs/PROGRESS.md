# PROGRESS — Frontend

**Фазаи ҷорӣ:** `fe-phase-3-board`
**Ветка:** `feat/fe-phase-3-board`
**Сана:** 2026-08-06

| Фаза | Ном | Ҳолат |
|---|---|---|
| 0 | Setup ва UI kit | ✅ |
| 1 | Auth ва shell | ✅ |
| 2 | Кормандон ва ролҳо | ✅ |
| 3 | Проект ва Kanban | 🟡 |
| 4 | Realtime | ⬜ |
| 5 | Инбокс | ⬜ |
| 6 | Сайқал ва deploy | ⬜ |

⬜ нашуда · 🟡 дар кор · ✅ тамом · ⛔ басташуда

## Қарорҳои қабулшуда

| Сана | Қарор | Сабаб |
|---|---|---|
| — | React Router v7 SPA, на Next.js | тамоми барнома паси login, SSR/SEO фоида надорад |
| — | Асос аз Nizom CRM | UI kit ва намунаҳо тайёр |
| — | ~~Танҳо забони тоҷикӣ~~ (бекоршуда, ниг. 2026-08-06) | проекти дохилӣ, 5–10 корманд |
| — | Access token дар хотира, на cookie | 15-дақиқаӣ, refresh дар httpOnly cookie |
| — | Роути номаълум = **манъ** | баръакси Nizom, ки хатои амниятӣ дошт |
| — | `layout/` (Sidebar, Header, NavMain, UserNav) ва `shared/CommandPalette` дар фазаи 0 кӯчонида намешаванд | ба auth ва permission вобастаанд |
| 2026-08-06 | Dev server (Vite) ба портти `3000` танзим шуд, на `5173`/`5174`-и пешфарз | `office-api`-и Program.cs CORS-ро танҳо барои `http://localhost:3000` кушодааст |
| 2026-08-06 | `HydrateFallback` (Splash) ба `root.tsx` кӯчид, на `(app)/layout.tsx` | SPA mode (`ssr:false`) ин exportро танҳо дар root роут иҷозат медиҳад |
| 2026-08-06 | `config/permissions.ts`-и frontend permission key-ҳоро аз `Office.Api/Auth/Permissions.cs` дастӣ такрор мекунад | backend сарчашмаи ҳақиқат аст; ҳангоми тағйир додани яке, дигареро ҳам нав кунед |
| 2026-08-06 | Фазаи 2 бо `npm run typecheck`, `npm run test`, `npm run build` санҷида шуд | users/roles UI, permission guard ва refresh queue бе хатои TypeScript/build/test гузаштанд |
| 2026-08-06 | i18n ба 2 забон (`tg`, `ru`) кушода шуд, `i18next-browser-languagedetector` фаъол карда шуд (интихоб дар `localStorage` нигоҳ дошта мешавад) | дархости корбар — тарҷумаи русиро дастӣ иҷро кард Claude, бояд бо гӯяндаи забони русӣ санҷида шавад |
| 2026-08-06 | `kitchen-sink` роут танҳо дар `import.meta.env.DEV` сабт мешавад | пеш дар prod бандл дастрас буд, hardcoded/омехта матн дошт |
| 2026-08-06 | `fmtTJS` акнун бо забони ҷории i18n (`tg-TJ`/`ru-RU`) кор мекунад, на сахт-код `ru-RU` | номунтазамӣ бо забони интихобшуда |
| 2026-08-06 | `client.ts`: хатогии тарҷумашуда акнун аз хатогии хоми backend бартарӣ дорад | пеш паёми backend (одатан бе тарҷума) паёми тарҷумашударо руи корбар мепӯшонд |
| 2026-08-06 | `chore/breadcrumbs`: breadcrumb дар header-и `(app)/` илова шуд (`app/config/breadcrumbs.ts` + `useBreadcrumbTrail`), `LanguageSwitcher` аз поёни Sidebar бардошта шуд | навигатсияи корбар возеҳ шавад; switcher дар Header кофӣ буд |
| 2026-08-06 | `feat/users-sms-login`: сохтан/таҳрири корманд ба phone+SMS login, аватар ва ҳуҷҷати шартнома гузашт | office-api-и users endpoint-ро нав кард |
| 2026-08-06 | Ҳарду бранч ба `dev` merge ва push шуданд, typecheck/test/build тоза | пеш аз оғози Фазаи 3 |
| 2026-08-08 | Фазаи 3 (3.1–3.13, 3.15–3.22) дар `feat/fe-phase-3-board` тамом: types/API, `/projects` (CRUD, аъзоён), `/projects/:id` (board, drag&drop, assign-ба-аватар, идораи колонка), модали таск (таҳрир, тег, коммент+@mention, файл, таърих, филтр), permission-gate. 40 тест, typecheck/lint/build тоза, ҳама эндпойнт бо curl ба backend-и воқеӣ санҷида шуд | 10 commit, 2 хатои backend ёфта ва ҳуҷҷатнок карда шуд (#4, #5) |
| 2026-08-08 | 3.14 (шумораи коммент дар карточка) иҷро нашуд | `GET /projects/{id}/board` `commentCount`/`attachmentCount` намедиҳад — бе N+1 фетч имконнопазир |

## Масъалаҳои кушода

| # | Масъала | Масъул |
|---|---|---|
| 1 | Backend фазаи 3 (SignalR) тамом шуд? | Faridun |
| 2 | `office-api` CORS origin (`http://localhost:3000`) сахт-кодшуда дар `Program.cs`, на аз `appsettings`. Ҳоло frontend дар портти 3000 кор мекунад, вале ин ноустувор аст — ҳар вақт порт банд шавад, дасти дигар лозим мешавад | Faridun |
| 3 | Тарҷумаи русии `public/locales/ru/*.json` аз ҷониби AI иҷро шудааст (на аз гӯяндаи забони русӣ) — то ба prod баровардан бояд аз назар гузаронида шавад | Faridun |
| 4 | ⛔ **Хатои `PATCH /api/tasks/{id}/move`** — гузоштани таск ба сар/охири колонка (яктои `beforeTaskId`/`afterTaskId` `null`) дар backend хато мекунад: `TasksEndpoints.cs`-и `MoveAsync` ду майдонро иваз (swap) кардааст. Санҷидашуда бо curl (2026-08-07). Сабаб, такрористеҳсол ва ислоҳи тавсияшуда: `office-api/docs/bug-move-task-position-swap.md`. Frontend (`app/lib/position.ts`) семантикаи дурустро татбиқ кардааст — интизори ислоҳи backend. | Faridun / backend team |
| 5 | ⛔ **`POST/PATCH /api/tasks` бо `dueDate: "YYYY-MM-DD"` (бидуни вақт) → 500** — `DateTimeOffset?`-и backend санаи бидуни офсет/вақтро парс карда наметавонад ва ба ҷои 400 ба 500 меафтад. Санҷидашуда бо curl (2026-08-08). Тафсил: `office-api/docs/bug-task-duedate-date-only.md`. Frontend (`TaskDetailModal.tsx`) муваққатан пеш аз фиристодан ба `"...T00:00:00.000Z"` табдил медиҳад (бо concatenation-и сатр, на `Date`/timezone, то санаро барои корбарони UTC+5 ба қафо набарорад) — вале ин фикс дар як ҷо аст, ҷойҳои дигаре ки санаи бидуни вақт мефиристанд метавонанд ба ҳамин хато дучор шаванд. | Faridun / backend team |
| 6 | ⚠️ **`GET /channels/{id}/whatsapp-templates` бо `channels.manage` баста шудааст** — вале нақшҳои сабтшудаи `Operator`/`Manager` (`DbSeeder.cs`) ин иҷозатро надоранд, танҳо `Owner`/`Admin`. Яъне вақте тирезаи 24-соата баста шавад, худи операторе ки бояд шаблон фиристад, наметавонад рӯйхати шаблонҳоро бинад — бояд ба админ муроҷиат кунад. Эҳтимол ин эндпойнт бояд бо `inbox.reply` кушода шавад, на `channels.manage`. Frontend (`Composer.tsx`) ҳозир `can(channels.manage)`-ро санҷида, барои корбарони бе он паёми фаҳмо нишон медиҳад (на 403 хом) | Faridun / backend team |
