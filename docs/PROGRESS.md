# PROGRESS — Frontend

## Ҳолати имрӯза (2026-08-18)

**Тамом:** Фазаи 0–4 (setup, auth, users/роли, projects+Kanban, inbox+realtime) — ҳама дар `dev`. Илова бар нақша: блоки 2-и коллаборатсияи инбокс (read-only composer+takeover, auto-claim, фиристодани таъхирӣ бо cancel/failure-reason, ёддошти дохилӣ, таърихи таъинот), responsive (mobile/tablet/desktop), `/channels` CRUD, notifications bell, Board realtime (`/hubs/board`) — ҳамаи ин низ дар `dev`. 214 тест, `tsc`/`build` тоза.

**Дар куҷо ҳастем:** байни Фазаи 4 ва Фазаи 5. Фазаи 5 (Сайқал ва deploy) расман сар нашудааст — корҳои болозикр дархости мустақими корбар буданд, беруназ нақшаи фазавӣ.

**Ду қадами навбатӣ:**
1. Dashboard-и воқеӣ (`/`) — ҳозир танҳо салом; `00-overview.md` "таскҳои ман, чатҳои ҷавобнадода" мехоҳад, вале backend ҳам чунин endpoint надорад — аввал бо backend ҳамоҳанг кардан лозим.
2. Фазаи 5: санҷиши accessibility/error-boundary, тайёр кардани build/deploy config-и frontend (ҳанӯз набудааст).

## Холигиҳо: backend ↔ frontend

**Backend дорад, frontend истифода намебарад:**
- `GET /privacy` — сиёсати махфиятро backend сабт кардааст (шояд барои Meta app review лозим), frontend ҳеҷ ҷо linked намекунад.

**Норасоии payload-и `/hubs/board` (санҷида ҳангоми пайваст кардани frontend, 2026-08-18):**
- `TaskUpdated` ду шакли гуногуни payload дорад: аз `PUT /tasks/{id}` — `TaskDetail`-и пурра; аз `POST /tasks/{id}/assign` — танҳо `{taskId, assigneeId}` (бе `assigneeName`). Frontend наметавонад ин дуро як хел patch кунад, бинобар ин ба ҷои cache-patch аниқ, оддӣ invalidate-и board мекунад (`useBoardRealtime.ts`) — коргар, вале барзиёд фетч мекунад.
- `CommentAdded` (`TaskCommentDto`, `Contracts.cs`) `taskId` надорад — frontend наметавонад муайян кунад коммент ба кадом таск тааллуқ дорад, бинобар ин танҳо ҳангоме invalidate мекунад, ки ҳамон лаҳза `TaskDetailModal` кушода бошад (тахмин, на далел).

**Frontend дорад, backend надорад:** ҳеҷ — ҳамаи `apiClient` call-ҳо (auth, users, roles, projects/columns/labels, tasks/comments/attachments/activity, channels, conversations/messages, notifications) ба endpoint-и воқеии backend мувофиқанд (санҷида бо муқоисаи мустақими ду репо, 2026-08-18).

---

**Фазаи ҷорӣ:** `fe-phase-5-polish-deploy` (ҳанӯз сар нашуда — дархостҳои беруназнақшавии зерин пеш аз он иҷро шуданд)
**Ветка:** `dev`
**Сана:** 2026-08-18

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
| 2026-08-12 | Бранчи `feat/fe-inbox-responsive` (аз `dev`): (а) R1–R9 — саҳифаи `/inbox` пурра responsive шуд (mobile як панел бо занҷири back-и history-based, tablet ду панел, desktop се — ҳозира), textarea-и composer акнун ҳадди 4/5/6 хат дорад (mobile/tablet/desktop) бо auto-resize-и мустақил аз браузер; (б) навори "Ответственный" ду бор аз нав сохта шуд, дар охир ба `GET /conversations/{id}/assignable-users` ва `GET /channels/{id}/assignable-users` (ҳарду `inbox.assign`) бо 3 дараҷаи иерархия ва кэши калидбандишудаи `channelId` расид; (в) саҳифаи `/channels` пурра CRUD гирифт — сохтан (бо auto-fill-и externalId аз phoneNumberId барои WhatsApp), таҳрир (credentials-и ихтиёрӣ, isActive), ғайрифаъол кардан (soft DELETE), тугмаи "Санҷиш"-и credentials (`whatsapp-templates`). 30+ тест илова шуд, `test/setup.ts` polyfill-ҳои `matchMedia`/`PointerEvent`-и глобалӣ гирифт | силсилаи дархостҳои пайдарпайи корбар, ҳар қадам бо backend-и зинда (аксар вақт аз нав bind-шуда, чун процесс кӯҳна буд) санҷида шуд |
| 2026-08-13 | Блоки 2-и инбокс (collaboration, аз backend-и office-api, 229 тест): read-only composer барои ғайри-таъиншуда + тугмаи "гирифтан" (`POST /takeover`), auto-claim дар аввалин ҷавоб (тестпиннинг — плагини мавҷуда аллакай кофӣ буд), фиристодани таъхирӣ бо lock кардан (Pending countdown + Cancel + FailureReason), toggle-и ёддошти дохилӣ дар composer. Азбаски ин кор дар аввал хато ба бранчи `feat/fe-inbox-responsive` рафта буд (ду кори бемасн дар як бранч), 4 коммит ҷудо ва ба бранчи нав `feat/fe-inbox-block-2` (аз `dev`-и кӯҳна) кӯчонида шуд | дархости корбар — ҳар кадоми ду кор бояд мустақил санҷида ва merge шаванд |
| 2026-08-13 | Таърихи таъинот (item 5): `GET /conversations/{id}/assignment-history` (саҳифабандишуда, аз нав ба кӯҳна, шакли `/messages`) дар `ContextPanel` нишон дода шуд — `AssignmentHistory.tsx`, ҳар сатр «аз кӣ → ба кӣ» + бейҷи сабаб (claim/takeover/reassign/auto-release) + вақти нисбӣ, бо тугмаи "Кӯҳнаро нишон додан". Ба ҳамон бранчи `feat/fe-inbox-block-2` илова шуд | дархости корбар — endpoint тайёр шуд |
| 2026-08-17 | `feat/fe-inbox-block-2` ва `feat/fe-inbox-responsive` ҳарду ба `dev` merge шуданд (бе PR, мустақим — воситаи `gh` то ҳол насб нест). `feat/fe-inbox-block-2` бе конфликт даромад; `feat/fe-inbox-responsive` дар 6 файл конфликт дод (`Composer.tsx`/`.test.tsx`, `app/api/conversations.ts`, `app/types/conversation.ts`, `app/test/setup.ts`, `docs/PROGRESS.md`) — ҳама дастӣ ҳал шуд, аз ҷумла ду ҷои дар масъалаи №9-и кӯҳна қайдшуда (тугмаи sendNote-и мобилӣ бо `breakpoint !== 'mobile'`, хатти `failureReason: null` дар `MessageThread.test.tsx`) бозгардонида шуданд. Баъд аз merge: 198 тест, `tsc --noEmit` ва `npm run build` тоза | посух ба дархости корбар «ҳарду-ро merge кун» |
| 2026-08-18 | `Board`-ро ба `/hubs/board` пайваст кард: `useBoardRealtime.ts` (пайвасти алоҳида ба ин пае, зеро `BoardHub.OnConnectedAsync` `projectId`-ро аз query string дар вақти пайваст мехонад — фарқ аз `useInboxHub`-и умумӣ, ки group-ҳоро баъд аз пайваст бо invoke ҳамроҳ мекунад). `TaskCreated`/`TaskMoved`/`TaskDeleted` бо cache-patch-и аниқ (`applyTaskMoved`/`upsertTaskInBoard`/`removeTaskFromBoard` дар `lib/position.ts`); `TaskUpdated`/`CommentAdded` бо invalidate (сабаб дар боло, "Норасоии payload"). 16 тест илова шуд (214 ҳамагӣ), `tsc`/`lint`/`build` тоза | се қадами навбатии қайдшуда — қадами 1 |

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
| 9 | ℹ️ `Channel.IsActive` дар ягон ҷои дигари backend санҷида намешавад — на дар webhook processing (`WebhookProcessor.cs`), на дар access control. Ғайрифаъол кардани канал (soft `DELETE`) танҳо badge-и "Неактивен"-ро дар `/channels` тағйир медиҳад; канал ҳанӯз паёмҳои воридотиро қабул мекунад ва ба ҳама корбарони дорои дастрасӣ намоён аст. Frontend (`ChannelsPage`) матни тасдиқи ғайрифаъолкуниро атайян эҳтиёткорона навишт (даъвои бардурӯғ накард). Агар маънои воқеии "ғайрифаъол" (боздоштани қабули паём/дастрасӣ) лозим бошад, backend бояд `IsActive`-ро дар ҳамин ҷойҳо санҷад | Faridun / backend team |
