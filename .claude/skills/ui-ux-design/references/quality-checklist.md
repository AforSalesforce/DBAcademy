# Pre-Delivery Quality Checklist

Run this final pass before calling any design done — new builds and redesigns alike. It catches the issues that separate a prototype from production work. Don't just skim it; actually verify each item against the real interface (take screenshots if your environment supports it). Fix what fails before delivering.

## Visual quality

- [ ] The design reflects a **deliberate aesthetic direction** tied to this subject — not a generic default (no unexamined cream-serif-terracotta, near-black-with-neon, or hairline-broadsheet unless the brief asked for it).
- [ ] **One clear signature element** carries the personality; everything around it is quiet and disciplined.
- [ ] **Typography** uses an intentional, non-default pairing and a consistent scale; line length and line-height are comfortable; no overused AI default fonts unless requested.
- [ ] **Color** comes from a small committed palette via tokens; dominant + neutrals + a reserved accent; consistent everywhere.
- [ ] **Spacing** is systematic (one scale); related items grouped by proximity; alignment is consistent; negative space feels intentional, not accidental.
- [ ] **Icons** are a consistent SVG set (uniform weight/size); no emoji used as UI icons.
- [ ] Borders, shadows, and radii are coherent and from a small defined set.
- [ ] Nothing looks unfinished: no placeholder lorem where real copy belongs, no misaligned edges, no orphaned controls.

## Light & dark mode (if in scope)

- [ ] Both themes defined via semantic tokens; no hardcoded colors leaking through.
- [ ] **Contrast verified in both** (text, borders, icons, focus rings).
- [ ] Translucent/glass surfaces stay legible in light mode (high enough opacity).
- [ ] Elevation reads correctly in dark mode (lighter surfaces, not just shadows).

## Layout & responsiveness

- [ ] Works from the smallest target width up to large screens; layout reflows (stacks/reorders), not just shrinks.
- [ ] No horizontal scroll, clipping, or overflow at any breakpoint.
- [ ] Longest plausible strings, long content, and empty content all hold up.
- [ ] Touch targets ≥44×44 (mobile) with adequate spacing; click targets comfortable on desktop.

## Interaction & states

- [ ] **All four real states designed:** loading (skeleton/streamed, layout-stable), empty (invites action), error (says what + how to fix), success (confirms + next step).
- [ ] Every interaction gives feedback within ~100ms (press state / spinner / optimistic update).
- [ ] Destructive actions are confirmed or undoable; nothing irreversible happens silently.
- [ ] Forms: visible labels, validation at the right time, specific constructive errors, data preserved across steps/failures, outcome-named submit button.
- [ ] Hover-only affordances have a non-hover equivalent (touch).

## Accessibility (see `accessibility.md` for full detail)

- [ ] **Keyboard:** every interactive element reachable and operable; logical focus order; no traps; modals trap+restore focus.
- [ ] **Visible focus indicator** everywhere (≥3:1), not removed without replacement; focus not obscured by sticky UI.
- [ ] **Contrast:** 4.5:1 text / 3:1 large text & meaningful UI — verified, not assumed.
- [ ] **Not color-alone:** every color-coded meaning has a second cue (icon/text/pattern); survives grayscale.
- [ ] **Names & semantics:** native elements used; one ordered heading structure; icon-only controls have `aria-label`; images have appropriate `alt`; landmarks present.
- [ ] Custom widgets have correct roles and in-sync ARIA state; async changes announced via `aria-live`.
- [ ] **Reduced motion** respected; nothing flashes >3×/sec; no autoplay sound.

## Performance (see `platforms.md` for full detail)

- [ ] No obvious request waterfalls; independent data loads in parallel; content streams progressively.
- [ ] Bundle isn't bloated by barrel imports; heavy/below-fold components are split.
- [ ] Long lists virtualized/windowed; layout stable (space reserved for media — no CLS).
- [ ] Mobile: performant lists, optimized images, UI-thread animations only.
- [ ] Interface stays responsive during heavy work (no frozen main thread).

## Copy

- [ ] Buttons/labels name outcomes in the user's words; same action keeps the same name through the flow.
- [ ] Errors and empty states are plain, specific, and constructive — no apologies, jargon, or stack traces.
- [ ] Helper text sets expectations before mistakes; tone matches brand and audience; sentence case, no filler.

## Final pass

- [ ] Re-read against the original brief: does it do the screen's **single job** well, for its **audience**?
- [ ] Remove one accessory — cut the least-necessary decoration.
- [ ] If multi-screen, it's consistent with the master design system (same palette, type, spacing, radii).

When auditing someone else's UI rather than your own, report failures grouped by severity (Critical → Serious → Moderate → Minor) with location and fix, and fix in place where you can while preserving their code style.
