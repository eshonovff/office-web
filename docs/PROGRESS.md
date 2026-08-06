# PROGRESS — Frontend

**Фазаи ҷорӣ:** `fe-phase-2-users` (тайёр барои пӯшидан)
**Ветка:** `feat/fe-phase-2-users`
**Сана:** 2026-08-06

| Фаза | Ном | Ҳолат |
|---|---|---|
| 0 | Setup ва UI kit | ✅ |
| 1 | Auth ва shell | ✅ |
| 2 | Кормандон ва ролҳо | ✅ |
| 3 | Проект ва Kanban | ⬜ |
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

## Масъалаҳои кушода

| # | Масъала | Масъул |
|---|---|---|
| 1 | Backend фазаи 3 (SignalR) тамом шуд? | Faridun |
| 2 | `office-api` CORS origin (`http://localhost:3000`) сахт-кодшуда дар `Program.cs`, на аз `appsettings`. Ҳоло frontend дар портти 3000 кор мекунад, вале ин ноустувор аст — ҳар вақт порт банд шавад, дасти дигар лозим мешавад | Faridun |
| 3 | Тарҷумаи русии `public/locales/ru/*.json` аз ҷониби AI иҷро шудааст (на аз гӯяндаи забони русӣ) — то ба prod баровардан бояд аз назар гузаронида шавад | Faridun |
