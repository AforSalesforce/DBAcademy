# Platform Conventions

The universal craft (in SKILL.md) and the UX patterns (in `ux-patterns.md`) apply everywhere. This file covers what changes per platform — conventions, constraints, and the engineering patterns that affect UX. Read the relevant section whenever a platform is named or implied.

## Contents

1. Responsive & cross-platform foundations
2. Web (+ performance and React composition)
3. Mobile (React Native / native iOS & Android)
4. Desktop applications
5. Dashboards & data visualization

---

## 1. Responsive & cross-platform foundations

- **Design mobile-first**, then enhance for larger screens. It's easier to add than to cram.
- **Breakpoints follow content**, not specific devices — add one where the layout starts to strain.
- **Fluid by default:** relative units, `clamp()` for type and spacing, flexible grids; fixed pixels only where truly fixed.
- **Reflow, don't shrink.** At narrow widths, stack and reorder; don't just scale a desktop layout down.
- **Respect the platform's idioms.** Users carry expectations from their OS and apps; match them unless you have a strong, deliberate reason not to.
- **Test the extremes:** smallest target width, very large screens, long content, empty content, and the longest plausible string in every label.

---

## 2. Web

### Layout & interaction

- Use semantic HTML and CSS Grid/Flexbox; let the browser do layout. Sticky headers must not obscure focused elements (WCAG 2.2).
- Hover is not available on touch — never hide essential actions behind hover only; provide a tap/persistent affordance too.
- Respect native behaviors: real links are `<a href>` (open-in-new-tab, copy link work), the back button works, scroll position restores.

### Performance is UX

A beautiful interface that's slow is a bad experience. Optimize in roughly this priority order (highest-impact first):

1. **Eliminate request waterfalls.** Sequential dependent fetches are the biggest perceived-speed killer. Parallelize independent data; colocate fetching with rendering; stream with Suspense boundaries instead of blocking on the slowest piece.
2. **Cut bundle size.** Import directly instead of from barrel files (a classic way to pull in an entire icon/component library); dynamically import heavy, below-the-fold, or rarely-used components; check what's actually shipping.
3. **Server-side where possible.** Render/fetch on the server; send less JS to the client.
4. **Client data fetching** with proper caching, dedup, and loading/error states.
5. **Re-render hygiene.** Subscribe to derived values (a boolean), not whole objects; stabilize callbacks/identities; memoize *measured* hotspots — don't reach for `useMemo`/`memo` reflexively before profiling.
6. **Rendering cost.** `content-visibility` for long lists, virtualization for very large lists, avoid layout thrash.

Core Web Vitals are the user-facing scorecard: **LCP** (load), **INP** (responsiveness), **CLS** (visual stability — reserve space for images/embeds so content doesn't jump).

### React composition patterns

How a component's API is shaped determines whether a UI stays maintainable. The dominant anti-pattern is **boolean-prop proliferation** (`isCompact`, `showHeader`, `hasBorder`, `isDestructive`…), which makes components hard to read, test, and extend.

- **Avoid boolean props for behavior; compose instead.** Pass children and subcomponents rather than flags.
- **Compound components** share state via context: `<Select>`, `<Select.Trigger>`, `<Select.Content>`, `<Select.Item>` — the consumer composes the structure.
- **Explicit variants over boolean modes:** `<Alert.Destructive>` reads better than `<Alert isDestructive>`.
- **Children over render-props** for composition where possible.
- **Decouple state:** a provider owns *how* state works; components consume a clean interface (state, actions, meta).
- On React 19+, prefer the `use()` hook and skip `forwardRef` where the new ref-as-prop behavior applies.

These keep a component library something other developers can actually build on.

---

## 3. Mobile (React Native / native iOS & Android)

### Platform conventions

- **Respect each platform.** iOS and Android differ in navigation, back behavior (Android hardware/gesture back), typography, and control styles. Use native pickers, sheets, context menus, and modals rather than reimplementing them.
- **Safe areas & insets.** Handle notches, dynamic islands, home indicators, and keyboards; content and scroll views must respect safe-area insets and not sit under system UI.
- **Touch ergonomics.** Targets ≥44×44pt (iOS) / 48×48dp (Android), generously spaced; keep primary actions in the thumb zone; design for one-handed use.
- **Gestures** (swipe, long-press, pull-to-refresh) should feel native and never be the *only* way to reach an action.

### Mobile performance (the difference between 60fps and jank)

- **Lists are the #1 bottleneck.** Use a performant list (e.g. FlashList over FlatList); memoize item components; stabilize callbacks and `keyExtractor`; avoid inline style objects and inline functions in items; define render functions outside the row; use item-type hints for heterogeneous lists.
- **Images:** use an optimized image component (e.g. `expo-image`) with proper sizing/caching; never ship oversized images into lists.
- **Animations on the UI thread:** animate `transform`/`opacity` only, use the native driver / Reanimated worklets, and `Gesture` handlers for gesture-driven motion. Avoid animating layout properties.
- **Styling:** `StyleSheet.create` or a compiled styling layer (e.g. NativeWind); avoid recreating style objects each render.
- **Measurement:** prefer `onLayout` over imperative `measure()`.

### Mobile UX specifics

- Keyboard handling: avoid covering the active input; provide "next/done" affordances; dismiss on scroll/tap-out.
- Provide loading/empty/error states sized for small screens; long-press and swipe affordances need discoverability.
- Offline and flaky-network states are first-class on mobile — design them.

---

## 4. Desktop applications

For desktop (native or Electron/Tauri web-tech) apps, density and capability expectations rise.

- **Higher information density** is acceptable and often expected; use it deliberately, not as an excuse for clutter.
- **Keyboard-first.** Power users live on shortcuts — provide them, surface them (menus, tooltips, a command palette), and keep them consistent with OS conventions (⌘ on macOS, Ctrl on Windows/Linux).
- **Window & multi-pane layouts:** resizable panes, persistent sidebars, multiple windows/tabs, and remembered window state. Layouts must handle resize gracefully.
- **Native integration:** menu bars, system tray/menu-bar items, native file dialogs, drag-and-drop with the OS, notifications, and respecting system light/dark and accent settings.
- **Right-click context menus** are expected; pair them with discoverable equivalents.
- **State & persistence:** desktop apps are long-lived — autosave, restore session/scroll/selection, and never lose work on crash or quit.
- **Performance:** keep the main/UI thread responsive; move heavy work off it so the window never freezes.

---

## 5. Dashboards & data visualization

Data UIs live or die on clarity and the right chart for the question.

### Choosing the visualization

- **Trend over time →** line/area. **Comparison across categories →** bar. **Part-to-whole →** stacked bar or (sparingly, ≤~5 slices) donut. **Correlation →** scatter. **Distribution →** histogram/box. **Single key figure →** a big, well-labeled stat. **Geographic →** map. Pick by the question being answered, not by what looks impressive.
- Avoid 3D, gratuitous animation, and dual-axis charts that mislead.

### Making data legible

- **Label directly** where possible instead of forcing legend round-trips; keep axes honest (start bars at zero; don't truncate to exaggerate).
- **Don't encode by color alone** — add labels, patterns, or direct labeling; ensure series colors meet 3:1 and survive grayscale and color-blind palettes.
- **Hierarchy:** lead with the headline metric, then supporting detail. Most dashboards try to show everything equally and end up saying nothing — decide what matters most on this screen.
- **Density with discipline:** tight spacing and smaller type are fine here (a sensible override on the master design system), but keep alignment, consistent number formatting, and generous-enough hit targets.
- **Interaction:** tooltips on hover/tap, filters that show and clear their applied state, drill-down where it adds value, and empty/loading/error states for every panel (a dashboard with no data must still make sense).
- **Tables are visualizations too:** right-align numbers, align decimals, use tabular figures, support sort/filter, sticky headers, and clear zebra/row separation. Don't force data into a chart when a good table is clearer.
- **Performance:** virtualize large tables/lists, paginate or window big datasets, and stream so the dashboard renders progressively instead of blocking on the slowest query.
