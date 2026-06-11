# DB Academy Design System & UI/UX Principles

## 1. Core Philosophy: "IDE-grade Education"
The central design thesis of DB Academy is to bridge the gap between **educational content** and **professional tooling**. The interface is not designed as a standard content website (like a blog), but as an **Integrated Development Environment (IDE)**.

### Key Principles
*   **Immersive Utility**: The user should feel like they are working, not just reading. The code editor is a first-class citizen, equal in importance to the learning material.
*   **Immediate Feedback**: Every action (running a query, changing settings) should have an instant, visible reaction.
*   **Distraction-Free Focus**: The UI uses high-contrast separation between panels to allow users to focus on one context (reading vs. coding) at a time while keeping both visible.

---

## 2. Visual Identity

### Color Palette
We utilize a **Slate-based** neutral palette for structure, ensuring code highlighting stands out.

*   **Primary Brand**: `Blue-600` (Light Mode) / `Blue-500` (Dark Mode).
    *   *Usage*: Primary actions (Run), Active tabs, Success states, Links.
*   **Backgrounds**:
    *   **Canvas**: `Slate-50` (Light) / `Slate-950` (Dark).
    *   **Panels**: `White` (Light) / `Slate-900` (Dark).
    *   *Rationale*: Reduces eye strain during long coding sessions (Dark mode is default-favored/supported).
*   **Semantic Colors**:
    *   **Green**: Success/Seeding complete.
    *   **Red**: Error messages/Destructive actions (Reset DB).
    *   **Amber/Yellow**: Warnings/Hints.

### Typography
*   **UI Font**: **Inter** (via Google Fonts). clean, modern, and highly legible at small sizes (essential for dense UI).
*   **Code Font**: **Monospace** (Browser default or Fira Code equivalent).
    *   *Rationale*: Preserves code alignement and readability.

### Iconography
*   **Library**: `lucide-react`.
*   **Style**: 2px stroke, rounded caps. Consistent, professional, and lightweight.

---

## 3. Responsive Design Strategy
Responsiveness is not an afterthought; it is a **fundamental architectural decision** due to the complexity of the "3-Pane" layout (Sidebar, Content, Editor).

### The "Stack vs. Split" Pattern
We employ a drastic layout shift between Mobile (< 768px) and Desktop (≥ 768px).

#### Desktop Experience (Wide Viewport)
*   **Layout**: `Flex-Row` (Horizontal).
*   **Overflow**: `Hidden` (Screen is fixed to `100vh`).
*   **Scroll Behavior**: Individual panels scroll internally. The page never scrolls.
*   **Goal**: Maximum information density. All tools usage simultaneously.

#### Mobile Experience (Narrow Viewport)
*   **Layout**: `Flex-Col` (Vertical Stack).
*   **Overflow**: `Auto` (Page scrolls natively).
*   **Sizing**: Panels enforce `min-height` (e.g., `500px`) to ensure usability.
*   **Goal**: Focused attention. The user scrolls to the section they need (Reading -> Coding -> Viewing Results).

### Critical Mobile Optimizations
1.  **Compact Headers**: Non-essential labels (like "Engine:") are hidden on mobile to preserve space for critical controls (Run Button).
2.  **Navigation as Context**: The Sidebar moves to the top and becomes a navigation anchor/summary rather than a full-height list.
3.  **Touch Targets**: Buttons and tabs are sized (`py-3`, `min-h-[44px]`) to be finger-friendly.

---

## 4. Component Architecture
The UI is built using **Atomic Design** principles, implemented via **Tailwind CSS**.

*   **Layout Wrapper**: Functions as the layout controller, switching `flex-direction` based on breakpoints.
*   **LessonView**:
    *   *Desktop*: `flex-1`, scrolling internal container.
    *   *Mobile*: Fixed minimum height, flows with page scroll.
*   **SqlEditor**:
    *   Uses `monaco-editor` (or similar) wrappers that auto-resize.
    *   On mobile, it is given a generous dedicated height to prevents "trapped cursor" issues where scrolling maps to the editor instead of the page.

## 5. Implementation Guidelines for Future Features
When adding new features, follow these rules to maintain design integrity:

1.  **Always definition Mobile State**: If adding a new panel, define how it stacks on mobile.
2.  **Dark Mode First**: Verify all new colors against `Slate-900` backgrounds.
3.  **No Global Scroll on Desktop**: Never break the `100vh` constraint on desktop. If content is long, put it in a scrollable container (`overflow-auto`).
