---
name: ui-ux-review
description: Comprehensive visual ergonomics, aesthetics, responsiveness, and interaction design audit against the Story Builder Design System.
---

# UI & UX Review Workflow

Perform visual and interaction design audits to ensure a high aesthetic standard across Story Builder.

---

## Audit Dimensions:

### 1. Visual Hierarchy & Rhythm
- Is there a clear primary focal point on the active screen?
- Are headings, narrative manuscript blocks, and secondary controls visually distinguished?
- Is spacing consistent across margins, paddings, and card gaps (using 4px/8px rhythm)?

### 2. Surface Depth & Elevation
- Does the interface avoid flat monochrome boxes?
- Are cards layered with appropriate borders, subtle inner shadows, or soft backdrops?
- Do floating toolbars and navigation bars utilize blur (`backdrop-blur-md`)?

### 3. Typography & Editorial Tone
- Does narrative content feel literary rather than administrative?
- Are line lengths comfortable for reading (max 65-75 characters per line)?
- Are font sizes, weights, and letter-spacings properly balanced?

### 4. Interactive Affordance & Micro-interactions
- Do buttons and clickable cards exhibit tactile feedback on hover, active, and focus?
- Are loading states graceful skeletons or glowing pulses rather than jarring layout shifts?
- Are empty states inviting and paired with action shortcuts?

### 5. Accessibility & Readability
- Contrast meets WCAG AA standards (minimum 4.5:1 for body text).
- Visible, high-contrast focus rings for keyboard navigation.
- All iconography accompanied by screen-reader text or descriptive aria-labels.

---

## Output:
When requested, document findings in a `UI_UX_AUDIT.md` highlighting:
- **Design Score** (1-10)
- **Strengths**
- **Visual Polish Opportunities**
- **Actionable Fixes**
