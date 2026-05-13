---
name: db-architect
description: Use when screen designs, user stories, and architect Pass 1 are approved and the project needs a PostgreSQL schema with SQLModel classes, index strategy, and an ER diagram. Never skip the consolidation phase — fewer tables by default. Also triggers when the user says "design the database", "create an ER diagram", "plan the data model", "spec out tables", or when forger has no approved `db-design.md`.
---

# DB Architect

## Overview

Produces a PostgreSQL 15+ schema: table inventory, SQLModel class definitions (with soft-delete + audit + timestamps), index strategy, and a Mermaid ER diagram. Domain-agnostic — every table, column, and relationship is derived from the project's screens and stories.

Runs **inline in the forger parent thread** (not as a Task subagent). Asks clarifying questions mid-run. Output is `docs/db-design.md` + `designs/db-er-diagram.md`.

## When to Use

- After `architect` Pass 1 approval.
- User says "design the database", "model the data", or asks for an ER diagram.
- Forger reports no approved `db-design.md`.

## Pre-conditions

- Approved screens (React mocks from react-ux-designer in `frontend/src/`).
- Approved `docs/user-stories.md` + augmentation files under `docs/stories/<id>/story.md`.
- Approved `docs/architecture.md` (Sections 1–4 from architect Pass 1).

Stop and flag the upstream if any missing. Reference `_shared/style-rules/sqlmodel-patterns.md` for canonical patterns — cite it rather than restating.

## Workflow — Six Sequential Phases

Present each phase in chat, confirm via `AskUserQuestion`, proceed.

### Phase 1 — Table Inventory

**Step 1a: Scan inputs.** Read `frontend/src/` + stories + architecture Section 2. Extract every noun representing stored data. Do not invent — every table must trace to a screen or story.

Organize into three tiers:

| Tier | Description |
|---|---|
| Core | Central business objects |
| Transactional | Events, state changes, user actions |
| Support | Lookups, config, audit trails |

Present inventory table: `Table name | Tier | Source (screen/story ID) | One-line purpose`.

**Step 1b: Consolidation check.** Default position is **fewer tables**. Every candidate must justify itself. Apply these rules in order:

1. **Eliminate thin tables.** Candidate has ≤3 meaningful columns (excluding id/timestamps/deleted_at)? Fold into parent. A separate table is justified only when the entity has its own lifecycle, is referenced from >1 parent, or appears independently on a screen.
2. **Fold non-queryable child data into the parent.** Child exists only to store data never queried via WHERE/JOIN/ORDER BY, always has one parent? Use a `JSON` column instead. Extra joins for nothing = no.
3. **Consolidate structurally similar entities with a type column.** Two candidates share parent FK + status lifecycle + core columns? Merge, add a `type: enum.Enum` column. Variant-only columns become nullable, documented in a comment.
4. **Only split when the difference is structural.** Separate tables justified only when >½ columns differ, FK relationships differ, or queries never mix the types.

For each consolidation: "Merged [A] and [B] into [merged_name] with a `type` column. Extra columns: [list]. Reason: [screen/story evidence]." Confirm via `AskUserQuestion` before finalising.

**Step 1c: Surface ambiguities.** For every cardinality question not answerable from inputs: `"[A] and [B] appear related on [screen/story]. One-[A]-to-many-[B], or one-to-one?"` `AskUserQuestion` all Phase 1 questions in one batch.

### Phase 2 — Relationships & Cardinality

After answers, map every relationship: `Table A <relationship> Table B | FK placement | ON DELETE behaviour`.

Notation: `1:1`, `1:N` (FK on N side), `M:N` (junction `<a>_<b>`).

**ON DELETE rules:** All tables soft-delete (no physical DELETE). `ON DELETE` only fires if parent is physically deleted (should never happen). Default FK rule: `RESTRICT`. Use `CASCADE` only for a child meaningless without parent; `SET NULL` only when child must survive.

See `_shared/style-rules/sqlmodel-patterns.md` for full FK cascading rules — make every relation's `ON DELETE` explicit per the retro lesson (cite `docs/retros/db-architect-retro.md`).

### Phase 3 — SQLModel Definitions

Produce full SQLModel classes. **Read `_shared/style-rules/sqlmodel-patterns.md` for column conventions, soft-delete contract, audit fields, enum display-name mapping, Alembic reversibility.** Cite rather than restate.

Essentials (from style-rules):
- PK: `id: UUID = Field(default_factory=uuid4, primary_key=True)`
- Timestamps: `created_at`, `updated_at` TIMESTAMPTZ, NOT NULL
- Soft delete: `deleted_at: datetime | None = Field(default=None)`
- Audit: `created_by`, `updated_by` → User FK
- Enum: Python `str, enum.Enum` subclass + Field default
- Money: `Decimal` with `max_digits` + `decimal_places`, never float
- JSON bucket: `dict | None = Field(..., sa_column=Column(JSON))` for non-queryable attribute groups
- FK: `parent_id: UUID = Field(foreign_key="parent_table.id")`

**Enum display-name contract (MANDATORY).** For every enum column, emit both DB values and display mapping alongside the model:

```
EmployeeStatus:
  values: ACTIVE, ON_LEAVE, TERMINATED, SUSPENDED
  display:
    ACTIVE → "Active"
    ON_LEAVE → "On Leave"
    ...
```

FE and BE both consume this. See `_shared/style-rules/fastapi-patterns.md` for the API-layer contract.

**JSON vs individual columns.** Apply test per column:

| Question | If yes | If no |
|---|---|---|
| Ever in WHERE? | Individual | JSON bucket |
| Ever in JOIN? | Individual | JSON bucket |
| Ever in ORDER BY / GROUP BY? | Individual | JSON bucket |
| Referenced by FK? | Individual | JSON bucket |

All four "no" → JSON bucket. Name the bucket after the data category (`metadata_`, `config`, `settings`) and document expected keys in the docstring.

**Roles & permissions pattern (apply only if screens/stories show role-based access).** Three layers, don't deviate:
1. **Permissions** — `Permission` model, rows are `<resource>:<action>` strings derived from screens (e.g., `reports:view`). Not enum values.
2. **Roles** — `Role` model + `RolePermission` junction (M:N).
3. **User role assignment** — `UserRoleAssignment` junction with `assigned_at`, `assigned_by`, optional `expires_at`.

Runtime permission set = union across assigned roles. If only 2–3 hard-coded roles without dynamic assignment, a simple `role` enum column on User suffices — skip the full pattern. If every user has the same access, omit entirely.

### Mandatory entity — `AuditLog`

Every schema includes `AuditLog`. Append-only — no `updated_at`, no `deleted_at`.

| Column | Purpose |
|---|---|
| `table_name: str` | Which table |
| `record_id: UUID` | Which row |
| `action: AuditAction` enum | insert / update / soft_delete |
| `changed_by: UUID` FK | User |
| `changed_at: datetime` | When |
| `old_values: dict \| None` | JSON |
| `new_values: dict \| None` | JSON |

Indexes: `(table_name, record_id)`, `changed_at`. Rows immutable.

### Phase 4 — Index Strategy

Every index derived from a specific screen or story query — no speculative indexes. For each: model + columns, query pattern supported (e.g., "list screen filters by status + owner_id"), type (regular / unique / composite / partial / GIN).

Decision tree per table:
1. **List queries** — columns in WHERE/ORDER BY on list/search screens.
2. **Lookup queries** — columns fetching a single row (besides PK).
3. **Join columns** — every FK queried from the child side.
4. **Soft-delete filter** — partial index: `Index(..., postgresql_where=text("deleted_at IS NULL"))`.
5. **Full-text search** — `GIN` + `tsvector`.

Specification via `__table_args__`:

```python
__table_args__ = (
    Index("ix_entity_status_owner", "status", "owner_id"),
    Index("ix_entity_active", "status", postgresql_where=text("deleted_at IS NULL")),
)
```

Naming: `ix_<table>_<cols>`, `uq_<table>_<cols>`, `gin_<table>_<col>`, suffix `_active` for partial.

Budget by row volume: <100k → 6; 100k–1M → 8; >1M write-heavy → 4.

### Phase 5 — Mermaid ER Diagram

After SQLModel definitions approved, emit a `erDiagram` block covering all tables. Rules: only the project's tables, show PK + FK columns only, label each line with the FK column name, group by tier via `%% Core`, `%% Transactional`, `%% Support` comments. Cardinality: `||--o{` (1:N), `||--||` (1:1), `}o--o{` (M:N via junction).

Example structure (table names come from the project):

```
erDiagram
  %% Core
  entity_a {
    uuid id PK
    varchar name
    uuid entity_b_id FK
  }
  entity_b {
    uuid id PK
    varchar code
  }
  entity_a }o--|| entity_b : "entity_b_id"
```

### Phase 6 — Migration Ordering Note

When multiple new tables reference each other, state creation order: parent first, child with FK second. Alembic autogenerate doesn't always get this right. Source: `docs/retros/db-architect-retro.md`.

## Output Files

**`docs/db-design.md`**:
```
# Database Design
## 1. Table Inventory           [tier table]
## 2. Relationship Map          [FK placement + ON DELETE]
## 3. SQLModel Definitions      [full classes, grouped by tier, with imports + enums]
## 4. Index Definitions         [per model + query pattern supported]
## 5. ER Diagram                [Mermaid block]
## 6. Migration Ordering        [creation order for linked tables]
```

**`designs/db-er-diagram.md`** — Mermaid block only, GitHub/Notion-renderable.

## Delivery

`AskUserQuestion` at every gate:

| Gate | Options |
|---|---|
| Phase 1 clarifications | One question per ambiguity |
| Phase 2 cardinality | "Approve all" / "Change a relationship" |
| Phase 3 SQLModel review | Per-model group: "Approve" / "Request changes" |
| Phase 4 index review | "Approve" / "Adjust" |
| Phase 5 ER diagram | "Approve & write files" / "Adjust" |

Never ask the user to type confirmations.

## Rules

1. **Derive, never assume.** Every table/column/relationship traces to screens or stories. Not in inputs → not in schema.
2. **Always soft-delete.** `deleted_at` on every table; queries filter `WHERE deleted_at IS NULL`. No exceptions.
3. **Always create `AuditLog`.** Regardless of domain. Append-only.
4. **Fewer tables by default.** Apply Step 1b consolidation rules before writing any model.
5. **PostgreSQL 15+ only.** `JSONB`, `tsvector`/`GIN`, partial indexes, CTEs, window functions freely used.
6. **No application-enforced-only constraints.** Business rules expressible as DB constraints go via `CheckConstraint` in `__table_args__`.
7. **UUID PKs default** (matches boilerplate). Add `seq` integer secondary index only for cursor-paginated tables.
8. **Document every model.** One-sentence docstring.
9. **No emoji in output files.**
10. **Match boilerplate patterns.** Read `backend/app/models/user.py` before writing any models. Import style and Field patterns mirror it.
11. **Enum display-name contract.** Every enum column ships with value→display mapping — see `_shared/style-rules/sqlmodel-patterns.md`. Source: `docs/retros/db-architect-retro.md`.
12. **FK fully specified.** Every FK declares `ON DELETE`, `ON UPDATE`, nullability, indexed status. No CASCADE-by-default.

## After Completion

- `docs/db-design.md` + `designs/db-er-diagram.md` written.
- ER diagram rendered inline in chat.
- Hand off to forger for approval gate.
- On approval: **api-architect** runs next.
