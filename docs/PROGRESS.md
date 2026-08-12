# PROGRESS — Frontend

**Фазаи ҷорӣ:** `fe-phase-5-polish-deploy` (ҳанӯз сар нашуда)
**Ветка:** `dev`
**Сана:** 2026-08-11

| Фаза | Ном | Ҳолат |
|---|---|---|
| 0 | Setup ва UI kit | ✅ |
| 1 | Auth ва shell | ✅ |
| 2 | Кормандон ва ролҳо | ✅ |
| 3 | Проект ва Kanban | ✅ |
| 4 | Инбокс + Realtime (якҷоя) | ✅ |
| 5 | Сайқал ва deploy | ⬜ |

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
| 2026-08-08 | `feat/fe-phase-3-board` ба `dev` merge ва push шуд (бе GitHub PR — воситаи `gh` насб набуд) | typecheck/test/build дар `dev` тоза |
| 2026-08-09 | Фазаҳои 4 (Realtime)-и қаблӣ ва 5 (Инбокс)-и қаблӣ ба **як фаза** муттаҳид карда шуданд, бо рақами 4 | дархости корбар: "phase 4: the unified chat inbox" — backend-и воқеӣ содатар аз нақшаи қаблии `phase-5-inbox.md` буд (бе cursor pagination, бе virtualization, бе `/inbox/board`, бе ёддошти дохилӣ — ин хусусиятҳо дар backend вуҷуд надоранд), бинобар ин ба contract-и воқеӣ мутобиқ карда шуд, на ба ҳуҷҷати кӯҳна |
| 2026-08-09 | Фазаи 4 (Инбокс+Realtime) тамом: `lib/signalr.ts` + `createHubStore` (бо тест), се сутуни `/inbox` (рӯйхат бо филтр, thread, context panel), composer бо мантиқи `windowExpiresAt`/409 (бо 5 тест), drag-and-drop assign (аз Board такрор истифода), тағйири статус, `/channels` барои идораи аъзоён, realtime (message/status/read) тавассути `/hubs/inbox`. 49 тест, typecheck/lint/build тоза, ҳама эндпойнт ва SignalR бо backend-и воқеӣ санҷида шуданд (аз ҷумла webhook-и қалбакии имзошуда) | 9 commit, 2 масъалаи иҷозати backend ёфта шуд (#6, #7) |
| 2026-08-10/11 | `feat/fe-phase-4-inbox` бо кори иловагӣ (медиа: расм/видео/аудио/voice note, upload, waveform, StrictMode/realtime фиксҳо — боз 16 commit) пурра шуд ва ба `dev` merge ва push шуд | Фазаи 4 ✅ пӯшида шуд |
| 2026-08-11 | Дизайни audio/video-и дохили чат аз тегҳои native HTML (`<audio controls>`/`<video controls>`) ба плеерҳои дастӣ (мисли Telegram) иваз шуд: аудиои бе waveform акнун навори яклухт+номи файл дорад, видео thumbnail+тугмаи play дар марказ то пахш нашавад. Мустақим дар `dev` commit ва push шуд (на бранчи алоҳида, тағйироти хурди UI буд) | дархости корбар — дизайни native браузер ба стандарти барнома мувофиқ набуд |
| 2026-08-12 | Батчи ислоҳи frontend баъд аз backend fix batch (201 тест, merge ба `dev`-и office-api): бранчи `fix/fe-backend-sync-batch`. (1) `dueDate` акнун санаи оддӣ мефиристад (backend `DateOnly?` шуд, форматаи ISO-и кӯҳна 400 медиҳад — санҷида бо curl). (2) Auth bootstrap: hard refresh акнун аввал `/auth/refresh` мекунад, баъд `/auth/me` — 401-и ҳарвақтаи логи ҳатмӣ бартараф шуд, `refreshAccessToken()` акнун dedupe дорад. (3) `query-client.ts` retry policy: 400/401/403/404 retry намешавад, 5xx/шабака то 2 бор — toast-ҳо бо `id`-и URL якҷоя мешаванд (набояд стек шаванд). (4)+(5) Инбокс: badge-и "Онлайн" акнун ҳолати боркунии `/channels/mine`-ро ҳам ба назар мегирад (то боргирӣ хатм нашавад, "connected" нишон намедиҳад), тугмаи retry ҳангоми хато; `joinable` флаг аллакай дуруст истифода мешуд (танҳо TODO-и кӯҳна тоза шуд). (6) Тасдиқ шуд (curl ба backend-и зинда): Image/Video/Audio/File/retention-deleted ҳама дуруст кор мекунанд, масъалаи `/api/api/...` вуҷуд надорад, `normalizeReceivedMessage` аллакай нест — ҳеҷ тағйироти код лозим набуд. (7) Waveform UI (bars аз peaks, click/drag seek, як вақт як playback, fallback барои audio бе peaks, шакли waveform барои retention-deleted боқӣ мемонад бо playback хомӯш) — ҳамааш дар ҳамин сессия пештар (11-уми август, "Telegram-designed audio/video" талабот) сохта ва бо тест санҷида шуда буд, дар дарахти корӣ ҳеҷ тағйироти бе-commit набуд | дархости корбар, санҷидашуда бо backend-и воқеии аз нав bind-шуда (процесси кӯҳна пеш аз ин fix batch build шуда буд) |

## Масъалаҳои кушода

| # | Масъала | Масъул |
|---|---|---|
| 1 | Backend фазаи 3 (SignalR) тамом шуд? | Faridun |
| 2 | `office-api` CORS origin (`http://localhost:3000`) сахт-кодшуда дар `Program.cs`, на аз `appsettings`. Ҳоло frontend дар портти 3000 кор мекунад, вале ин ноустувор аст — ҳар вақт порт банд шавад, дасти дигар лозим мешавад | Faridun |
| 3 | Тарҷумаи русии `public/locales/ru/*.json` аз ҷониби AI иҷро шудааст (на аз гӯяндаи забони русӣ) — то ба prod баровардан бояд аз назар гузаронида шавад | Faridun |
| 4 | ⛔ **Хатои `PATCH /api/tasks/{id}/move`** — гузоштани таск ба сар/охири колонка (яктои `beforeTaskId`/`afterTaskId` `null`) дар backend хато мекунад: `TasksEndpoints.cs`-и `MoveAsync` ду майдонро иваз (swap) кардааст. Санҷидашуда бо curl (2026-08-07). Сабаб, такрористеҳсол ва ислоҳи тавсияшуда: `office-api/docs/bug-move-task-position-swap.md`. Frontend (`app/lib/position.ts`) семантикаи дурустро татбиқ кардааст — интизори ислоҳи backend. | Faridun / backend team |
| 5 | ⛔ **`POST/PATCH /api/tasks` бо `dueDate: "YYYY-MM-DD"` (бидуни вақт) → 500** — `DateTimeOffset?`-и backend санаи бидуни офсет/вақтро парс карда наметавонад ва ба ҷои 400 ба 500 меафтад. Санҷидашуда бо curl (2026-08-08). Тафсил: `office-api/docs/bug-task-duedate-date-only.md`. Frontend (`TaskDetailModal.tsx`) муваққатан пеш аз фиристодан ба `"...T00:00:00.000Z"` табдил медиҳад (бо concatenation-и сатр, на `Date`/timezone, то санаро барои корбарони UTC+5 ба қафо набарорад) — вале ин фикс дар як ҷо аст, ҷойҳои дигаре ки санаи бидуни вақт мефиристанд метавонанд ба ҳамин хато дучор шаванд. | Faridun / backend team |
| 6 | ✅ (2026-08-12, backend) **`GET /channels/{id}/whatsapp-templates`** акнун `inbox.reply` талаб мекунад, на `channels.manage` — санҷида бо хондани `ChannelsEndpoints.cs`. Frontend (`Composer.tsx`) ҳанӯз `can(channels.manage)`-ро месанҷад барои нишон додани шаблонҳо — ин акнун аз ҳад зиёд қатъӣ аст (бояд `inbox.reply` шавад), вале дархост нашудааст, дар ин сессия дигаргун карда нашуд | Faridun / frontend follow-up |
| 7 | ✅ (2026-08-12, бори сеюм) `GET /channels/{id}/assignable-users` (аъзо + Owner/Admin — гапи охирро ҷавоб дод) ва `GET /conversations/{id}/assignable-users` — ҳарду бо `inbox.assign`, тасдиқшуда бо curl (backend-и корбарӣ боз кӯҳна буд — аз нав bind шуд). Навори "Ответственный" (`route.tsx`-и inbox) 3 дараҷаи иерархия дорад (`getAssigneeOptions`): (1) чате кушода бошад — аъзоёни канали **ҳамон чат**; (2) чате кушода набошад, филтри канал интихоб шуда бошад — аъзоёни **ҳамон канал** аз `channels/{id}/assignable-users`; (3) на чат, на филтр ("Все каналы") — иттиҳоди **ҳамаи** каналҳои дастрас (`mergeChannelMembers`), бе такрор. Ҳама сеашон бо `['channels', channelId, 'assignable-users']` калидбандӣ шудаанд — иваз кардани филтр байни канали мушаххас ва "Все каналы" кэши якдигарро истифода мебарад, аз нав фетч намекунад. `PATCH .../assignedTo` бо корманди нодуруст 409 медиҳад бо сабаби фаҳмо (`client.ts`, аз 12-ум) | Faridun |
| 8 | ℹ️ `InboxHub.JoinChannel`-и SignalR ҳанӯз санҷиши узвияти воқеӣ надорад (шарҳи худи `InboxHub.cs`: "барои фазаи 6" — рақами кӯҳна). Ҳар корбари authenticated метавонад ба гурӯҳи ҳар канале обуна шавад. Хатари амниятӣ надорад (маълумот аллакай тавассути REST endpoint-ҳо бо `ChannelAccessGuard` муҳофизат мешавад — SignalR танҳо push мекунад), вале бояд пеш аз production ислоҳ шавад | Faridun / backend team |
