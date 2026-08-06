# PROGRESS — Frontend

**Фазаи ҷорӣ:** `fe-phase-2-users` (навбатӣ)
**Ветка:** `feat/fe-phase-1-auth-shell` пӯшида шуд, merge ба `dev` ва `main`, tag `fe-phase-1`
**Сана:** 2026-08-06

| Фаза | Ном | Ҳолат |
|---|---|---|
| 0 | Setup ва UI kit | ✅ |
| 1 | Auth ва shell | ✅ |
| 2 | Кормандон ва ролҳо | ⬜ |
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
| — | Танҳо забони тоҷикӣ | проекти дохилӣ, 5–10 корманд |
| — | Access token дар хотира, на cookie | 15-дақиқаӣ, refresh дар httpOnly cookie |
| — | Роути номаълум = **манъ** | баръакси Nizom, ки хатои амниятӣ дошт |
| — | `layout/` (Sidebar, Header, NavMain, UserNav) ва `shared/CommandPalette` дар фазаи 0 кӯчонида намешаванд | ба auth ва permission вобастаанд |
| 2026-08-06 | Dev server (Vite) ба портти `3000` танзим шуд, на `5173`/`5174`-и пешфарз | `office-api`-и Program.cs CORS-ро танҳо барои `http://localhost:3000` кушодааст |
| 2026-08-06 | `HydrateFallback` (Splash) ба `root.tsx` кӯчид, на `(app)/layout.tsx` | SPA mode (`ssr:false`) ин exportро танҳо дар root роут иҷозат медиҳад |
| 2026-08-06 | `config/permissions.ts`-и frontend permission key-ҳоро аз `Office.Api/Auth/Permissions.cs` дастӣ такрор мекунад | backend сарчашмаи ҳақиқат аст; ҳангоми тағйир додани яке, дигареро ҳам нав кунед |

## Масъалаҳои кушода

| # | Масъала | Масъул |
|---|---|---|
| 1 | Backend фазаи 3 (SignalR) тамом шуд? | Faridun |
| 2 | `office-api` CORS origin (`http://localhost:3000`) сахт-кодшуда дар `Program.cs`, на аз `appsettings`. Ҳоло frontend дар портти 3000 кор мекунад, вале ин ноустувор аст — ҳар вақт порт банд шавад, дасти дигар лозим мешавад | Faridun |
