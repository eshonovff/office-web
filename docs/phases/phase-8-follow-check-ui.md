# Фазаи 8 — UI-и тасдиқи обуна (V2, ба Фазаи 11-и backend мувофиқ)

**Ҳадаф:** дар `RuleFormModal` имкони фаъол кардани шарти "танҳо барои
обунашудагон" ва танзими ду шохаи ҷавоб, ва dry-run бо санҷиши воқеии обуна.
**Пешшарт:** Фазаи 7 (автоматизатсияи коментарий, UI) ✅ — backend:
`office-api/docs/phases/phase-11-follow-check.md`.

> ✅ **2026-09-14: пурра иҷро шуд.** 491 тест сабз (16 нав),
> `typecheck`/`lint`/`build` тоза.

## Тағйирот

- `types/commentAutomation.ts`: `AutomationActionConfig` акнун
  `{onMatch, onNotFollowing}` (буд: майдонҳои ҳамвор) — тағйироти
  шикананда, ҳамоҳанг бо backend-и Фазаи 11.
- `validations/commentAutomationRule.ts`: майдонҳои нав `requiresFollow`,
  `notFollowingCommentReplies`, `notFollowingDmText` — ҳатмӣ танҳо вақте
  `requiresFollow=true` (ҳамон намуди санҷиши `commentReplies`/`dmText`).
- `RuleFormModal.tsx`: бахши нави "Шарт" (checkbox), блоки дуюми ҷавоб
  (бе тугма — тибқи спека), лейбли блоки якум иваз мешавад ба "Ҷавоб барои
  обунашудагон" вақте фаъол аст. Компоненти нави дохилии `ReplyListField`
  (рӯйхати такрории матн) — истифода ҳам барои `commentReplies`, ҳам
  `notFollowingCommentReplies`, то мантиқи такрорӣ ду ҷо нусхабардорӣ нашавад.
- `DryRunPanel.tsx`: майдони нави ихтиёрии "Instagram user ID" (танҳо
  вақте `requiresFollow` фаъол аст намоён) — dry-run бо ин ID follow-check-и
  ВОҚЕӢ мекунад (хонданӣ, кэшдор — ниг. ҳуҷҷати backend), натиҷаи шохаро
  нишон медиҳад.

## Тестҳо

- `commentAutomationRule.test.ts`: +5 (requiresFollow ва ҳарду шохаи он).
- `DryRunPanel.test.tsx`: +5 (майдони actorId, натиҷаи follow-check,
  паёми "санҷида нашуд" вақте ID дода нашудааст).
- `commentAutomation.test.ts`, `route.test.tsx`: шакли нави
  `AutomationActionConfig` дар mock-ҳо нав карда шуд.

## Definition of Done

- ✅ `npm run typecheck` — 0 хато
- ✅ `npm run test` — 491/491 сабз
- ✅ `npm run lint` — 0 хато (0 огоҳии нав)
- ✅ `npm run build` — муваффақ
- ✅ Checkbox "Танҳо барои обунашудагон" бо огоҳии тавзеҳдиҳанда
- ✅ Блоки дуюми ҷавоб танҳо вақте фаъол аст намоён, бе майдони тугма
- ✅ Dry-run бо ID-и воқеӣ натиҷаи воқеии follow-check-ро нишон медиҳад
