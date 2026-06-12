# DBAcademy Design System Skill

Design system and UI implementation guide for DBAcademy. Use this skill when building new pages, components, or UI for this project to stay consistent with the established design language.

> **Upstream authority:** `.claude/skills/ui-ux-design/` governs the design methodology, accessibility standards (WCAG AA), UX patterns, motion specs, and pre-delivery quality checklist. Always consult that skill for workflow, accessibility audits, and the final quality pass. This skill provides the DBAcademy-specific token values, component patterns, and forbidden patterns that override the generic guidance.

---

## Design Principles

1. **Distinctive typography** — Never use Inter, Roboto, Arial, system-ui, or Space Grotesk. Use Bricolage Grotesque for display/headings and DM Sans for body text.
2. **Sharp accent palette** — Dominant dark base with two vivid accents (teal + amber). Never use blue/indigo as primary UI color.
3. **High-impact motion** — Staggered page-load reveals via CSS `.stagger-1` through `.stagger-6`. Smooth `cubic-bezier(0.22, 1, 0.36, 1)` easing. No decorative micro-interactions.
4. **Spatial asymmetry** — Ghost decorative background text, diagonal section dividers (`.diagonal-section`), code editor mockups as hero elements, overlapping/rotated grid-breaking cards.
5. **Grain texture** — Built-in SVG feTurbulence grain on `body::before` (opacity 0.032). Never remove or override it.

---

## Color Tokens

```css
--bg:          #07090F   /* near-black midnight base */
--surface:     #0C1018   /* panels, sidebars, cards */
--card:        #111724   /* elevated card, header bg */
--card-hover:  #161E2E
--border:      rgba(255, 255, 255, 0.07)
--text:        #EDF1FA   /* primary text */
--text-muted:  #5C6B8A   /* secondary / placeholder */
--text-faint:  #2E3A52   /* disabled / decorative */
--accent:      #00C7BE   /* teal — interactive, active, links */
--accent-dim:  rgba(0, 199, 190, 0.12)
--accent-glow: rgba(0, 199, 190, 0.25)
--warm:        #F59E0B   /* amber — primary CTA buttons */
--warm-dim:    rgba(245, 158, 11, 0.12)
--warm-glow:   rgba(245, 158, 11, 0.25)
--success:     #22C55E
--error:       #EF4444
```

**Never use Tailwind color names directly** (e.g., `text-blue-600`, `bg-indigo-500`) for UI chrome — always use the CSS variable system with inline `style` or the token values above.

---

## Typography

```tsx
// Display font (headings, brand name, big numbers)
<h1 className="font-display heading-xl">...</h1>

// Body text (default — already applied via body font-family)
<p>...</p>

// Gradient text
<span className="text-gradient-teal">teal gradient</span>
<span className="text-gradient-warm">amber gradient</span>
```

**CSS classes:**
- `.font-display` — applies `var(--font-display)` Bricolage Grotesque
- `.heading-xl` — weight 800, letter-spacing -0.03em, line-height 1.05
- `.heading-lg` — weight 700, letter-spacing -0.025em, line-height 1.1

---

## Component Patterns

### Nav bar (marketing pages)
```tsx
<nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 h-16"
  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,9,15,0.75)', backdropFilter: 'blur(20px)' }}>
  {/* Logo */}
  <div className="relative w-8 h-8 flex items-center justify-center rounded-lg"
    style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
    <Database className="w-4 h-4 text-white" strokeWidth={2.5} />
  </div>
  <span className="text-base font-bold tracking-tight font-display" style={{ color: '#EDF1FA' }}>DBAcademy</span>
  {/* CTA button */}
  <Link href="/learn" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
    style={{ background: '#00C7BE', color: '#07090F' }}>
    Start Learning
  </Link>
</nav>
```

### Card
```tsx
<div className="rounded-2xl p-6 transition-all duration-300 shine-hover"
  style={{ background: 'rgba(0,199,190,0.08)', border: '1px solid rgba(0,199,190,0.18)' }}>
```

### Primary CTA button (amber)
```tsx
<button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold cursor-pointer shine-hover"
  style={{ background: '#F59E0B', color: '#07090F', boxShadow: '0 0 32px rgba(245,158,11,0.3)' }}>
```

### Secondary button
```tsx
<button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold cursor-pointer"
  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}>
```

### Accent badge
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
  style={{ border: '1px solid rgba(0,199,190,0.25)', background: 'rgba(0,199,190,0.08)', color: '#00C7BE' }}>
```

### Ghost decorative background text
```tsx
<div className="absolute -top-8 -left-4 select-none pointer-events-none font-display font-extrabold leading-none"
  style={{ fontSize: 'clamp(120px, 20vw, 200px)', color: 'transparent',
    WebkitTextStroke: '1px rgba(0, 199, 190, 0.06)', zIndex: 0 }}>
  DB
</div>
```

### Ambient glow blobs
```tsx
<div className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none blur-[120px] opacity-[0.07]"
  style={{ background: '#00C7BE' }} />
<div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none blur-[100px] opacity-[0.05]"
  style={{ background: '#F59E0B' }} />
```

### VS Code-style activity bar (sidebar nav)
```tsx
<div className="flex-shrink-0 w-12 flex flex-col items-center py-1.5"
  style={{ background: '#07090F', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
  <button
    style={isActive
      ? { background: 'rgba(0,199,190,0.12)', color: '#00C7BE' }
      : { color: '#2E3A52' }}>
    {/* Active indicator */}
    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: '#00C7BE' }} />}
    <Icon />
  </button>
</div>
```

### Code editor mockup (hero element)
```tsx
<div className="rounded-2xl overflow-hidden"
  style={{ background: '#0C1018', border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,199,190,0.08)' }}>
  {/* Title bar */}
  <div className="flex items-center gap-2 px-4 py-3"
    style={{ background: '#111724', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444', opacity: 0.7 }} />
    <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B', opacity: 0.7 }} />
    <div className="w-3 h-3 rounded-full" style={{ background: '#22C55E', opacity: 0.7 }} />
    <span className="ml-3 text-xs font-mono" style={{ color: '#2E3A52' }}>query.sql</span>
  </div>
  {/* Syntax highlighted code */}
  <div className="p-5 font-mono text-sm leading-7">
    <span style={{ color: '#00C7BE' }}>SELECT</span>
    <span style={{ color: '#EDF1FA' }}> * </span>
    <span style={{ color: '#00C7BE' }}>FROM</span>
    <span style={{ color: '#F59E0B' }}> users</span>
    {/* Keywords: #00C7BE, identifiers/strings: #F59E0B, text: #EDF1FA, comments: #5C6B8A */}
  </div>
</div>
```

---

## CSS Utility Classes (globals.css)

| Class | Effect |
|-------|--------|
| `.mesh-bg` | Teal + amber radial gradient on `--bg` |
| `.grid-overlay` | 48px subtle grid pattern |
| `.glass-card` | `#0C1018` backdrop-blur glassmorphism |
| `.glow-teal` | Teal box-shadow glow |
| `.glow-warm` | Amber box-shadow glow |
| `.diagonal-section` | clip-path: 94% diagonal bottom |
| `.diagonal-section-reverse` | clip-path: 6% diagonal top |
| `.shine-hover` | Shimmer sweep on hover |
| `.marquee-track` | Infinite horizontal scroll |
| `.stagger-1` to `.stagger-6` | Staggered page-load slideUp animations |
| `.text-gradient-teal` | Teal gradient clipped to text |
| `.text-gradient-warm` | Amber gradient clipped to text |
| `.heading-xl` | Display font, weight 800, tight tracking |
| `.heading-lg` | Display font, weight 700, tight tracking |
| `.shimmer` | Skeleton loading pulse |
| `.font-display` | Bricolage Grotesque |

---

## Page Structure Templates

### Marketing page (home, pricing)
```
1. Fixed ambient glow blobs (pointer-events-none)
2. Fixed grid overlay (.grid-overlay)
3. Sticky glassmorphism nav (h-16, backdrop-blur)
4. Hero section (asymmetric 2-col: text left, visual right)
   - Ghost "DB" text behind
   - .stagger-1 through .stagger-5 on hero content
5. Marquee stats strip
6. Features grid (alternating tilt: sm:rotate-1, sm:-rotate-1)
7. Diagonal CTA section (.diagonal-section)
8. SiteFooter
```

### App page (learn, dashboard)
```
1. Sticky header (h-14, #0C1018, teal logo)
2. Main content area
3. SiteFooter (dashboard only — not learn, which is fullscreen app)
```

---

## Scroll Behavior

- **Marketing pages** (home, pricing, dashboard): `overflow: auto` (default). Do NOT set `overflow: hidden` on the page wrapper.
- **App shell** (learn page): The outer div uses `md:h-screen md:overflow-hidden` via Tailwind to lock the viewport. The `body` itself does NOT have `overflow: hidden`.

---

## Forbidden Patterns

- Blue/indigo accent colors (`blue-600`, `indigo-500`, etc.) for UI chrome
- `cursor: none` on interactive elements without a custom cursor overlay JS implementation
- Emoji icons — use Lucide SVG icons throughout
- `overflow: hidden` on `body` (breaks marketing page scroll)
- Tailwind `dark:` variants on new code — the app is forced dark via ThemeProvider, use direct style values
- Inter, Roboto, Arial, system-ui, Space Grotesk fonts

---

## Engine color coding (project switcher, badges)

```
SQLite  → #F59E0B (amber)
PostgreSQL → #00C7BE (teal)
NoSQL   → #22C55E (emerald)
```
