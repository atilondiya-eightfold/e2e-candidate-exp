# Enterprise Data Patterns

Rules for building data-heavy screens: dashboards, tables, admin tools. These patterns prevent "dashboard wallpaper" (pretty charts nobody acts on) and flat list UIs that don't match enterprise workflows.

---

## Action-Oriented Metrics

Every metric on a dashboard must trace: **See → Understand → Decide → Act**.

**Rule:** If a number can't be clicked to drill down, don't show it.

```tsx
// ✅ CORRECT — clickable metric that leads somewhere
<Link to="/manager/tasks?status=blocked">
  <StatCard label="Blocked" value={3} icon="block" color="red" variant="outlined" />
</Link>
// Clicking "3 Blocked" → filtered task list showing those 3 tasks

// ❌ WRONG — decorative number with no action path
<StatCard label="Avg. Rating" value="3.4" icon="star" color="grey" variant="outlined" />
// User sees 3.4 and thinks "so what?" — no way to see who's above/below
```

**Test for every dashboard metric:** "If a manager sees this number and wants to act, what do they click?" If there's no answer, either add the drill-down or remove the metric.

---

## Column Picker on Every Table

Every `DataTable` with 5+ columns should include a column picker.

**Implementation:**
- "Columns" `Button` (variant="outline", size="sm") in the table toolbar
- Opens a `Dialog` with checkboxes for each column + drag handles for reorder
- Some columns are locked/required (e.g., Name column can't be hidden)
- User preferences stored in component state (mock stage) or localStorage

```tsx
// Table toolbar pattern
<div className="flex items-center justify-between mb-4">
  <Input placeholder="Search..." shape="pill" leadingIcon="search" />
  <div className="flex gap-2">
    <Button variant="outline" size="sm" leadingIcon={<SlidersHorizontal />}>Filters</Button>
    <Button variant="outline" size="sm" leadingIcon={<Columns3 />}>Columns</Button>
  </div>
</div>
```

---

## Recursive Depth Selector on People Tables

Any table that shows people in an org hierarchy needs a depth selector.

**Implementation:**
- `Select` dropdown in the table toolbar
- Options: "Direct Reports" | "2 Levels" | "3 Levels" | "All Levels"
- Default: "Direct Reports"
- Child rows are visually indented with a subtle left border or tree connector
- Child rows may have a slightly muted background (`bg-muted/50`)

```tsx
<Select defaultValue="direct">
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Depth" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="direct">Direct Reports</SelectItem>
    <SelectItem value="2">2 Levels</SelectItem>
    <SelectItem value="3">3 Levels</SelectItem>
    <SelectItem value="all">All Levels</SelectItem>
  </SelectContent>
</Select>
```

---

## Admin Tools = Hierarchical, Not Flat

Admin screens that manage collections of items with sub-items must show a **two-level hierarchy**, not a flat list.

**Pattern:** List of containers → click into container → see/edit items inside

| Domain | Level 1 (list) | Level 2 (detail) |
|--------|----------------|-------------------|
| Form Builder | Form templates | Questions within a form |
| Cycle Manager | Review cycles | Steps/phases within a cycle |
| Role Manager | Role definitions | Permissions within a role |

**Wrong:** A flat list of all questions across all forms with an "Add" button. Users can't tell which form a question belongs to.

**Right:** A list of form templates (cards or table rows). Click a form → see its questions with add/edit/reorder controls.

**Per-item config belongs on the item.** If sharing settings are per-question, put the sharing toggle on each question row inside the form — don't create a separate "Sharing" wizard step.

---

## Inline Editing for Single-Field Updates

When a user needs to change **one field** in a table row (e.g., a rating, a status, a due date), use an inline control — not a modal.

| Edit Type | Inline Control |
|-----------|---------------|
| Rating (1-5, scale) | `Select` dropdown in the cell |
| Status | `Select` or `Badge` click-to-cycle |
| Date | Date picker popover |
| Short text | Click-to-edit input |

**Modal only for multi-field forms** — when the user needs to edit 3+ fields together (e.g., full employee profile, review form with multiple questions).

---

## Peer/Multi-Source Data Display

When showing data from multiple sources of the same type (e.g., 4 peer reviewers), always show the **aggregate first**, then individual items.

```
Peer Average: 3.7 (4 peers)          ← summary with count for reliability
├─ Reviewer 1: Alex Rivera      ▸    ← collapsed accordion row
├─ Reviewer 2: Priya Patel      ▸
├─ Reviewer 3: Sam Chen         ▸
└─ Reviewer 4: Jordan Kim       ▸
```

The count tells reliability — "3.7 from 4 peers" means more than "3.7 from 1 peer".

---

## Human-Readable Labels

No abbreviations or jargon without context.

| Wrong | Right | Why |
|-------|-------|-----|
| H12026 | Current (H1 2026) | Add context to the abbreviation |
| Est. Aug 2026 | Unlocks Aug 2026 | Action-oriented — tells what happens |
| 3.7 | 3.7 (4 peers) | Count adds reliability context |
| Q3 Review | Q3 2026 Performance Review | Full name on first mention |
| PIP | Performance Improvement Plan | Spell out on first use, abbreviate after |

**Rule:** If a label requires domain knowledge to understand, expand it. The first-time user should be able to read the screen without a glossary.
