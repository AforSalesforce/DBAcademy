# Design Systems & Tokens

How to build the color, type, spacing, and token foundations a design rests on — and how to keep them consistent across many screens. Read this when constructing a palette, a type scale, a spacing system, or a reusable/persistent design system.

## Contents

1. Design tokens (the foundation)
2. Color systems
3. Typography systems
4. Spacing, sizing, and radius
5. Elevation, shadows, and borders
6. Persistent design systems (master + overrides)

---

## 1. Design tokens (the foundation)

A token is a named value (`--color-accent`, `--space-4`, `--text-lg`) used everywhere instead of a raw literal. Tokens are what make a design *consistent* and *changeable*. Define them once and reference them everywhere.

Organize tokens in two tiers:

- **Primitive tokens** — raw scale values: `--blue-500: #3b6ef6`, `--space-4: 16px`. Not used directly in components.
- **Semantic tokens** — role-based aliases that point at primitives: `--color-action: var(--blue-500)`, `--color-text: var(--gray-900)`, `--surface-raised: var(--gray-0)`. Components reference only these.

The semantic layer is what lets you re-theme (light/dark, brand variants) by repointing aliases without touching components. Always define a complete set for both light and dark if dark mode is in scope, and verify contrast in each.

```css
:root {
  /* primitives */
  --gray-0:#fff; --gray-100:#f4f5f7; --gray-600:#525866; --gray-900:#111317;
  --brand-500:#5b3df5; --brand-600:#4a2fd8;
  /* semantic */
  --color-bg:var(--gray-0); --color-text:var(--gray-900); --color-text-muted:var(--gray-600);
  --color-action:var(--brand-500); --color-action-hover:var(--brand-600);
  --surface-raised:var(--gray-0); --border-subtle:#e6e8ec;
}
:root[data-theme="dark"]{
  --color-bg:#0c0d10; --color-text:#f2f3f5; --color-text-muted:#a0a5b0;
  --surface-raised:#16181d; --border-subtle:#262a31;
}
```

---

## 2. Color systems

### Structure of a palette

A complete palette has more than "a primary and a gray." Define:

- **Neutrals** — a ramp of ~6–10 steps from background to highest-contrast text. Most of any interface is neutral; get this right first.
- **Brand / dominant** — the color that carries identity. Often one hue with a few tints/shades.
- **Accent** — a sharp, reserved color for the single most important action or datum. Restraint is what makes an accent read as an accent.
- **Semantic / status** — success, warning, danger, info. Each needs a text-safe and a surface (tinted background) variant, and must never be the *only* signal (pair with an icon or label — WCAG 1.4.1).

### Choosing a direction

Commit to a dominant color and disciplined neutrals rather than spreading attention across many evenly weighted colors. Avoid the timid "one of every hue" palette and the overused cliché of purple-on-white. Derive the palette from the subject's world where possible.

### Contrast and dual-mode discipline

- Verify **4.5:1** for body text, **3:1** for large text and meaningful UI/graphics, against the actual background it sits on.
- Check borders and dividers in *both* light and dark — a border that's visible on white often vanishes on near-black and vice versa.
- Glass / translucent surfaces: in light mode use high opacity (`bg-white/80`+) so content stays legible; `bg-white/10` only works over busy/dark backgrounds.
- Don't rely on hue alone to distinguish states; contrast and accompanying cues must survive grayscale.

Contrast math and tooling are in `accessibility.md`.

---

## 3. Typography systems

### Roles, not just fonts

Assign typefaces to roles and use each consistently:

- **Display** — characterful, used with restraint for headings and hero moments.
- **Body** — highly readable at small sizes; this is most of the words.
- **Utility / mono** — captions, labels, data, code (often a monospace or a tight grotesque).

Pair deliberately. Avoid the overused AI defaults (Inter, Roboto, Arial, system stacks, Space Grotesk) unless the brief asks for them. A common strong move: an expressive display face against a calm, legible body face — contrast in character, harmony in proportions.

### Type scale

Use a consistent ratio rather than ad-hoc sizes. A modular scale (e.g. 1.2 minor third, or 1.25 major third) generates a coherent set:

```
--text-xs:12px  --text-sm:14px  --text-base:16px  --text-lg:20px
--text-xl:25px  --text-2xl:31px --text-3xl:39px   --text-4xl:49px
```

- Set **line-height** by role: tighter for large display (1.05–1.2), looser for body (1.4–1.6).
- Control **measure** (line length) to ≈45–75 characters for sustained reading.
- Use weight and letter-spacing intentionally: large display often wants tighter tracking; small caps/labels often want slightly looser.
- Make body text ≥16px on the web to avoid mobile zoom and readability problems.

### UI-specific type

Buttons, labels, inputs, and error text each deserve deliberate size/weight. Labels are typically small, medium-weight, and high-contrast; helper text is muted; error text carries a status color *and* an icon (color is never the only signal).

---

## 4. Spacing, sizing, and radius

### Spacing scale

Use one spacing scale everywhere, based on a base unit (commonly 4px or 8px). Consistent spacing is most of what "looks designed" actually means.

```
--space-1:4  --space-2:8  --space-3:12 --space-4:16
--space-5:24 --space-6:32 --space-8:48 --space-10:64
```

Apply spacing as a system: consistent gaps within a component, larger consistent gaps between sections. Relationships read through proximity — related things sit closer, unrelated things further apart.

### Sizing and touch targets

- Interactive targets: **≥44×44px** (iOS) / **≥48×48dp** (Android) minimum, with adequate spacing so neighbors aren't mis-tapped.
- Define container max-widths for readable content (text columns rarely exceed ~70ch).

### Radius

Pick a small radius scale and apply it consistently (e.g. `--radius-sm:6px --radius-md:10px --radius-lg:16px --radius-full:9999px`). Radius is a strong stylistic signal — sharp corners read technical/editorial; large radii read soft/friendly. Keep it coherent with the chosen tone.

---

## 5. Elevation, shadows, and borders

- Build a small, deliberate elevation scale; don't invent a new shadow per component. Soft, layered shadows read more refined than a single hard drop shadow.
- In dark mode, elevation often reads better as a lighter surface than as a shadow.
- Decide a border philosophy: hairline rules (editorial/precise) vs. soft shadows (friendly/raised) vs. both. Verify border visibility in both themes.
- Avoid emoji as UI icons; use a consistent SVG icon set with uniform stroke weight and size.

---

## 6. Persistent design systems (master + overrides)

For multi-screen products, capture the system so every screen shares one source of truth while allowing per-context variation.

- **Master** — the global tokens and rules (palette, type, spacing, radius, elevation, motion defaults, voice). One canonical document/file.
- **Overrides** — per-page or per-surface deltas. A dense data dashboard may need tighter spacing and smaller type than a marketing page while still inheriting the same palette and type families.

When working across many screens, write the master first, then express each screen as "master + a short list of intentional overrides." This prevents drift (slightly different blues, inconsistent spacing, mismatched radii) — the most common way a multi-page product starts to look unprofessional. Re-read the master before designing any new screen so it stays consistent.
