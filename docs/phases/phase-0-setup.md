# Фазаи 0 — Setup ва UI kit

**Ҳадаф:** проекти корӣ бо UI kit-и кӯчонидашуда ва саҳифаи холии тестӣ.
**Пешшарт:** нест.
**Тахмин:** 2 рӯз.
**Ҳатман хон:** `docs/05-from-nizom.md`

## Дарун
Скелет, Tailwind, кӯчонидани `ui/` ва `shared/`, токенҳо, i18n бо як забон.

## Берун
Auth, API, ҳар саҳифаи воқеӣ.

## Вазифаҳо

- [x] 0.1 Repo `office-web` дар ҳамон `officeNizom`, ветка `dev`
- [x] 0.2 `npx create-react-router@latest` → `ssr: false` дар `react-router.config.ts`
- [x] 0.3 TypeScript strict, `verbatimModuleSyntax`, alias `~/` → `app/`
- [x] 0.4 Tailwind v4 (`@tailwindcss/vite`), бе `tailwind.config.js`
- [x] 0.5 Package-ҳо аз `docs/01-architecture.md`
- [x] 0.6 **ESLint + typescript-eslint** (Nizom надошт) + Prettier + `prettier-plugin-tailwindcss`
- [x] 0.7 **Vitest + Testing Library**, скрипти `npm run test`
- [x] 0.8 `styles/global.css`-и Nizom-ро кӯчон — токенҳои OKLCH, radius, shadow, animation
- [x] 0.9 Фонти Manrope (`@fontsource-variable/manrope`). Geist нагир
- [x] 0.10 `components/ui/*`-ро пурра кӯчон (base-ui, 28 файл)
- [x] 0.11 `components/shared/*`-и рӯйхати «бе тағйирот» аз `05-from-nizom.md` (CommandPalette → фазаи 6, ба auth/permission вобаста)
- [x] 0.12 **Bug-и `Panel` ислоҳ кун** — `className` ба контейнери берунӣ ҳам расад
- [x] 0.13 Ҳангоми кӯчонидан `text-[10px]`/`[11px]`/`[13px]` → `text-2xs`
- [x] 0.14 `lib/utils.ts`, `lib/date.ts`, `lib/format.ts`, `lib/form-data.ts`
- [x] 0.15 `store/useTableStore.ts`, `store/createModalStore.ts`, `hooks/useForm.ts`, `hooks/useDataTable.ts`
- [x] 0.16 i18n — **танҳо `tg`**, `i18next-http-backend`. `remix-i18next` ва `i18next-fs-backend` нагир
- [x] 0.17 next-themes + `ModeToggle`
- [x] 0.18 `.env.example` бо `VITE_API_URL`
- [x] 0.19 Саҳифаи `/kitchen-sink` — намунаи ҳамаи компонентҳо, барои санҷиши визуалӣ

## Definition of Done
- `npm run dev` кор мекунад, `/kitchen-sink` ҳама компонентро нишон медиҳад
- `npm run typecheck`, `npm run lint`, `npm run build` тоза
- Dark mode кор мекунад, контраст дуруст
- `Panel className="rounded-2xl"` воқеан кор мекунад
- `grep -r "text-\[1[013]px\]" app/` холӣ
