---
name: design-system
description: Defines the visual identity, typography hierarchy, obsidian palette, and component design tokens for Story Builder.
---

# Story Builder Design System & Aesthetic Standards

This skill guides agents in designing and implementing cohesive, aesthetically refined interfaces for the Story Builder creative writing platform.

---

## 1. Visual Identity & Atmosphere: "Obsidian Writer's Studio"

Story Builder is an immersive authoring environment. It blends the focused darkness of modern developer tools with the editorial elegance of literary publications.

### Core Color Palette:
- **Canvas Base**: `bg-slate-950` / `#0a0d14` (Deep obsidian canvas)
- **Layer 1 Surface (Cards & Sidebars)**: `bg-slate-900/90` with subtle border `border-slate-800/80`
- **Layer 2 Surface (Elevated Inputs & Nested Cards)**: `bg-slate-800/60` with `border-slate-700/60`
- **Accent Primary (Creative Energy)**: Indigo / Violet (`indigo-500` to `violet-500` gradients, `indigo-400` text)
- **Accent Interactive (Choices & Branching)**: Sky / Cyan (`sky-400`, `sky-500/20` subtle fills)
- **Role Accents**:
  - Protagonist: Emerald (`emerald-500/20`, `text-emerald-400`, `border-emerald-500/30`)
  - Antagonist: Rose (`rose-500/20`, `text-rose-400`, `border-rose-500/30`)
  - Supporting: Amber (`amber-500/20`, `text-amber-400`, `border-amber-500/30`)
  - Neutral: Slate (`slate-700/50`, `text-slate-300`, `border-slate-600/40`)

---

## 2. Typography Hierarchy

- **Brand & Headings**: Clean, high-legibility geometric sans (`font-sans tracking-tight font-semibold`).
- **Narrative & Manuscript Content**: Editorial serif with relaxed line height (`font-serif text-base leading-relaxed text-slate-200 tracking-wide`).
- **Metadata & Badges**: Monospace or compact sans with uppercase tracking (`text-xs uppercase tracking-wider font-semibold text-slate-400`).

---

## 3. UI Component Standards

### Story Node Cards
- Interactive hover transitions (`transition-all duration-200 ease-out hover:border-slate-600`).
- Active state must feature an accent glow and distinct indicator (`border-l-4 border-l-indigo-500 bg-indigo-500/10`).
- Display clear branch indicators and child count metadata.

### Branch Choice Buttons
- Must look like consequential decisions, not generic utility buttons.
- Distinct affordance: subtle gradient or accent left-border, clear destination node hint, smooth hover elevation (`hover:translate-x-1 transition-transform`).

### Character Cards
- Color-coded role pill with an intuitive icon (`Shield` for protagonist, `Flame` for antagonist, `Sparkles` for supporting).
- Avatar monogram circle with role-specific tint.

### Empty States
- Never use a raw dashed gray box with plain text.
- Include a relevant Lucide icon with a soft radial background glow.
- Provide clear, encouraging microcopy that invites the author to take the next creative step.

---

## 4. Design Quality Checklist for Components

- [ ] Does the component respect the 3-surface elevation hierarchy?
- [ ] Is narrative text formatted with editorial typography?
- [ ] Are all icons sourced consistently from `lucide-react`?
- [ ] Do interactive elements feature smooth CSS transitions on hover and focus?
- [ ] Are focus rings styled with `focus:ring-2 focus:ring-indigo-500/50 focus:outline-none`?
- [ ] Does the component maintain accessible contrast (WCAG AA) on dark backgrounds?
