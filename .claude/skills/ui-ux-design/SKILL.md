---
name: ui-ux-design
description: Comprehensive UI/UX design guidance for building or improving interfaces across every kind of application — web apps, mobile apps, desktop apps, dashboards, internal tools, landing pages, and prototypes. Covers aesthetic direction, typography, color and design tokens, layout, motion, accessibility (WCAG), UX patterns (forms, errors, empty states, navigation, microcopy), platform-specific conventions, and a pre-delivery quality checklist. Use this skill whenever the user wants to design, build, redesign, review, audit, or improve any user interface, screen, page, component, design system, or app — even if they don't explicitly say "UI" or "UX." Also use when checking an interface for accessibility, usability, visual quality, responsiveness, or design consistency.
---

# UI/UX Design

Design like the lead at a small studio that is known for giving every client an interface that could not be mistaken for anyone else's — and that actually works for the people using it. Two things have to be true at once: the work must be **distinctive** (not a templated default) and it must be **usable** (accessible, clear, performant, forgiving). This skill is the craft and the checklist for both, across any kind of application.

## Use this skill for any of these

Building a new interface, redesigning an existing one, creating a component or design system, or reviewing/auditing UI someone already has. It applies to web, mobile, desktop, dashboards and data-heavy tools, marketing pages, and prototypes alike. When the request is platform-specific, layer the platform conventions on top of the universal craft below.

## The non-negotiable floor

Every interface, no matter how simple or how bold, ships only when it clears this floor. Don't announce it — just meet it.

- **Responsive** down to small screens; nothing clips, overflows, or requires horizontal scroll.
- **Keyboard operable** with a visible focus state on every interactive element.
- **Sufficient contrast**: 4.5:1 for normal text, 3:1 for large text and meaningful UI/graphics.
- **Reduced motion respected** (`prefers-reduced-motion`); no essential information conveyed by motion or color alone.
- **Labeled controls**: every input, button, and icon-only control has an accessible name.
- **Real states handled**: loading, empty, error, and success are designed, not afterthoughts.

If any of these is at risk, fix it before polishing anything else. Full detail is in `references/accessibility.md` and `references/quality-checklist.md`.

## The design workflow

Work in passes. Do most of the thinking and iteration internally; only show the user something once you have real confidence it will land.

### 1. Ground it in the subject

If the brief doesn't pin down what the product is, pin it yourself: name one concrete subject, its **audience**, and the screen's **single job**, and state that choice. Distinctive design comes from the subject's own world — its materials, vocabulary, artifacts, and conventions — not from a generic style applied on top. If you have memory of the user's product, brand, or past designs, use it as a hint and stay consistent with it.

Answer four questions before designing anything:

- **Purpose** — who uses this, and what are they trying to accomplish?
- **Tone** — one specific aesthetic direction (e.g. "editorial and restrained," "warm and tactile," "precise and technical"), not a grab-bag.
- **Constraints** — platform, framework, performance budget, accessibility level, existing design system or brand.
- **Differentiation** — what one thing will make this interface memorable and unmistakably *this* product?

### 2. Draft a token system and a layout concept

Before code, sketch a compact design system (details and examples in `references/design-systems.md`):

- **Color** — 4–6 named hex values: a dominant, supporting neutrals, and a sharp accent. Commit; avoid timid, evenly distributed palettes.
- **Type** — typefaces for 2+ roles: a characterful display face used with restraint, a complementary body face, and a utility face for captions/data if needed. Set an intentional scale with deliberate weights and spacing.
- **Layout** — describe the concept in one sentence and sketch it with an ASCII wireframe so you can compare options cheaply.
- **Signature** — the single element this screen will be remembered by, derived from the brief.

### 3. Critique the plan before building

Read the plan back against the brief. If any part of it is the default you'd produce for *any* similar product, it's a tell — revise it and say what you changed and why. Calibration: current AI design clusters around a few defaults — a warm cream background with a high-contrast serif and a terracotta accent; near-black with a single acid-green or vermilion accent; a broadsheet layout with hairline rules and zero border-radius. These are legitimate *choices* for some briefs but become *defaults* when they show up regardless of subject. Where the brief specifies a direction, follow it exactly. Where it leaves an axis free, don't spend that freedom on a default.

### 4. Build to the plan

Derive every color and type decision from the token system. Watch CSS specificity — type-based selectors (`.section`) and element-based selectors fighting over padding/margins is a common source of silent layout bugs. Handle every real state (loading, empty, error, success), not just the happy path. Apply the platform conventions from `references/platforms.md`.

### 5. Critique again

Critique your own work as you build; if your environment can take screenshots, do — a picture is worth a thousand tokens. Spend your boldness in one place: let the signature element be the memorable thing and keep everything around it quiet and disciplined. Channel Chanel — before you finish, remove one accessory. Then run the pre-delivery checklist in `references/quality-checklist.md`.

## Core craft (applies to every interface)

### Typography carries the personality

Type is the single biggest lever on how a design feels. Pair display and body faces deliberately — not the families you'd reach for on every project. Avoid the overused AI defaults (Inter, Roboto, Arial, system stacks, Space Grotesk) unless the brief calls for them. Set a clear scale; make weight, width, and spacing intentional. Establish a comfortable measure (≈45–75 characters per line) and line-height that suits the face. The type treatment should be a memorable part of the design, not a neutral delivery vehicle. Extended scales and pairing guidance: `references/design-systems.md`.

### Color is a commitment, not a sprinkle

Build a small, cohesive palette and use CSS variables (tokens) so it stays consistent. Let a dominant color and disciplined neutrals do most of the work, with a sharp accent reserved for what matters most (primary actions, key data). Test the palette in both light and dark contexts and verify contrast — a glass card in light mode needs roughly `bg-white/80` or higher to stay legible, not `bg-white/10`. Color architecture (base + accent + semantic/status systems): `references/design-systems.md`.

### Structure is information

Layout devices — numbering, eyebrows, dividers, labels, grids — should encode something true about the content, not decorate it. Numbered markers (01 / 02 / 03) only make sense when the content is genuinely a sequence. Use hierarchy (type scale, weight, contrast, spacing) to guide attention to the one thing that matters most on each screen. Generous, intentional negative space reads as confidence; cramped density reads as noise. Consider asymmetry, overlap, and grid-breaking when the direction calls for it, and precision and restraint when it doesn't.

### Motion serves the subject

Decide *where and whether* animation helps. One orchestrated moment — a page-load sequence with staggered reveals, a meaningful scroll-triggered reveal — usually lands harder than scattered micro-interactions, and scattered effects are a common tell of AI-generated work. Animate cheap, GPU-friendly properties (transform and opacity). Always honor `prefers-reduced-motion`. Easing curves, duration tables, and per-state motion specs: `references/ux-patterns.md`.

### Match complexity to the vision

Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail. Elegance is executing the chosen vision well — not adding more.

## Writing is design material

Words exist in an interface to make it easier to understand and use, so bring the same intentionality to copy as to spacing and color.

- **Write from the user's side of the screen.** Name things by what people control and recognize ("Notifications," not "Webhook config"). Describe what something does in plain terms instead of selling it.
- **Use active voice and consistent vocabulary.** A control says exactly what it does ("Save changes," not "Submit"), and keeps the same name through the whole flow — the button that says "Publish" produces a toast that says "Published."
- **Treat failure and emptiness as direction, not mood.** Errors explain what went wrong and how to fix it, in the interface's voice; they don't apologize and they're never vague. An empty screen is an invitation to act.
- **Keep the register conversational and tuned:** plain verbs, sentence case, no filler, tone matched to brand and audience. Let each element do exactly one job.

Detailed microcopy patterns for errors, empty states, and forms are in `references/ux-patterns.md`.

## When to read the references

Read the relevant reference file as soon as the task touches its area — don't try to work from memory of it.

- **`references/design-systems.md`** — building color systems, type scales, spacing/sizing systems, and design tokens; setting up or maintaining a reusable or persistent design system across multiple screens.
- **`references/accessibility.md`** — any time you build or audit for accessibility: WCAG 2.1/2.2 conformance, contrast math, focus management, keyboard navigation, ARIA, accessible forms, reduced motion. Read this whenever the user mentions accessibility, a11y, WCAG, screen readers, or an audit.
- **`references/ux-patterns.md`** — designing interaction: forms and validation, error/empty/loading states, feedback timing, progressive disclosure, navigation, modals/menus, and microcopy.
- **`references/platforms.md`** — adapting to a specific platform: web (with performance and React composition patterns), mobile (React Native / native iOS & Android), desktop, and dashboards/data-visualization. Read the relevant section whenever a platform is named or implied.
- **`references/quality-checklist.md`** — before delivering anything: a final pass covering visual quality, interaction, responsiveness, light/dark contrast, and accessibility. Always run this before calling a design done.

If you're building actual frontend code (HTML/CSS/React/etc.), also use the environment's `frontend-design` skill for styling tokens and constraints — this skill governs the design thinking and UX; that one governs the code-level styling system.
