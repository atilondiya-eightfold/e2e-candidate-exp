# Story Verification Criteria

Run this checklist against EVERY story after writing a batch. Fix all HARD FAIL items before moving to the next batch. Flag SOFT FAIL items for review but don't block.

---

## How to Verify

After writing each batch (3-5 stories):
1. Read this file
2. For each story in the batch, run through the checklist below
3. Mark each criterion as PASS / FAIL
4. Fix all HARD FAIL items inline before presenting the batch
5. Note SOFT FAIL items in a "Verification Notes" section at the bottom of the batch

---

## Per-Story Checklist

### HARD CRITERIA (must pass — batch is blocked if any story fails)

**H1. Story Header completeness**
- [ ] Has a stable ID in PREFIX-NNN format
- [ ] "As a" names a specific approved persona (not generic "user")
- [ ] "I want to" is a concrete action verb (not "manage" or "handle")
- [ ] "So that" states measurable business value
- [ ] Priority is Phase 1/2/3
- [ ] Dependencies listed (or "None")
- [ ] Research citation present (competitor + pattern)

**H2. User Journey specificity**
- [ ] Numbered steps with sub-steps
- [ ] Every step says what's ON SCREEN (not just what happens conceptually)
- [ ] Every interactive element says what HAPPENS when activated
- [ ] Conditional branches are explicit (if X → then Y)
- [ ] No vague steps like "user manages their settings" — must say what fields, what buttons

**H3. Screen Inventory exists and is complete**
- [ ] Table with columns: Screen Name | Route | Persona(s) | Purpose
- [ ] Every screen mentioned in user journey appears in table
- [ ] Routes follow convention: /{scope}/{resource} or /{scope}/{resource}/:id
- [ ] Modified existing screens marked with [Modified]

**H4. Field Inventory exists and is complete**
- [ ] One table per screen (or per screen area for complex screens)
- [ ] Every field has: name, specific type, required flag, validation rule, default
- [ ] Type is specific (not just "input" — must be "text input", "select (4 options)", "date picker", etc.)
- [ ] Validation is specific (not "valid" — must be "1-100 chars", ">= today", "unique per tenant")
- [ ] Table columns listed as individual rows

**H5. Acceptance Criteria are testable**
- [ ] Minimum 8 criteria
- [ ] Each criterion is one specific behavior (not compound)
- [ ] Each is verifiable by screenshot, API response, or console check
- [ ] No vague criteria ("works correctly", "handles errors", "is responsive")
- [ ] At least 1 criterion each for: happy path, validation error, empty state, permission

**H6. Edge Cases table exists with minimum coverage**
- [ ] Minimum 5 rows
- [ ] Has at least one row in each mandatory category:
  - Empty state (zero data / first-time experience)
  - Boundary (max limit / date conflict / numeric extreme)
  - Permission denied (wrong role attempts action)
  - Conflict (concurrent edit / stale data)
  - Mid-workflow interruption (browser close / network loss)
- [ ] Each "Expected Behavior" is specific (not "show error" — must say what error, where, with what recovery)

**H7. Permissions table exists with full persona coverage**
- [ ] Table with columns: Role | Access | Scope | What They Can Do
- [ ] Every approved persona appears (even if "None" access)
- [ ] Access levels use: Full / Limited / Read-only / Self only / None
- [ ] Scope is specific (not "some" — must be "assigned departments", "direct reports", "own data")
- [ ] "What They Can Do" lists specific actions in THIS story

**H8. Screen States defined for every screen**
- [ ] One state table per screen in the story
- [ ] All 4 states present: Empty, Loading, Populated, Error
- [ ] Empty state has: illustration/icon description, message text, CTA button
- [ ] Loading state specifies what shows skeleton placeholders
- [ ] Error state has: specific message text, retry action

### SOFT CRITERIA (should pass — flag but don't block)

**S1. Status Enums & Transitions**
- [ ] Present if story introduces a stateful entity
- [ ] Every transition has a trigger
- [ ] Status values in CAPS

**S2. Filters, Sort & Search**
- [ ] Present for every list/table screen
- [ ] Filter types specified (dropdown, date range, toggle)
- [ ] Default sort order specified
- [ ] Pagination defaults specified

**S3. Configurability**
- [ ] Present (even if "All configuration is inline in this story's workflow")
- [ ] Distinguishes admin-editable from hardcoded

**S4. Dependencies**
- [ ] Story IDs are valid (reference existing stories or are clearly forward references)
- [ ] No circular dependencies

**S5. Internal consistency**
- [ ] Field names in Field Inventory match field names in User Journey
- [ ] Screen names in Screen Inventory match screen names in User Journey
- [ ] Persona names in Permissions match personas in Story Header
- [ ] Status values in Enums match status badges mentioned in User Journey

---

## Batch-Level Checks (run once per batch, not per story)

**B1. Cross-story consistency within batch**
- [ ] Shared entities use the same field names across stories
- [ ] Status enums are consistent (don't call it "ACTIVE" in one story and "LIVE" in another)
- [ ] Persona permissions don't contradict between stories

**B2. Dependency ordering**
- [ ] No story in this batch depends on a story that hasn't been written yet (in this or a prior batch) without being a declared forward reference

**B3. Screen deduplication**
- [ ] If two stories reference the same screen, one says "[Modified]" and the other defines it
- [ ] No conflicting definitions of the same screen
