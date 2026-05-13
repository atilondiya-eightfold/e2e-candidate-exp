# Component Selection Rules

Rules for choosing the right component, variant, and layout pattern. These prevent the most common visual hierarchy mistakes and UX anti-patterns.

---

## Dialogs Replace Native Browser Alerts

**Never call `window.alert()`, `window.confirm()`, or `window.prompt()`** — not even in mock or prototype code "just to demo the flow." Native browser dialogs:
- Look broken next to a designed UI (they're styled by the OS, not the design system)
- Can't be tested visually with `preview_screenshot`
- Block the JS thread, which is incompatible with React's render lifecycle
- Make the prototype unconvincing during stakeholder review

| Native call | Replace with |
|---|---|
| `alert("Saved!")` | A Sonner toast (`toast.success("Saved")`) — already in shadcn/ui at `@/components/ui/sonner` |
| `confirm("Delete?")` | A `Dialog` with explicit Cancel + Confirm buttons (destructive variant for irreversible actions) |
| `prompt("New name:")` | A `Dialog` with an `Input` field |
| Mock-submit feedback | Navigate to a success screen, or render an inline success banner via `EmptyState` / `ErrorBanner` |

```tsx
// ❌ WRONG — native confirm
function discard(): void {
  if (confirm("Discard this draft? Unsaved data will be lost.")) {
    navigate({ to: "/directory" })
  }
}

// ✅ CORRECT — Dialog
const [confirmOpen, setConfirmOpen] = useState(false)

<Button variant="outline" onClick={() => setConfirmOpen(true)}>Cancel</Button>

<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <DialogContent>
    <DialogHeader><DialogTitle>Discard this draft?</DialogTitle></DialogHeader>
    <DialogBody>
      <p className="text-sm text-muted-foreground">Unsaved data will be lost.</p>
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep editing</Button>
      <Button variant="destructive" onClick={() => navigate({ to: "/directory" })}>Discard</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Pill / Chip / Badge Colors

**Never hardcode `bg-black`, `bg-foreground`, or raw hex values for pill backgrounds.** On a light theme `bg-foreground` resolves to near-black, which looks unintentional on small chips and conflicts with the design system's intended colors.

### Use the `Tag` component or the muted-tinted pattern

```tsx
// ✅ BEST — Tag from ef-design-system, properly tokenized
import { Tag, TagGroup } from '@/components/ef-design-system'
<Tag size="24" variant={isActive ? 'selected' : 'default'}>{label}</Tag>

// ✅ ACCEPTABLE — muted background for inactive, tinted brand for active
className={isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}

// ❌ WRONG — opaque foreground or black
className={isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}
//                    ↑ when --primary resolves to a dark navy/black this looks like a "disabled" pill, not an "active" one

// ❌ WRONG — raw hex
className="bg-[#000000] text-white"
```

### Status pill colors

Status pills (e.g. employee status, document expiry) use semantic background tints, NOT solid foreground colors:

| Status | Tailwind classes |
|---|---|
| Success / Active | `bg-green-100 text-green-800` |
| Warning / On Leave / Expiring | `bg-amber-100 text-amber-800` |
| Neutral / Inactive | `bg-slate-100 text-slate-700` (or `bg-muted text-muted-foreground`) |
| Destructive / Terminated / Expired | `bg-red-100 text-red-800` |
| Pending review | `bg-blue-100 text-blue-800` |

The 100/800 split keeps contrast accessible without going to solid black or solid brand color.

---

## Filter Chip Overflow

**At desktop widths (≥1024px) the filter chip row must fit on a single line.** Wrapping into 2+ lines on desktop signals "I have too many controls competing for attention" and consumes vertical space that should go to the data below.

If you have more than ~6 chips, switch to one of these patterns:

| Chip count | Pattern |
|---|---|
| 1–6 | Inline `TagGroup` (default) |
| 7–12 | Horizontal scroll: `<div className="flex gap-2 overflow-x-auto">` with edge fades |
| 13+ | Group into a multi-select dropdown ("Type ▾" opens a checklist) |

```tsx
// ❌ WRONG — flex-wrap creates 2-line chip rows on desktop
<div className="flex flex-wrap gap-2">
  {chips.map(chip => <Chip key={chip} />)}
</div>

// ✅ CORRECT — horizontal scroll keeps it 1 line, overflow accessible via scroll
<div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
  {chips.map(chip => <Chip key={chip} className="flex-shrink-0" />)}
</div>
```

The same problem appears inside table cells: a status pill in a narrow column will wrap to two lines. Add `whitespace-nowrap` to the pill, OR widen the column with `min-w-[120px]` on the corresponding `DataTableHead`.

---

## Slide-Over and Dialog Close Buttons

**`Sheet` and `Dialog` from shadcn/ui already render a close button in the top-right corner.** Adding your own `<X />` button in your custom header creates two close affordances stacked next to each other.

```tsx
// ❌ WRONG — duplicate close button (one from SheetContent, one from your header)
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent className="w-[380px] p-0">
    <div className="flex items-center justify-between border-b p-4">
      <h2>Document Details</h2>
      <button onClick={onClose}><X /></button>  {/* ← duplicate */}
    </div>
    ...
  </SheetContent>
</Sheet>

// ✅ CORRECT — let SheetContent provide the close button
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent className="w-[380px] p-0">
    <div className="border-b p-4">
      <h2>Document Details</h2>
    </div>
    ...
  </SheetContent>
</Sheet>

// ✅ Override only when you need a custom close (rare)
<SheetContent showCloseButton={false} className="w-[380px]">
  <div className="flex items-center justify-between border-b p-4">
    <h2>Document Details</h2>
    <button onClick={onClose}><X /></button>
  </div>
</SheetContent>
```

The same rule applies to `Dialog` / `DialogContent` — it ships with a close button. Don't add your own unless you're suppressing the built-in.

---

## Button Hierarchy

### One Primary Per Visible Context

The main CTA is the **only** `variant="primary"` (filled) button on screen. Everything else is secondary, outline, or ghost.

```tsx
// ✅ CORRECT — one primary, rest are outline/ghost
<Button variant="outline">Cancel</Button>
<Button variant="primary">Submit Review</Button>

// ❌ WRONG — two filled buttons side by side
<Button variant="destructive">Cancel</Button>
<Button variant="primary">Send Reminder</Button>
```

### Row-Level Actions = Always Secondary

Table row buttons use `variant="outline"` or `variant="ghost"`. Never `variant="primary"` in a table row — it competes visually with the page-level CTA.

```tsx
// ✅ Row action
<Button variant="outline" size="sm">Approve</Button>

// ❌ Row action with primary variant
<Button variant="primary" size="sm">Approve</Button>
```

### Destructive Action Placement

- Destructive button = **leftmost** position, uses `variant="destructive"`
- Primary CTA = **rightmost** position
- Never two filled buttons side by side in a table or action bar

### Modal Footer Pattern

```tsx
<DialogFooter>
  <Button variant="outline">Cancel</Button>           {/* leftmost */}
  <Button variant="primary">Confirm</Button>           {/* rightmost */}
</DialogFooter>
```

Use `variant="destructive"` for the confirm button **only** when the action is irreversible (delete, permanently remove).

---

## Layout Patterns

### Slide-Over Panel for Table Drill-Down

When a user is working through a **table** (review queue, calibration grid, employee list), clicking a row opens a **slide-over panel (~540px)** — not a full page.

**Why:** The user needs to process multiple rows sequentially. Full-page navigation breaks their context and forces back-button clicking. A slide-over lets them close → click next row → continue.

Use `Dialog` from ef-design-system or a custom Sheet component positioned on the right.

### Back Button Logic

| Navigation Source | Show Back Button? |
|-------------------|-------------------|
| Clicked a **card** on a dashboard | Yes — back to dashboard |
| Clicked a **table row** (slide-over) | No — close panel instead |
| Navigated via **nav tab** / sidebar | No — nav is persistent |
| Navigated via **dropdown** (Profile, Settings) | No |
| Navigated via **bell icon** (Notifications) | No |

### Tabs Inside Panels for Content Types

When a detail view (slide-over or page) has multiple content categories, use `Tabs`:

```tsx
<Tabs defaultValue="overview">
  <TabsList variant="line">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="feedback">Peer Feedback</TabsTrigger>
    <TabsTrigger value="review">Manager Review</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  <TabsContent value="feedback">...</TabsContent>
  <TabsContent value="review">...</TabsContent>
</Tabs>
```

Don't stack all content types vertically — it creates an endless scroll.

### Accordion for Multiple Items of Same Type

When showing multiple items of the same kind (4 peer reviewers, 6 goals, 3 review cycles), use an accordion pattern — collapsed by default, expand on click.

```tsx
// Each peer reviewer = collapsible section
// Shows reviewer name + summary when collapsed
// Expands to show full form responses on click
```

This prevents "wall of content" and lets users focus on one item at a time.

---

## Card Rules

### Card Trailing = Chevron Only

The trailing (right) area of a clickable card contains **only** a chevron icon (`ChevronRight`). No badge stacked above the chevron, no button in the trailing area.

Status information goes in the card **body** as a `Badge` or `Pill` component.

```tsx
// ✅ CORRECT
<div className="flex items-center gap-3">
  <div className="flex-1">
    <p className="font-medium">{title}</p>
    <Badge variant="primary" size="24">In Progress</Badge>  {/* status in body */}
  </div>
  <ChevronRight className="h-4 w-4 text-muted-foreground" />  {/* trailing = chevron only */}
</div>

// ❌ WRONG — badge + button stacked in trailing
<div className="flex flex-col items-end">
  <Badge>3 items</Badge>
  <Button size="xs">View</Button>
</div>
```

### Max 2 Chips Per Card

| Chip Slot | Content | Style |
|-----------|---------|-------|
| Chip 1 | Deadline or urgency | Colored (`variant="destructive"` if overdue, `variant="secondary"` if upcoming) |
| Chip 2 | Progress count | Neutral (`variant="outline"`) |

Don't repeat information that's already in the card title or description. Don't add decorative chips (timestamps, tags, etc.) that don't help the user decide what to do.

### Group by Information Type

Different data types need different visual treatments:

| Data Type | Component | Example |
|-----------|-----------|---------|
| **Trajectory** (trends over time) | Line chart, sparkline, trend indicator | Performance trend, goal velocity |
| **Progress** (checklist/completion) | Progress bar, checklist, stepper | Review completion, onboarding steps |
| **Attribute** (single value) | Inline text, Badge, StatCard | Rating, department, hire date |

Don't make a trajectory and an attribute look the same by putting them both in identical cards.
