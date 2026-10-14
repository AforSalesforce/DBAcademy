# DBAcademy Design System

How the interface should look and behave. For code and infrastructure, see
[docs/HANDOFF.md](docs/HANDOFF.md).

## 1. Direction: "IDE-grade education"

DBAcademy looks and works like a developer tool, not a blog. The editor is as
important as the lesson; both stay visible on wide screens. Every action gets
an immediate, visible result (a query runs, an answer is checked, progress
moves). The app is **dark only** (`forcedTheme="dark"` in the root layout), so
there are no light-mode variants: never write `dark:` classes.

## 2. Tokens

Colours live in `src/app/globals.css` as RGB channels and are exposed to
Tailwind in `tailwind.config.ts`. **Use the token classes**, not hex codes and
not Tailwind's `slate`/`blue` palette.

| Tailwind name | Value | Use for |
| --- | --- | --- |
| `canvas` | `#07090F` | Page background; text on solid accent buttons (`text-canvas`) |
| `surface` | `#0C1018` | Panels, headers, the code editor background |
| `card` | `#111724` | Raised elements inside panels, inputs |
| `card-hover` | `#161E2E` | Hover state of cards |
| `ink` | `#EDF1FA` | Primary text |
| `muted` | `#8A97B3` | Secondary text (≈6.5:1 on canvas) |
| `faint` | `#7A87A5` | Tertiary text, placeholders (≥4.9:1 even on card) |
| `accent` | `#00C7BE` teal | Primary actions, active states, links, focus rings |
| `warm` | `#F59E0B` amber | Hints, highlights, marketing CTAs, "not yet" feedback |
| `success` | `#22C55E` | Passed, complete |
| `danger` | `#EF4444` | Errors, destructive actions |
| `line` | white at 7% | Dividers and panel borders (`border-line`); use `border-white/10` for input outlines |

Opacity modifiers work on every token except `line` (e.g. `bg-accent/10`
for tints, `hover:bg-accent/90` on solid buttons).

**Contrast rules (WCAG AA):** text is `ink`, `muted` or `faint`, never
dimmer. Solid `accent`/`success`/`warm`/`danger` buttons use **`text-canvas`**:
white on teal or green fails contrast. Drag-handle grips and similar
decoration may use `#5C6B8A` as a *background*, never as text colour. The
Monaco editor uses the `dbacademy-dark` theme (`SqlEditor.tsx`), whose
comment colour is raised to pass AA.

Older pages (`/`, `/learn`'s shell, `/dashboard`, `/code`) still set colours
inline with the same hex values; new code should use token classes.

## 3. Typography and icons

- **Display:** Bricolage Grotesque (`font-display`, `.heading-xl`, `.heading-lg`).
- **Body:** DM Sans (`font-body`, the default).
- **Code:** monospace (Fira Code where available).
- **Icons:** `lucide-react` only. **No emoji as UI icons**, including
  achievements (the dashboard maps achievement ids to Lucide icons).

## 4. Layout

### Wide screens (≥ 768px)

Fixed `100vh`; panels scroll internally and the page never does. `/learn` has
three panes: sidebar (activity bar + learning path / tables / queries /
designer), lesson (or the welcome panel), and editor + results. Panes resize
by dragging.

### Phones (< 768px)

One pane at a time, chosen from the **bottom tab bar** (Path / Lesson /
Editor). The app switches tab for the learner where the next step is obvious:
opening a lesson → Lesson; "Put in editor" / "Start over" → Editor; Check →
Lesson (where the verdict is). Header actions that don't fit (Notes,
Dashboard, Seed, Reset) live in the **More** menu. Touch targets are at least
44px tall.

When adding a panel, define both its wide layout and which phone tab it
belongs to.

## 5. States and feedback

Design every state, not just the happy path:

- **Empty** invites the next action ("Nothing run yet. Write a query and press Run").
- **Loading** keeps the layout: switching engine shows an overlay on the
  editor, never a blank page.
- **Error** says what happened and how to fix it (`explainError` adds a
  plain-language tip to raw SQL errors).
- **Success** confirms and offers the next step ("Correct! +20 XP", "Next lesson").

Destructive actions (reset, delete) ask first. Anything shown on hover has a
keyboard or touch equivalent (`focus-visible`, `focus-within`).

## 6. Accessibility checklist for new UI

- Every control reachable by keyboard, with a visible `focus-visible` outline in `accent`.
- Icon-only buttons have an `aria-label`.
- Custom widgets expose state (`aria-pressed`, `aria-expanded`, `aria-current`).
- Results, grading verdicts and save states are announced (`role="status"` / `aria-live`).
- Animations respect `motion-reduce:`.
- Check contrast with axe before shipping; the Phase 4 audit found zero
  colour-contrast failures on `/`, `/learn`, `/dashboard` and the 404 page.
