# Фазаи 4 — Realtime

**Ҳадаф:** тағйирот дар браузерҳои дигар фавран намоён шавад.
**Пешшарт:** Фазаи 3 ✅ · backend фазаи 3 ✅
**Тахмин:** 3 рӯз.

## Вазифаҳо

- [ ] 4.1 `lib/signalr.ts` — як connection, `withAutomaticReconnect`
- [ ] 4.2 Токен тавассути `accessTokenFactory` (аз `useAuthStore`)
- [ ] 4.3 Пайвастшавӣ баъди auth, қатъ ҳангоми logout
- [ ] 4.4 `hooks/useSignalR.ts` — обуна/бекоркунӣ дар `useEffect`
- [ ] 4.5 Board: воридшавӣ ба гурӯҳи `project:{id}` ҳангоми кушодани тахта
- [ ] 4.6 **Event → `setQueryData`, на `invalidateQueries`.**
      Вагарна ҳар паём як refetch месозад
- [ ] 4.7 Оштӣ бо optimistic: агар event-и `TaskMoved` барои ҳаракати
      худи ту ояд, дубора истифода нашавад (муқоиса бо `updatedAt` ё `actorId`)
- [ ] 4.8 Inbox hub — гурӯҳҳои `user:{id}` ва `channel:{id}`
- [ ] 4.9 Индикатори пайвастшавӣ дар header — сабз/зард/сурх
- [ ] 4.10 Ҳангоми reconnect — `invalidateQueries` як бор, то фарқияти
      вақти қатъшударо пур кунад
- [ ] 4.11 `GET /notifications` + badge дар header
- [ ] 4.12 Toast ҳангоми таъини таск ё `@mention`

## Definition of Done
- Ду браузер: кӯчонидан дар яке фавран дар дуюм намоён
- Ҳаракати худи ту дубора «намеҷаҳад»
- Интернетро хомӯш кун → индикатор сурх → боз васл кун → маълумот нав мешавад
- Logout → connection мебандад, дар DevTools дида мешавад
