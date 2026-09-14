# Фазаи 7 — Instagram: автоматизатсияи коментарий (V1)

**Ҳадаф:** саҳифаи нав `/instagram-automation` — идораи қоидаҳои автоматизатсияи
коментарии Instagram (рӯйхат, форма, интихоби пост, санҷиши dry-run), бидуни
конструктори визуалӣ ва бе тасдиқи обуна (V1).
**Пешшарт:** Фазаи 6 (Каналҳо/`/channels`) ✅ — backend: `office-api`
`phase-10-instagram-automation.md`.

> ✅ **2026-09-14: пурра иҷро шуд.** 479 тест сабз, `typecheck`/`lint`/`build` тоза.

## Роут ва ҷои саҳифа

`/instagram-automation` — роути НАВ дар `routes.ts`, вале дар sidebar-и асосӣ илова
**НАШУД**. Сабаб: `/channels` худаш дар sidebar нест (танҳо тавассути тугма дар `/inbox`
ва deep-link аз dashboard дастрас аст) — ҳамин алгу нигоҳ дошта шуд: тугмаи нави
"Автоматизатсия" дар корти канали Instagram-и `/channels` (`ChannelsPage`), ки ба
`/instagram-automation?channel=<id>` мебарад. Агар якчанд канали Instagram-и фаъол вуҷуд
дошта бошад, саҳифа худаш `CustomSelect`-и интихоби канал нишон медиҳад.

## API ва validation

- `app/api/commentAutomation.ts` — `list/create/update/setActive/dryRun/listInstagramMedia`,
  ҳамон алгуи `channels.ts` (object literal, на класс).
- `app/validations/commentAutomationRule.ts` — Zod factory + `superRefine`
  (keywords ҳатмист агар `matchMode=keyword`, postIds ҳатмист агар `postScope=selected`,
  ҳадди ақал як `commentReply`). `cooldownMinutes` қасдан **сатр** нигоҳ дошта мешавад дар
  шакли форма (на `z.coerce.number()`) — `z.coerce` input/output type-ро дучанд мекунад ва
  `Resolver<T>`-и react-hook-form ҳамзамон бо ҳарду навъ мувофиқат карда наметавонист
  (`tsc` хато медод). Табдил ба адад дар `RuleFormModal.submit` дастӣ.

## Компонентҳои нав

- **`ChipInput`** (`app/components/shared/`) — на аз Combobox/CustomSelect-и мавҷуда
  (онҳо барои интихоб аз рӯйхати МАЪЛУМ сохта шудаанд, на матни озоди корбар). Enter/вергул
  — илова, Backspace дар майдони холӣ — нест кардани охирин, × — нест кардани ҳар кадом.
  6 тест (`ChipInput.test.tsx`).
- **`RuleFormModal`** — ном, `matchMode` (Select, бо огоҳии сурх ҳангоми "ҳамаи
  комментарийҳо"), `ChipInput`-и калимаҳо, `postScope` + тугмаи "Интихоби пост" →
  `MediaPickerModal`, рӯйхати такрории `commentReplies` (+ Илова/нест), `dmText`,
  `dmButtonUrl` (ихтиёрӣ), `cooldownMinutes`, ва `DryRunPanel` дар поён — ҳама дар як форма.
- **`MediaPickerModal`** — `useInfiniteQuery` (cursor аз backend), grid 3-сутуна, checkbox
  дар кунҷ, ду таб (Ҳама/Интихобшуда), "боз бор кун". Танҳо ҳангоми кушода будан mount
  мешавад (`{pickingMedia && <MediaPickerModal .../>}`) — вагарна `draftSelection`-и
  дарунии он аз `selectedIds`-и волидайн ҷудо мемонд (state як бор ҳисоб мешавад).
- **`DryRunPanel`** — textarea + тугмаи "Санҷиш", `useMutation` ба
  `POST .../automation-rules/dry-run` (stateless, ҳеҷ чиз намефиристад/захира намекунад —
  тасдиқшуда бо backend). Агар `postScope=selected`, аввалин пости интихобшуда (агар
  бошад) ҳамчун mediaId фиристода мешавад — то rule-и "постҳои интихобшуда" низ бе
  UI-и иловагии интихоби пост-барои-санҷиш dry-run шавад.

## i18n

Namespace-и нав `instagramAutomation` (`public/locales/tg/`, `ru/`) — илова шуд ба
`ns: []`-и `app/lib/i18n.ts`. Ду локали мавҷуда (tg/ru, `en` нест) — пуррагӣ санҷида шуд.

## Тестҳо

- `app/api/commentAutomation.test.ts` (6), `app/validations/commentAutomationRule.test.ts`
  (10), `ChipInput.test.tsx` (6), `DryRunPanel.test.tsx` (5), `route.test.tsx` (5) — рӯйхат
  бо Edit/Disable, ҳолати холӣ, интихоби канал аз `?channel=`.

## Он чи санҷида НАШУД дар ин сессия

UI дар браузери воқеӣ (Playwright/дастӣ) — берун аз доираи ин сессия (бе dev server-и
фронтенд+backend ҳамзамон боз). Backend-и пурра (webhook → Graph API-и воқеӣ) бо
аккаунти воқеӣ санҷида шуд (ниг. `office-api/docs/phases/phase-10-instagram-automation.md`),
вале форма/MediaPickerModal/DryRunPanel танҳо бо тестҳои `@testing-library/react` (mock API).

## Definition of Done

- ✅ `npm run typecheck` — 0 хато
- ✅ `npm run test` — 479/479 сабз (27 тести нав)
- ✅ `npm run lint` — 0 хато (0 огоҳии нав)
- ✅ `npm run build` — муваффақ
- ✅ Рӯйхати қоида бо ном/статус/шумораи иҷро/Edit/Disable
- ✅ Форма: ном, калимаҳо (chips), доираи пост, ҷавобҳо (+ илова), матни DM, cooldown
- ✅ Dry-run: ҳеҷ дархост намефиристад, натиҷаро нишон медиҳад
- ✅ Огоҳии возеҳ ҳангоми интихоби "ҳамаи комментарийҳо"
