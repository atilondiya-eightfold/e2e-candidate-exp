# ef-design-system + shadcn/ui — Canonical Styling Rules

**Purpose:** single source of truth for component selection and styling in the TalentForge frontend. ef-design-system is the primary library; shadcn/ui is the fallback for components ef-ds does not ship.

---

## 1. Component Resolution Order

| Priority | Rule |
|----------|------|
| 1st | ef-design-system has it → use it |
| 2nd | Only shadcn has it → use shadcn |
| 3rd | Neither has it → compose from both + Tailwind |

ef-design-system ships 27 components at `src/components/ef-design-system/`. shadcn primitives live at `src/components/ui/`. Never mix two versions of the same component in one project.

```tsx
// Primary — always check ef-ds first
import { Button, Badge, StatCard, DataTable, Dialog, Tabs, Input, Select, Progress, Stepper, Navbar, Breadcrumb, Pill, Tag, NumberBadge } from "@/components/ef-design-system";

// Fallback only — Card, Alert, Skeleton, Field, Sidebar, Drawer, Sheet,
// Checkbox, RadioGroup, Switch, Tooltip, Popover, Avatar, Accordion
import { Card } from "@/components/ui/card";
```

## 2. Overlap Table — Always Use ef-ds

Button, Badge, Dialog, Select, Tabs, Progress, Input, Breadcrumb, DropdownMenu, NavigationMenu → ef-ds. Never import the shadcn equivalent for these.

## 3. Badge / Pill Variants — Semantic, Never Default

`Badge variant="default"` renders as CTA cyan (black-looking at 44 size). That is a bug when used for status labels. Choose a variant that matches status meaning:

| Variant | When |
|---------|------|
| `outline` | positive / active (Active, Approved, Clocked In) |
| `secondary` | pending / in-progress (Draft, Scheduled, Pending) |
| `destructive` | negative (Terminated, Rejected, Overdue, Failed) |
| `ghost` | inactive (Archived, Inactive) |
| `default` / `primary` | CTA only, never a status |

```tsx
<Badge variant="outline">Active</Badge>        // GOOD
<Badge>Active</Badge>                          // BUG — renders as CTA
```

Colour tokens come from ef-design-system CSS variables loaded via `tailwind.css`. Never hex-match a badge.

## 4. StatCard Icons Use Material Symbols

`<StatCard icon="...">` renders `<span class="material-symbols-outlined">`. Lucide names render as literal text.

```tsx
icon="group"           // GOOD (people)
icon="check_circle"    // GOOD (check)
icon="users"           // WRONG — renders "USERS" as text
icon="check-circle"    // WRONG — hyphens not allowed
```

Valid names: https://fonts.google.com/icons (underscore, not hyphen). Lucide is reserved for inline `<IconName />` components elsewhere.

## 5. Button Variant Precedence

One primary action per view. Demote others: primary > secondary > ghost > link.

- `primary` — the single screen CTA (Save, Submit, Create)
- `secondary` — co-equal actions (Cancel next to Save)
- `ghost` — tertiary inline actions (row kebab items, "Skip")
- `outline` — filters and toggles
- `destructive` — irreversible (Delete, Terminate)

No two `primary` buttons in the same visible area. Mixing variants produces "everything looks like the main action" ambiguity.

## 6. Every Button Has an Action

Every `<Button>` in a route/page MUST declare one of:

- `onClick={handler}` — real handler that mutates, navigates, or opens a real dialog
- `type="submit"` — inside a form whose `onSubmit` calls an API
- `disabled` — with an accessible reason (tooltip or inline text)
- Wrapped in `<Link>` / `<DialogTrigger>`

Empty handlers, `console.log`, `alert`, and `setState(true)` that opens an actionless dialog are stubs. A button with an action verb label (Save, Submit, Export, Send, Create, Delete, Approve, Reject) MUST call an API mutation or `navigate()`.

```bash
grep -rn '<Button' src/routes/ src/features/ | grep -v 'onClick\|type="submit"\|disabled\|DialogTrigger\|Link'
# Must be empty
```

## 7. Active States — Hover / Focus / Active / Disabled

Every interactive element renders four visually distinct states:

1. **Hover** — cursor over, no click yet (background or border shift)
2. **Focus-visible** — keyboard focus ring (never suppress without replacement)
3. **Active / selected** — current tab, current filter, pressed button
4. **Disabled** — `opacity: 0.3`, `cursor-not-allowed`, `pointer-events-none`

Opacity for disabled is **0.3**, not 0.5. Skipping one of the four states is a UI bug even if the happy path looks right.

## 8. Tailwind 4 Colour Classes — Forbidden for Data-Driven Colour

Tailwind 4 uses CSS-variable theming. Arbitrary palette utilities like `bg-blue-100`, `text-green-700`, `bg-purple-100` do NOT resolve — they render as black or default background. The Badge default-variant bug has the same root cause.

```tsx
// WRONG — renders black
<div className="bg-blue-100 text-blue-700">High</div>

// GOOD — design-token variable
<div className="bg-primary text-primary-foreground">High</div>

// GOOD — data-driven colour via inline style with entity hex
<span style={{ backgroundColor: category.colorHex }}>{category.label}</span>

// GOOD — ef-ds Badge variant
<Badge variant="outline">High</Badge>
```

Allowed Tailwind classes: semantic tokens (`bg-primary`, `text-foreground`, `bg-card`, `border-border`, `bg-destructive`, `bg-muted`, `text-muted-foreground`) plus spacing / layout / flex / grid utilities. Forbidden: `bg-{color}-{n}` / `text-{color}-{n}` for any status, category, or position colour.

## 9. Table Overflow

Tables with 5+ columns MUST be wrapped in `<div className="overflow-x-auto">`. Without this, right-edge columns clip on narrow viewports (the COREHR v1 admin-reports regression).

```tsx
<div className="overflow-x-auto">
  <DataTable bordered>
    <DataTableHeader>{/* 7 columns */}</DataTableHeader>
    ...
  </DataTable>
</div>
```

For very wide tables (>10 columns), add a sticky first column via `position: sticky; left: 0` on the first cell.

## 10. No Duplicate Actions

A row action must appear once — either in the row's primary button OR the kebab menu, never both. Scan every list/card before handoff. Duplicate "Edit" (primary + kebab) ships as the same click with two UI entry points and confuses users.

---

*Source: COREHR v1 retro, apex-perf retro, Retro v2 (2026-04-20). Raw: docs/retros/*
