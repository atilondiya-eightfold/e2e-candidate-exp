# Responsive Design Rules

Every page must work at three viewport widths: **mobile (375px)**, **tablet (768px)**, and **desktop (1280px)**. Skipping responsive verification has caused every previous prototype to need rework during the build phase — when a stakeholder opens it on an iPad and the table is unreadable.

Responsive testing is part of **Foundation** in the execution order. Don't defer it to "polish."

---

## Required Viewport Tests

Before handing a screen back to forger, verify it at all three breakpoints using `preview_resize`:

```ts
// Required test sequence per page
preview_resize({ preset: 'mobile' })   // 375 × 812
preview_screenshot()                    // capture and check
preview_resize({ preset: 'tablet' })   // 768 × 1024
preview_screenshot()
preview_resize({ preset: 'desktop' })  // 1280 × 800
preview_screenshot()
```

Pass criteria for each viewport:
- No horizontal scroll on the body (only inside intentional scroll containers)
- All primary CTAs visible and tappable (≥44px touch target on mobile)
- All text legible (no overlapping or clipped labels)
- Tables either fit, scroll horizontally with a visible affordance, or collapse to a card layout

---

## Breakpoint Reference (Tailwind defaults)

| Token | Width | Typical use |
|---|---|---|
| `sm:` | 640px | Larger phone, smaller tablet |
| `md:` | 768px | Tablet portrait — start adopting multi-column layouts |
| `lg:` | 1024px | Tablet landscape / small laptop — sidebars become viable |
| `xl:` | 1280px | Standard desktop |
| `2xl:` | 1536px | Large desktop |

Mobile-first: write base classes for mobile, then add `md:` / `lg:` overrides for larger screens. Avoid `max-` breakpoints (e.g. `max-md:hidden`) — they read backwards and create divergent specificity.

---

## Common Pitfalls (and the fix)

### Fixed-width sidebars at mobile

```tsx
// ❌ WRONG — sidebar consumes 240/375 = 64% of mobile screen
<aside className="w-[240px] fixed top-0 left-0">…</aside>
<main className="ml-[240px]">…</main>

// ✅ CORRECT — collapse to drawer below lg
<aside className="hidden lg:flex w-[240px] fixed top-0 left-0">…</aside>
<main className="lg:ml-[240px] px-4 lg:px-8">…</main>
{/* Mobile: hamburger button opens an overlay drawer */}
```

Better still: use top nav per [information-architecture.md](information-architecture.md) — no sidebar at all, no responsive logic needed.

### Tables overflowing

```tsx
// ❌ WRONG — table cells can't shrink, viewport scrolls horizontally
<table className="w-full">…</table>

// ✅ CORRECT — wrap in horizontal scroll container with sticky first column
<div className="overflow-x-auto">
  <table className="w-full min-w-[640px]">…</table>
</div>

// ✅ ALTERNATIVE — collapse to card list below md
<div className="md:hidden">{rows.map(r => <RowCard key={r.id} row={r} />)}</div>
<table className="hidden md:table w-full">…</table>
```

### Filter chip rows wrapping

See [component-selection.md](component-selection.md) "Filter Chip Overflow." Don't `flex-wrap` — use `overflow-x-auto` or collapse to a dropdown.

### Modal width > viewport

```tsx
// ❌ WRONG — fixed 960px width breaks at every viewport <960px
<DialogContent className="max-w-[960px]">…</DialogContent>

// ✅ CORRECT — capped width but always less than viewport
<DialogContent className="max-w-[min(960px,calc(100vw-2rem))]">…</DialogContent>

// ✅ BETTER — responsive max-width
<DialogContent className="w-full max-w-full sm:max-w-2xl lg:max-w-4xl">…</DialogContent>
```

### Stat card grids

```tsx
// ❌ WRONG — 4 columns at every width = ~93px cards on mobile
<div className="grid grid-cols-4 gap-4">

// ✅ CORRECT — grow with viewport
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```

### Navbar collapsing

The `Navbar` from `@/components/ef-design-system` collapses to a hamburger menu automatically below the breakpoint configured in its props. Don't manually hide nav items — let Navbar handle it.

---

## Touch Targets on Mobile

At mobile widths, all interactive elements must be **≥44×44px** (Apple HIG / WCAG AA recommended). `Button size="xs"` (~24px tall) is too small for primary actions on mobile — use `size="sm"` (~36px) or `size="default"` (~44px).

Filter chips can stay smaller (24–30px) because they're typically used in clusters; but ensure adequate spacing (`gap-2` minimum) so adjacent chips aren't accidentally tapped.

---

## When Mobile Doesn't Apply

If a screen is **explicitly desktop-only** (e.g. an admin grid that requires keyboard shortcuts and dense data display), document this in the screen inventory presented to the user during IA approval. Even then, the page should not break visually at 768px+ — just be unusable for primary tasks.

Default assumption: every screen needs to work on every viewport.
