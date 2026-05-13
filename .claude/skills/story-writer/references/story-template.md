# Story Template

Every story MUST be written by filling in this template. Do not skip sections. Do not reorder sections. If a section genuinely does not apply, write "N/A — [one-line reason]" instead of omitting it.

---

## HARD SECTIONS (8) — verification fails if any is missing

### Section 1: Story Header

```markdown
#### [ID]: [Title]

**As a** [persona name and role]
**I want to** [specific action — verb phrase]
**So that** [measurable business value]

**Priority:** Phase 1 / Phase 2 / Phase 3
**Depends on:** [story IDs, or "None"]
**Research Citation:** [Competitor] — [one-line pattern adopted or gap flagged]
```

Rules:
- ID format: `PREFIX-NNN` (e.g., REVIEW-001, ADMIN-003, SCHED-005)
- Persona must match an approved persona from the domain doc — use their name and role
- "I want to" must be a concrete action, not "manage" or "handle"
- Research citation is mandatory — check top 3 competitors before writing each story

---

### Section 2: User Journey

Step-by-step walkthrough of exactly what the user sees and does. This is the primary input to react-ux-designer and api-architect.

```markdown
**User Journey — Step by Step:**

1. [User does X] → [What appears on screen]
   - Field: [name], type: [text/dropdown/date/etc], default: [value]
   - Button: [label], action: [what happens on click]

2. [User does Y] → [System response]
   - Table columns: [col1, col2, col3, ...]
   - Filters: [filter1, filter2]
   ...
```

Rules:
- Every step must say what's ON SCREEN (fields, buttons, tables, badges, progress indicators)
- Every interactive element must say what HAPPENS when activated
- Conditional branches must be explicit: "If peer feedback enabled → show nominations step"
- Sub-steps for complex screens (wizards, multi-section pages)

---

### Section 3: Screen Inventory

Explicit list of all screens this story introduces or modifies. This is the build target for react-ux-designer and the reconciliation baseline for phase-verifier.

```markdown
**Screen Inventory:**

| Screen Name | Route | Persona(s) | Purpose |
|-------------|-------|------------|---------|
| Cycle List View | /admin/cycles | HR Admin | Browse all cycles with status filters |
| Cycle Wizard | /admin/cycles/new | HR Admin | 6-step cycle creation |
| Cycle Dashboard | /admin/cycles/:id | HR Admin, HR BP | Monitor active cycle |
```

Rules:
- Every screen mentioned in the user journey MUST appear in this table
- Routes use the convention: `/{persona-scope}/{resource}` or `/{persona-scope}/{resource}/:id`
- If a story modifies an existing screen (adds a tab, column, or button), list it with "[Modified]" suffix

---

### Section 4: Field Inventory

Per-screen table of every field, input, column, and interactive element. This drives mock data types (react-ux-designer), DB column decisions (db-architect), Zod schemas (frontend-ui-engineer), and form testing (QA).

```markdown
**Field Inventory:**

**Screen: [Screen Name]**

| Field | Type | Required | Validation | Default | Notes |
|-------|------|----------|------------|---------|-------|
| Cycle Name | text input | Yes | 1-100 chars | "H1 2026 Review" suggestion | Pre-filled from quarter |
| Cycle Type | select (4 options) | Yes | Must select one | Full Review | Visual cards |
| Start Date | date picker | Yes | >= today | — | Timezone-aware |
| Participant Count | read-only number | — | — | — | Computed from filters |
```

Rules:
- One table per screen (or per screen area for complex screens like wizards — one table per step)
- Type must be specific: "text input", "textarea (rich text)", "select (N options)", "multi-select", "date picker", "toggle", "radio (N options)", "checkbox", "read-only text", "read-only number", "table", "progress bar", "badge"
- Validation must be specific: "1-100 chars", ">= today", "valid email", "unique per tenant"
- For tables: list each column as a separate row with Type = "table column"

---

### Section 5: Acceptance Criteria

Specific, testable checkboxes. Each criterion becomes one test case in QA and one PASS/FAIL item in phase-verifier.

```markdown
**Acceptance Criteria:**

- [ ] [Specific testable behavior — not "works correctly" but exactly what happens]
- [ ] [One behavior per line — not compound statements]
- [ ] [Include both positive and negative cases]
- [ ] [Include UI criteria: loading states, empty states, error messages]
```

Rules:
- Minimum 8 criteria per story (complex stories: 15-25)
- Each criterion must be verifiable by a screenshot, API response, or console check
- Never write vague criteria: "handles errors" → "Network error during save shows 'Save failed — retrying...' banner with retry button"
- Include at least 1 criterion per: happy path, validation, empty state, permission check

---

### Section 6: Edge Cases & Validation

Table of scenarios and expected behavior. Minimum 5 rows covering mandatory categories.

```markdown
**Edge Cases & Validation:**

| # | Category | Scenario | Expected Behavior |
|---|----------|----------|-------------------|
| 1 | Empty state | No cycles exist (first-time user) | Empty state: illustration + "Create your first review cycle" CTA |
| 2 | Boundary | Max 5 nominations, user tries 6th | Search disabled. Message: "Maximum 5 reached. Remove one to add another." |
| 3 | Permission | HR BP tries to launch a cycle | Launch button hidden. Config is read-only. |
| 4 | Conflict | Two admins edit same draft | Last-write-wins with optimistic locking. Warning on save conflict. |
| 5 | Mid-workflow | User closes browser during wizard | Draft auto-saved per step. Resumes on return. |
```

Rules:
- MINIMUM 5 rows per story, covering these categories:
  1. **Empty state** — zero data, first-time experience
  2. **Boundary** — max limits, date conflicts, numeric extremes
  3. **Permission denied** — wrong role attempts access
  4. **Conflict/concurrent** — simultaneous edits, stale data
  5. **Mid-workflow interruption** — browser close, network loss, timeout
- Additional categories (use when applicable): data migration, scale (500+ records), overdue/expired, deletion/archival

---

### Section 7: Permissions — Role + Scope

Structured table defining who can do what in this story. This drives RBAC matrix (api-architect), route guards (frontend-ui-engineer), and negative tests (QA).

```markdown
**Permissions:**

| Role | Access | Scope | What They Can Do |
|------|--------|-------|------------------|
| HR Admin | Full | All employees | All actions in this story |
| HR BP | Limited | Assigned departments | Same actions, data filtered to departments |
| Manager | Read-only | Direct reports | View only, no edit/create/delete |
| Employee | Self only | Own data | View/edit own submissions only |
| IT Admin | None | — | No access to this feature |
```

Rules:
- Every approved persona MUST appear in the table (even if "None" access)
- Access levels: Full / Limited / Read-only / Self only / None
- Scope defines DATA filtering, not action filtering
- "Limited" means same UI as "Full" but data scoped to assigned departments/teams
- What They Can Do: specific actions in THIS story, not generic descriptions

---

### Section 8: Screen States

Per-screen definition of all 4 mandatory data states. react-ux-designer builds these into StateDebugBar toggles. QA tests all 4.

```markdown
**Screen States:**

**Screen: [Screen Name]**

| State | What the user sees |
|-------|-------------------|
| Empty | [Specific empty state: illustration, message, CTA button] |
| Loading | [Skeleton placeholders for: header, table rows, stat cards — specify what skeletonizes] |
| Populated | [Normal view with data — this is the default, described in User Journey] |
| Error | [Error banner with message and retry button. Specific message text.] |
```

Rules:
- One state table per screen in the story
- Empty state MUST have: illustration/icon, descriptive message, and a CTA action (e.g., "Create your first cycle")
- Loading state MUST specify what shows skeleton placeholders (not just "loading spinner")
- Error state MUST have: specific error message text, retry action, and what's still visible (partial data or full error page)

---

## SOFT SECTIONS (4) — required but can be brief

### Section 9: Status Enums & Transitions

State machine for entities in this story. Drives db-architect enum types, backend-writer service logic, and react-ux-designer badge mappings.

```markdown
**Status Enums & Transitions:**

**[Entity Name]:**
DRAFT → SCHEDULED (trigger: admin schedules launch)
DRAFT → ACTIVE (trigger: admin clicks Launch Now)
SCHEDULED → ACTIVE (trigger: scheduled time reached)
ACTIVE → CLOSED (trigger: admin clicks Close)
ACTIVE → CANCELLED (trigger: admin cancels cycle)
```

Rules:
- Only include if the story introduces or modifies a stateful entity
- Every transition must have a trigger (who/what causes it)
- Use CAPS for status values (they become DB enums)

---

### Section 10: Filters, Sort & Search

Per list screen: what fields are filterable, sortable, and searchable. Drives db-architect index strategy and api-architect query parameter design.

```markdown
**Filters, Sort & Search:**

**Screen: [List Screen Name]**
- Search: [which fields — e.g., "name, email, employee ID"]
- Filters: [field1 (dropdown), field2 (dropdown), field3 (date range)]
- Sort: [field1 (default: A-Z), field2, field3]
- Pagination: [rows per page default, e.g., 25/50/100]
```

Rules:
- Only include for screens that show lists/tables
- Be specific about filter types: dropdown, date range, toggle, text search
- Specify default sort order
- Specify pagination defaults

---

### Section 11: Configurability

What is admin-editable vs hardcoded. One paragraph or bullet list.

```markdown
**Configurability:**

- [What's configurable]: [who configures it, where]
- [What's hardcoded]: [why — sensible default for mid-market]
```

Rules:
- Keep it minimal — mid-market customers want sensible defaults, not 50 toggles
- If this story IS the configuration (e.g., cycle setup wizard), say so
- If nothing is configurable beyond what the story describes, write "All configuration is inline in this story's workflow."

---

### Section 12: Story Dependencies

Simple dependency list.

```markdown
**Depends on:** [STORY-ID, STORY-ID] or "None — foundation story"
```

---

## Cross-Cutting Concerns (DOC-LEVEL, not per-story)

The following concerns apply to ALL stories and should be written ONCE at the top of `docs/user-stories.md`, NOT repeated per story:

1. **i18n:** All UI text uses locale keys. Email templates rendered in recipient's language.
2. **Timezone:** Dates displayed in user's timezone. Cycle dates in cycle timezone.
3. **Date/Number Format:** Formatted per user locale preference.
4. **Accessibility:** WCAG AA. Keyboard navigable. ARIA labels. 4.5:1 contrast. Status conveyed by text+color, not color alone.
5. **Multi-tenancy:** All data scoped by tenant_id. No cross-tenant leakage.
6. **Audit Trail:** All state changes logged (who, when, before→after).
7. **Error Handling:** Network errors show retry banner. Partial state preserved.
8. **Data Privacy:** PII access scoped by permissions. Exports logged. GDPR deletion supported.
9. **Performance:** 500+ employee lists use pagination/virtual scroll. Dashboards load <3s.
10. **Mobile/Responsive:** IC and Manager screens must work on mobile (44px touch targets). Admin screens desktop-only.

If a specific story has a NOTABLE EXCEPTION to any cross-cutting concern, add a one-line note in the story's edge cases table.
