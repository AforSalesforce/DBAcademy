# UX Patterns

Read this when designing interaction — forms, validation, the non-happy-path states, feedback, navigation, disclosure, and the microcopy that ties them together. These patterns apply across web, mobile, and desktop; platform-specific mechanics are in `platforms.md`.

## Contents

1. Interaction principles
2. Forms and validation
3. The four real states (loading, empty, error, success)
4. Feedback and timing
5. Progressive disclosure
6. Navigation and information architecture
7. Modals, menus, and overlays
8. Motion specs (easing, durations, per-state)
9. Microcopy

---

## 1. Interaction principles

- **Direct manipulation over indirection.** Let people act on the thing itself — drag to reorder rather than up/down buttons, edit inline rather than opening a separate form — when it's safe and discoverable.
- **Immediate feedback.** Every interaction acknowledges itself within ~100ms (press state, spinner, optimistic update). Silence reads as "broken."
- **Forgiveness.** Prevent errors where you can (constrain inputs, confirm destructive actions, sensible defaults) and make recovery easy where you can't (undo, drafts, non-destructive defaults). Prefer undo over confirmation dialogs for reversible actions.
- **Recognition over recall.** Show options and context rather than making people remember; keep labels visible.
- **Consistency.** The same action looks, names, and behaves the same everywhere. Consistency is how people learn the product.

---

## 2. Forms and validation

- **Ask for the least.** Every field is friction; cut anything you don't truly need. Group long forms into logical sections or steps.
- **Labels always visible** and associated with inputs; placeholders demonstrate format, they don't replace labels.
- **Right input for the data:** correct `type`, `inputmode`, and `autocomplete`; native pickers where they help; sensible defaults pre-filled.
- **Validate at the right time.** Validate a field on blur (not on every keystroke for things like email), but validate on input once a field is already in an error state so the user sees it clear. Never wait until submit to reveal everything.
- **Errors are specific and constructive:** "Enter a date in the future," not "Invalid input." Place the message at the field, mark it accessibly (see `accessibility.md`), and on submit, summarize errors and focus the first one.
- **Show progress** for multi-step flows and preserve entered data across steps and failures. Never make a user re-enter what they already typed.
- **Make the primary action obvious** and label it with the outcome ("Create account," not "Submit"). Avoid a same-weight "Cancel" competing with it.

---

## 3. The four real states (loading, empty, error, success)

Design these as deliberately as the happy path — they're where products feel unfinished.

- **Loading.** Reflect the shape of the incoming content. Use **skeletons** for content layouts and **spinners** only for short, indeterminate waits. Stream/render progressively rather than blocking the whole screen on the slowest piece. For actions, show the control's own busy state (disabled + spinner in place), keeping layout stable.
- **Empty.** An empty state is an onboarding opportunity, not a dead end. Explain what goes here, why it's empty, and give one clear action to fill it (plus an example or illustration when helpful). Distinguish "nothing yet" from "no results for this filter" (the latter offers to clear filters).
- **Error.** Say what happened and what to do next, in the interface's voice — no apologies, no jargon, no stack traces. Offer a retry or a path forward. Distinguish recoverable (retry) from terminal (contact/support) and field-level from page-level.
- **Success.** Confirm completion and point to the obvious next step. Keep confirmation language consistent with the action ("Publish" → "Published").

---

## 4. Feedback and timing

- **Perceived performance beats raw speed.** Optimistic updates, skeletons, and instant press states make an interface feel fast; an interface that's quick but silent feels slow. (Performance is a UX concern — see `platforms.md`.)
- **Match the feedback to the weight of the action:** inline/subtle for small reversible actions; a toast for background completions; an interrupting dialog only for consequential or destructive ones.
- **Toasts**: brief, auto-dismiss for confirmations; persistent + dismissible for anything the user may need to act on; announce via `aria-live`.
- **Don't double-signal.** One clear acknowledgment per action; piling a toast on top of an inline change is noise.

---

## 5. Progressive disclosure

Show the simple path first; reveal complexity on demand. Layer as **summary → details → advanced**. Use accordions, "Show more," expandable rows, and optional advanced panels to keep the default view calm while keeping power accessible. Set good defaults so most users never need the advanced layer. Don't hide *essential* actions behind disclosure — only secondary or expert ones.

---

## 6. Navigation and information architecture

- **Structure mirrors the user's mental model**, not the org chart or the database schema. Group by task and frequency.
- **Always show "where am I"** — a clear active state (`aria-current`), and breadcrumbs in deep hierarchies.
- **Pick the right pattern for depth and platform:** top nav / sidebar for web breadth; tab bar (≤5 items) for primary mobile destinations; "more"/overflow for the long tail. Keep primary destinations to a handful.
- **Make the path back obvious and predictable.** Back should do what users expect; don't strand people in flows without an exit.
- **Search** when the catalog is large; filters that clearly show what's applied and an easy way to clear them.

---

## 7. Modals, menus, and overlays

- **Use a modal only to focus a single decision/task** that needs to interrupt. Don't stack modals; don't put long flows in them.
- Trap focus inside while open, restore focus to the trigger on close, close on Esc and on scrim click (for non-destructive ones), and provide a visible close control.
- **Menus/popovers** open on the trigger, are keyboard-navigable (arrow keys), close on Esc/outside-click, and position to stay within the viewport.
- **Confirmations** are for irreversible/destructive actions; name the consequence in the button ("Delete 3 files"), and prefer undo for anything reversible.

---

## 8. Motion specs

Motion should clarify cause and effect and add polish — not decorate. Animate only cheap properties (`transform`, `opacity`). Always gate non-essential motion behind `prefers-reduced-motion`.

### Durations (guideline)

| Interaction | Duration |
|---|---|
| Micro (hover, press, toggle) | 100–150ms |
| State change (expand, reveal, tab) | 150–250ms |
| Entering element / overlay | 200–300ms |
| Page/large transition | 300–450ms |

Faster for small/near things, slower for large/distant ones. Anything over ~500ms for routine UI feels sluggish.

### Easing

- **Standard / ease-out** (`cubic-bezier(0.2, 0, 0, 1)`) for most enters and moves — quick start, gentle settle.
- **Ease-in** for exits (element accelerating away).
- **Ease-in-out** for elements moving between two on-screen positions.
- Springs for playful/physical UIs; keep them critically-damped (no excessive bounce) unless the tone calls for it.

### Orchestration

One well-orchestrated moment (a staggered page-load reveal, ~30–60ms between siblings) lands harder than many scattered micro-animations — and scattered effects are a common tell of AI-generated UI. Don't animate everything; choose the moments that carry meaning.

---

## 9. Microcopy

Copy is design material; write it from the user's side of the screen.

- **Buttons name the outcome:** "Save changes," "Send invite," "Delete file" — not "OK"/"Submit." The same action keeps the same name through the whole flow.
- **Labels** name what the user controls in their words, not the system's ("Notifications," not "Webhook config").
- **Empty states** invite action: what this is, and the one thing to do.
- **Errors** explain what happened and how to fix it, plainly, without apology or blame: "That email's already in use. Try signing in instead."
- **Helper text** sets expectations *before* mistakes ("8+ characters") rather than only scolding after.
- **Tone:** plain verbs, sentence case, no filler, matched to brand and audience. Each piece of text does exactly one job.
