# Frontend

NextJS 16 + React 19 single-page Kanban demo. Currently runs as a standalone dev app with in-memory state. Later parts of `docs/PLAN.md` will switch it to a static export served by FastAPI and wire it to a backend API.

## Stack

- Next 16 (App Router) - `next dev` for local; `output: "export"` is set so `npm run build` produces `frontend/out/` for the FastAPI image.
- React 19, TypeScript, Tailwind v4 (via `@tailwindcss/postcss`).
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop.
- Vitest + Testing Library for unit tests; Playwright for E2E.

## Layout

```
src/
  app/
    layout.tsx        Root HTML, loads Manrope + Space Grotesk fonts, sets metadata.
    page.tsx          Renders <KanbanBoard />.
    globals.css       Tailwind layer + CSS custom properties for the palette.
  components/
    KanbanBoard.tsx   Top-level board. Owns board state and drag context.
    KanbanColumn.tsx  One column. Editable title, droppable area, sortable card list.
    KanbanCard.tsx    Sortable card with delete button.
    KanbanCardPreview.tsx  Drag overlay preview (non-interactive copy of a card).
    NewCardForm.tsx   Inline form for adding cards within a column.
    KanbanBoard.test.tsx  Vitest unit tests for the board component.
  lib/
    kanban.ts         Types (BoardData, Column, Card), initial demo data, moveCard reducer, createId helper.
    kanban.test.ts    Vitest unit tests for moveCard.
  test/               Vitest setup files (jsdom, jest-dom matchers).
tests/
  kanban.spec.ts      Playwright E2E covering load, add card, drag-between-columns.
public/               Static assets served by Next.
```

## State model

Single source of truth lives in `KanbanBoard.tsx` as a `BoardData` from `src/lib/kanban.ts`:

```ts
type BoardData = {
  columns: Column[];                 // ordered list of columns
  cards: Record<string, Card>;       // card lookup by id
};
type Column = { id: string; title: string; cardIds: string[] };
type Card   = { id: string; title: string; details: string };
```

Columns own an ordered `cardIds` array; card content is denormalized into the `cards` map. `moveCard` in `lib/kanban.ts` is a pure reducer that handles same-column reorder, cross-column move, and dropping onto an empty column.

`initialData` in `lib/kanban.ts` seeds five columns (Backlog, Discovery, In Progress, Review, Done) with eight demo cards. Part 7 will remove this from the live render path and serve real data from the backend.

## Drag and drop

`KanbanBoard` wires `DndContext` with a `PointerSensor` (6px activation distance) and `closestCorners` collision detection. Each `KanbanColumn` is a `useDroppable` zone, each `KanbanCard` is `useSortable`, and the active card renders inside `<DragOverlay>` via `KanbanCardPreview`.

## Styling

Tailwind v4 with CSS variables for the project palette in `globals.css`:
- `--accent-yellow` `#ecad0a`
- `--primary-blue` `#209dd7`
- `--secondary-purple` `#753991`
- `--navy-dark` `#032147`
- `--gray-text` `#888888`
- Plus surface, stroke, and shadow tokens used across components.

Two display fonts are loaded via `next/font/google` in `layout.tsx`: Space Grotesk (display) and Manrope (body). If static export ever flags an issue with `next/font`, switch to local fonts.

## Tests

- Unit: `npm run test:unit` (or `:watch`). Vitest with `jsdom`; setup in `src/test/`.
- E2E: `npm run test:e2e`. Playwright config brings up the FastAPI container via `docker compose up --build` and drives Chromium against `http://localhost:8000`. Selectors rely on `data-testid="column-<id>"` and `data-testid="card-<id>"`, plus accessible names.
- All: `npm run test:all`.

## Seams the rest of the plan will touch

- **Part 7**: replace the in-memory `useState(initialData)` with a fetch via a new `src/lib/api.ts`. Each handler (`handleRenameColumn`, `handleAddCard`, `handleDeleteCard`, drag-end) becomes an optimistic API call. `initialData` exits the live render path.
- **Part 10**: a new `src/components/AIChatSidebar.tsx` mounts beside the board; when the AI returns a `board_update`, swap `KanbanBoard` state directly.

## Conventions

- No emojis in source, comments, or UI copy.
- Keep components presentational where possible; lift state into `KanbanBoard` (or, after Part 7, a thin store/hook).
- Reach for `data-testid` for E2E selectors; prefer accessible roles/names for unit tests.
- New colors must come from the CSS variables above, not hardcoded hex.
