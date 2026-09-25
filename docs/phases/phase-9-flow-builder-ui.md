# Фазаи 9 — Flow Builder UI (canvas, ба Фазаи 12-и backend мувофиқ)

**Ҳадаф:** рӯйхати ягонаи "Автоматизатсияҳо" (қоидаи оддӣ + flow) ва
конструктори визуалии canvas барои сохтани flow — паём/шарт/амал/қайд,
autosave, undo/redo, шаблонҳо, омор.
**Пешшарт:** Фазаи 7/8 (автоматизатсияи коментарий, UI) ✅ — backend:
`office-api/docs/phases/phase-12-flow-builder.md`.

> ✅ **2026-09-15: пурра иҷро шуд.** 519 тест сабз (26 нав),
> `typecheck`/`lint`/`build` тоза. Санҷиши воқеии browser (drag/autosave-и
> зинда) НАШУДААСТ — дар муҳити ин сессия абзори browser набуд, ниг.
> "Чӣ санҷида нашуд" дар поён.

## Тағйирот

- **Роутинг**: `/instagram-automation` ба `/automations` иваз шуд
  (redirect-и кӯҳна нигоҳ дошта шуд — `instagram-automation/redirect.tsx`,
  бо `clientLoader`+`redirect`, мутобиқи алгуи `root-redirect.tsx`).
  `/automations/flows/:id` (canvas) илова шуд. `permissions.ts` навсозӣ
  шуд, тугмаи "Автоматизатсия"-и `channels/route.tsx` ба роҳи нав ишора
  мекунад.
- **API/типҳо**: `api/flows.ts`, `api/automations.ts`,
  `api/flowTemplates.ts` (алгуи `commentAutomation.ts`), `types/flow.ts`
  (айнан мутобиқи `Office.Api/Features/Flows/Contracts.cs` ва
  `Channels/Flows/FlowConfigs.cs`), `types/automation.ts`.
- **`app/lib/flowGraph.ts`** (pure, нақши `position.ts`): табдили
  `FlowDetail` ↔ шакли `@xyflow/react` (`fromFlowDetail`,
  `nodeDtoToCanvasNode`, `edgeDtoToCanvasEdge`), `toGraphRequest`
  (баръакс, барои autosave), `getOutputPorts` (портҳои ҳар навъи нод —
  паём: `default` ё `button:N` барои ҳар тугма; шарт: `match`/`nomatch`;
  амал: `default`, ба ғайр аз `goto_flow` — терминалӣ, бе порт, чунки
  `FlowEngine` барои он ҳамеша `EndSession` бармегардонад), `canConnect`
  (як edge барои ҳар порт), `defaultConfigForType`.
- **`TriggerConfigFields.tsx`-и нав** (`components/shared/`): қисми
  matchMode/keywords/postScope/postIds аз `RuleFormModal.tsx` ҷудо шуд —
  компоненти "soqit" бо value/onChange-и оддӣ (на react-hook-form
  Control-и генерикӣ, то аз мураккабии типи RHF-и ду шакли форма-и гуногун
  халос шавад). Ҳам `RuleFormModal` (бе тағйири рафтор), ҳам
  `TemplatePickerModal`/`FlowSettingsModal`-и нав онро истифода мебаранд.
- **`/automations`** (`route.tsx`): грид аз `GET /api/automations`
  (ду навъ якҷоя), ду карточкаи вуруд ("Калимаи калидӣ" → `RuleFormModal`,
  "Конструктор" → `TemplatePickerModal`), ҷустуҷӯ/сорт. Барои таҳрири
  rule-и `simple`, `commentAutomationApi.list` (пурра, бо triggerConfig)
  ҳамоно алоҳида фетч мешавад — `GET /automations` танҳо майдонҳои
  хулосавӣ медиҳад, барои таҳрир кофӣ нест.
- **Canvas** (`automations/flows/id/route.tsx` + `components/`):
  `@xyflow/react` (нави, `npm install`). `useNodesState`/`useEdgesState`
  худи xyflow (на react-query cache) — гидратсия як бор аз `GET
  /flows/{id}` тавассути `useEffect` (калидбандӣ бо `hydratedForFlowId`
  ref, то refetch-и фон нодҳои дар ҳоли таҳрирро пахш накунад).
  - `NodeShell.tsx`: пӯсти умумии 4 навъи нод (target handle дар чап,
    як source handle барои ҳар порт дар рост — ҳар сатр `position:relative`
    дорад, то Handle-и xyflow (position:absolute) дар доираи ҳамон сатр
    ҷойгир шавад, на дар маркази тамоми нод).
  - `MessageNodeCard`/`ConditionNodeCard`/`ActionNodeCard`/`NoteNodeCard`
    — хулосаи визуалӣ + портҳо (аз `getOutputPorts`).
  - `NodeSettingsPanel.tsx` (dispatcher, алгуи `FilterField.tsx`) →
    `MessageNodePanel`/`ConditionNodePanel`/`ActionNodePanel`/`NotePanel`
    — `<aside>`-и доимии рост, на `Sheet` (Sheet бо клики берун баста
    мешавад, рафтори муқаррарии кашидани edge-ро вайрон мекард).
  - `ConditionNodePanel`: field-и "custom" (номи тағйирёбанда мустақим
    ҳамчун `rule.field`, мутобиқи backend-и `ConditionEvaluator` — ягон
    майдони алоҳидаи "кадом тағйирёбанда" нест), op-ҳои вобаста ба field
    (subscription — бе op/value, tags — has/not_has, time/date —
    before/after, weekday — рӯзҳои англисӣ бо лейбли тарҷумашуда, чунки
    backend `DayOfWeek.ToString()`-ро мефиристад).
  - `NodePalette.tsx`: 4 тугма барои иловаи нод.
  - **Autosave**: `useDebounce`-и мавҷуда бар рӯи як "dirty tick"-и
    counter (на бевосита nodes/edges — то дар давоми drag ҳар фрейм save
    нашавад, танҳо дар анҷоми амали алоҳида) → `PUT /flows/{id}/graph`.
    **Қасдан на алгуи Kanban** (`useMoveTask`/`position.ts`-и
    snapshot+rollback): он барои cache-и умумии react-query лозим буд;
    canvas ҳолати канониро дар худи xyflow нигоҳ медорад (setNodes аллакай
    "оптимистӣ" аст), ва танҳо як намоиш онро мехонад.
  - **Undo/redo**: `automations/flows/id/store.ts` — store-и хурди
    co-located (алгуи `inbox/store.ts`), стеки `past`/`future`-и
    snapshot-ҳои пурраи graph, push дар амалҳои алоҳида (илова/нест/
    пайваст/анҷоми drag/сабти танзимот). Ctrl/Cmd+Z дар канваси саҳифа
    (бо санҷиши `isEditableElement` — то дар дохили textarea/input
    Ctrl+Z-и муқаррарии матн нашиканад). `deleteKeyCode={null}` дар
    `<ReactFlow>` — Delete/Backspace-ро худи route идора мекунад, то
    пеш аз нест кардан history push шавад.
  - `FlowSettingsModal.tsx` (ном/триггер, `TriggerConfigFields`),
    `FlowStatsPopover.tsx` (аз `GET /flows/{id}/stats`).
- **`TemplatePickerModal.tsx`**: `GET /flow-templates` + "аз сифр" →
  `POST .../from-template/{id}` ё `POST .../flows`.

## Тағйироти хурди backend (дар доираи ҳамин кор)

`FlowListItem`/`FlowDetail` (`Office.Api/Features/Flows/Contracts.cs`)
акнун `ChannelId` доранд — canvas-ро лозим буд (панели media-и
channel-scoped-и `TriggerConfigFields` ва рӯйхати flow-ҳои ҳамсоя барои
`goto_flow`), вале дар `FlowDetail` пештар набуд. Иловаи содда, ҳеҷ
endpoint-и мавҷударо нашикаст (598 тести backend ҳамоно сабз).

## Чӣ санҷида НАШУД

Дар ин сессия абзори browser automation дастрас набуд — ҳамаи санҷиш
`typecheck`/`test`/`lint`/`build` буд, на click-through-и воқеӣ.
Санҷидашуда НАШУДААСТ: drag-и нод дар canvas (визуалӣ), autosave-и зинда
(PUT воқеан меравад ва баъд аз reload нигоҳ дошта мешавад), рафтори
Handle-ҳо (ки ба сатрҳои дуруст мепайванданд), undo/redo-и воқеии
клавиатурӣ. Тавсия: пеш аз production, як бор дастӣ дар браузер санҷида
шавад (роҳи тиллоӣ: аз шаблон сохтан → таҳрир → drag → reload → тасдиқи
сабтшавӣ).

## Тестҳо

- `flowGraph.test.ts` — 17 (portҳо, canConnect, mapping-и DTO↔canvas,
  goto_flow терминалӣ).
- `automations/flows/id/store.test.ts` — 7 (push/undo/redo, стеки редо
  тоза мешавад баъди push-и нав, ҳадди 50).
- `automations/route.test.tsx` — 7 (нав, ба ҷои
  `instagram-automation/route.test.tsx`-и нест кардашуда: рӯйхати ду
  навъ якҷоя, action-и дурусти ҳар навъ — edit барои simple, openCanvas
  барои flow — ва `setActive`-и дурустро мефиристад — `commentAutomationApi`
  барои simple, `flowsApi` барои flow, ҳаргиз омехта намешаванд).
- Канваси xyflow худаш (`FlowCanvas`/`route.tsx`-и canvas) render-тест
  нашуд — `@xyflow/react` дар jsdom ба `ResizeObserver`-и polyfill ниёз
  дорад (дар лоиҳа нест), ва арзиши санҷиши он маҳдуд аст (мантиқи худи
  xyflow, на коди мо) — мантиқи воқеан муҳим (портҳо, autosave-и
  снапшот, undo/redo) аллакай дар `flowGraph.ts`/`store.ts` алоҳида
  тестпазир аст.

## Definition of Done

- ✅ `npm run typecheck` — 0 хато
- ✅ `npm run test` — 519/519 сабз (26 нав)
- ✅ `npm run lint` — 0 хато (танҳо огоҳиҳои пешинаи бетааллуқ)
- ✅ `npm run build` — муваффақ
- ✅ `/automations` рӯйхати ду навъро якҷоя нишон медиҳад
- ✅ Canvas: 4 навъи нод, панели танзимот, autosave, undo/redo, омор,
  шаблонҳо — ҳама пиёда шуданд
- ⬜ Санҷиши дастии зиндаи browser — тавсияшуда, иҷро НАШУД (ниг. боло)
