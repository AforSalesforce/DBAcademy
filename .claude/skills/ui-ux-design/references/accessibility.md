# Accessibility (WCAG)

Read this whenever you build or audit an interface for accessibility, or when the user mentions a11y, WCAG, screen readers, contrast, keyboard navigation, or an audit. Accessibility is part of the quality floor, not an add-on: an interface that excludes keyboard and screen-reader users is unfinished. Target **WCAG 2.1/2.2 Level AA** by default.

## Contents

1. The four principles (POUR)
2. Color and contrast
3. Keyboard and focus
4. Screen readers, semantics, and ARIA
5. Forms and errors
6. Motion, timing, and media
7. Audit workflow and output format

---

## 1. The four principles (POUR)

- **Perceivable** — content and UI must be presentable in ways users can perceive: text alternatives, sufficient contrast, not relying on color alone, captions.
- **Operable** — everything works by keyboard, focus is visible and logical, targets are large enough, nothing requires precise timing or causes seizures.
- **Understandable** — labels and instructions are clear, behavior is predictable, errors are identified and explained.
- **Robust** — valid semantics and correct names/roles/states so assistive tech can interpret the UI.

---

## 2. Color and contrast

### Required ratios (AA)

- **Normal text:** ≥ **4.5:1** against its background.
- **Large text** (≥24px, or ≥18.66px bold): ≥ **3:1**.
- **UI components and meaningful graphics** (icons, input borders, focus indicators, chart elements that convey data): ≥ **3:1**.

### Contrast math

Contrast ratio = (L1 + 0.05) / (L2 + 0.05), where L is relative luminance and L1 ≥ L2. For each channel c in {R,G,B} normalized to 0–1: `c_lin = c/12.92 if c ≤ 0.03928 else ((c+0.055)/1.055)^2.4`; then `L = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin`.

```python
def luminance(hexcolor):
    h = hexcolor.lstrip('#')
    r,g,b = (int(h[i:i+2],16)/255 for i in (0,2,4))
    f = lambda c: c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
    R,G,B = f(r),f(g),f(b)
    return 0.2126*R + 0.7152*G + 0.0722*B

def contrast(c1, c2):
    L1,L2 = luminance(c1), luminance(c2)
    hi,lo = max(L1,L2), min(L1,L2)
    return (hi+0.05)/(lo+0.05)
# contrast('#525866','#ffffff') -> ~7.0 (passes AA & AAA for normal text)
```

When a pair fails, adjust lightness while preserving hue/intent rather than swapping to an unrelated color. Verify every text/background pair and every state (default, hover, disabled) in **both** light and dark themes.

### Don't rely on color alone (WCAG 1.4.1)

Any information signaled by color must also be signaled another way. Common failures: links distinguished from body text by color only (add underline or weight), form errors shown only in red (add icon + text), required fields marked only by color, status dots with no label, chart series separated only by hue (add labels, patterns, or direct labeling). Test by viewing in grayscale.

---

## 3. Keyboard and focus

- **Everything operable by keyboard.** Every interactive element reachable and activatable with Tab/Shift+Tab/Enter/Space (and arrow keys within composite widgets like menus, tabs, listboxes).
- **Visible focus indicator** on every focusable element, ≥3:1 against adjacent colors. Never `outline:none` without a clearly visible replacement. WCAG 2.2 adds **Focus Not Obscured** — the focused element must not be hidden behind sticky headers/footers.
- **Logical focus order** that follows reading/visual order; don't reorder with positive `tabindex`.
- **No keyboard traps** — focus can always move away from a component.
- **Manage focus on route/modal changes.** Opening a dialog moves focus into it and traps focus *within* it until closed; closing returns focus to the trigger. Provide a visible, keyboard-reachable close.
- **Skip link** to jump past repeated navigation to main content.
- **Target size (WCAG 2.2, 2.5.8):** ≥ 24×24 CSS px minimum; aim for 44×44 for primary touch targets.

---

## 4. Screen readers, semantics, and ARIA

### Semantics first

Prefer native HTML — `<button>`, `<a href>`, `<nav>`, `<main>`, `<header>`, `<ul>`, `<label>`, `<table>` with headers — over `<div>`s with handlers. Native elements bring focusability, keyboard behavior, and roles for free. **First rule of ARIA: don't use ARIA if a native element does the job.**

- One `<h1>` per page; headings nested in order (no skipping levels) — they're how screen-reader users navigate.
- Landmarks (`<nav>`, `<main>`, `<aside>`, `<footer>`) to structure the page.
- Lists for groups of items; tables for tabular data with proper `<th scope>`.

### Accessible names

Every control needs a name. Order of preference: visible `<label>` (forms) → text content (buttons/links) → `aria-label` / `aria-labelledby` (icon-only controls). Icon-only buttons **must** have an `aria-label`. Images need `alt` that conveys purpose; decorative images get `alt=""`.

### ARIA for custom widgets

When you must build a custom control, give it the correct `role`, and keep `aria-*` state in sync with reality: `aria-expanded` on disclosure/menu triggers, `aria-selected`/`aria-checked` on options, `aria-current` for the active nav item, `aria-modal` + focus management on dialogs. Use `aria-live` (polite/assertive) to announce async changes like validation results, toasts, and loaded content. Stale ARIA state is worse than none — keep it updated.

---

## 5. Forms and errors

- Every field has a **persistent, programmatically associated `<label>`** (placeholder is not a label).
- Group related controls with `<fieldset>`/`<legend>` (e.g. radio groups).
- Mark required fields in text, not color alone; state input format expectations up front.
- On error: set `aria-invalid`, associate the message with the field via `aria-describedby`, summarize errors at the top with links to fields, and move focus to the first error. Errors say what's wrong **and how to fix it**.
- Don't disable the submit button as the only feedback — explain what's missing.
- Support autofill with correct `autocomplete` attributes and input `type`s.

---

## 6. Motion, timing, and media

- Honor `prefers-reduced-motion`: remove or substantially reduce non-essential animation; never make essential info depend on motion.
- No content flashing more than **3 times per second** (seizure risk).
- Avoid auto-advancing carousels/timeouts without pause/stop/extend controls.
- Provide captions/transcripts for audio and video; don't autoplay sound.

---

## 7. Audit workflow and output format

When auditing existing UI:

1. **Inventory** the screens/components and how they're built.
2. **Check against each principle** — run contrast pairs programmatically (use the function above), tab through the whole flow, inspect semantics and names, test forms' error paths, and toggle reduced motion and grayscale.
3. **Report findings** concisely and actionably. Lead with severity, cite the WCAG criterion, point at the location, and give the fix:

```
[Critical] 1.4.3 Contrast — src/Button.tsx:24
  Disabled button text #9aa0aa on #e6e8ec = 1.9:1 (needs 4.5:1).
  Fix: darken the text (e.g. to #5b6170) or signal "disabled" with more than contrast loss.

[Serious] 4.1.2 Name, Role, Value — src/IconNav.tsx:11
  Icon-only buttons have no accessible name.
  Fix: add aria-label="Search" (etc.) to each.

[Moderate] 2.4.7 Focus Visible — global.css
  outline:none on :focus with no replacement.
  Fix: add a :focus-visible ring ≥3:1 against the background.
```

Order issues by severity (Critical → Serious → Moderate → Minor). Group by component when many share a root cause. When you can fix in place, do — preserving the existing code style — rather than only reporting.
