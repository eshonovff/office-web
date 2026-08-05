# Фазаи 3 — Проект ва Kanban

**Ҳадаф:** тахтаи корӣ бо drag & drop, ки тез ҳис мешавад.
**Пешшарт:** Фазаи 2 ✅ · backend фазаи 2 ✅
**Тахмин:** 5 рӯз.

## Дарун
Проектҳо, Kanban, dnd-kit, optimistic move, карточкаи таск, коммент, файл.

## Берун
SignalR (фазаи 4). Sprint, time tracking — нест.

## ⚠️ Ин фаза аз Nizom намунаи тайёр надорад

`DataTable` ин ҷо кор намекунад. `invalidateQueries` баъди move
карточкаро мепарронад. Ин фазаро аз сифр бисоз.

## Вазифаҳо

### Асос
- [ ] 3.1 `types/project.ts`, `types/task.ts`, `api/projects.ts`, `api/tasks.ts`
- [ ] 3.2 `/projects` — рӯйхат ё card grid, `EmptyState`-и умумӣ
- [ ] 3.3 Сохтан ва таҳрири проект, идораи аъзоён
- [ ] 3.4 `/projects/:id` — `GET /projects/{id}/board` як query

### Drag & drop ⚠️
- [ ] 3.5 `components/board/` — `Board`, `BoardColumn`, `TaskCard`, `TaskDragOverlay`
- [ ] 3.6 dnd-kit: `DndContext`, `SortableContext` барои ҳар колонка
- [ ] 3.7 `PointerSensor` бо `activationConstraint: { distance: 8 }` —
      вагарна клики оддӣ drag мешавад
- [ ] 3.8 `lib/position.ts` — ҳисоби `beforeTaskId`/`afterTaskId` аз индекс
- [ ] 3.9 **Optimistic move:**
      `onMutate` → `cancelQueries` → нусхаи ҳолати ҷорӣ →
      `setQueryData` бо ҷои нав → `onError` баргардонидан →
      `onSettled` **бе `invalidateQueries`** (сервер ҳамон ҷавобро медиҳад)
- [ ] 3.10 **Тест:** `onMutate` карточкаро дуруст мекӯчонад; `onError` бармегардонад
- [ ] 3.11 Ба аватари корманд партофтан → `assign`
- [ ] 3.12 Идораи колонкаҳо: сохтан, ном, тартиб, нест кардан
- [ ] 3.13 Keyboard sensor — дастрасӣ бо клавиатура

### Карточка ва деталь
- [ ] 3.14 `TaskCard` — сарлавҳа, аватар, deadline, приоритет, тег, шумораи коммент
- [ ] 3.15 Модали таск — кушода мешавад бо `?task=<id>` дар **URL**
- [ ] 3.16 Таҳрири inline: сарлавҳа, тавсиф, масъул, deadline, приоритет
- [ ] 3.17 Комментарий + `@mention` (autocomplete аз аъзоёни проект)
- [ ] 3.18 Upload/download-и файл, лимити 20 МБ, хатои фаҳмо
- [ ] 3.19 Тегҳо
- [ ] 3.20 Таърихи тағйирот (`activity`)
- [ ] 3.21 Филтр дар тахта: масъул, тег, приоритет, ҷустуҷӯ
- [ ] 3.22 Ҳама амал бо `can(...)` пинҳон — Developer тугмаи assign-ро набинад

## Definition of Done
- Карточка **фавран** ҳаракат мекунад, бе ларзиш ва бе бозгашт
- Хатои сервер → карточка ба ҷои кӯҳна бармегардад + toast
- 20 карточкаро паси ҳам мекӯчонӣ — тартиб дуруст мемонад
- Клики оддӣ модалро мекушояд, drag-ро сар намекунад
- Линки `?task=<id>`-ро дар браузери нав кушоӣ — ҳамон таск кушода мешавад
- Developer тугмаи assign-ро намебинад
- Тестҳои 3.10 сабз
