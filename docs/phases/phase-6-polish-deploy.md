# Фазаи 6 — Сайқал ва deploy

**Ҳадаф:** проект дар `office.nizom.tj`, тайёр барои кори ҳаррӯза.
**Пешшарт:** Фазаи 5 ✅
**Тахмин:** 3 рӯз.

## Вазифаҳо

### Сайқал
- [ ] 6.1 Dashboard-и воқеӣ — таскҳои ман, чатҳои ҷавобнадодаи ман, deadline-и наздик
- [ ] 6.2 `CommandPalette` (`Cmd+K`) — саҳифаҳо, проектҳо, чатҳо
- [ ] 6.3 Ҳолати холӣ дар ҳама ҷо тавассути `EmptyState`
- [ ] 6.4 Скелет барои ҳар саҳифаи асосӣ
- [ ] 6.5 Мобилӣ: sidebar drawer, инбокс як сутун бо бозгашт.
      Kanban дар мобилӣ — рӯйхат бо интихоби колонка, на drag
- [ ] 6.6 Дастрасӣ: focus ring, `aria-label` барои тугмаҳои иконкӣ, tab order
- [ ] 6.7 Контрасти dark mode — ҷои заифи таърихии Nizom, ҳамаро як бор бубин
- [ ] 6.8 `grep` барои матни сахт — ҳама тавассути `t()`

### Deploy
- [ ] 6.9 `Dockerfile` multi-stage → `dist/`, ё танҳо build-и static
- [ ] 6.10 Nginx: `try_files $uri /index.html` барои SPA
- [ ] 6.11 `office.nizom.tj` — frontend дар реша, `/api` ва `/hubs` proxy ба backend
- [ ] 6.12 WebSocket proxy барои `/hubs` (`Upgrade`, `Connection`)
- [ ] 6.13 Cache: `index.html` бе cache, asset-ҳо бо hash — cache-и дароз
- [ ] 6.14 GitHub Actions: typecheck → lint → test → build → deploy
- [ ] 6.15 `VITE_API_URL` дар build-и production
- [ ] 6.16 Source map танҳо барои debug, на оммавӣ

## Definition of Done
- `https://office.nizom.tj` кушода мешавад
- Login → dashboard → Kanban → инбокс, ҳама кор мекунанд
- SignalR тавассути WSS
- Refresh-и саҳифа дар роути дарунӣ 404 намедиҳад
- Дар телефон истифодабарӣ имконпазир
- Push ба `main` → deploy автоматӣ
