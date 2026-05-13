# SQLModel + Alembic Schema Discipline

**Purpose:** single source of truth for database schema conventions in the TalentForge backend. PostgreSQL 15+, SQLModel, Alembic. Every rule here corresponds to a bug shipped in COREHR v1 — missing audit fields, unclear cascades, enum display drift, migration ordering.

---

## 1. Soft-Delete + Audit Fields — Mandatory

Every user-generated-content model carries these columns. No row is ever physically deleted.

```python
class Entity(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
        nullable=False,
    )
    deleted_at: datetime | None = Field(default=None)
    created_by: UUID | None = Field(default=None, foreign_key="user.id")
    updated_by: UUID | None = Field(default=None, foreign_key="user.id")
```

Queries filter `WHERE deleted_at IS NULL`. Pair with a partial index: `Index(..., postgresql_where=text("deleted_at IS NULL"))`. System tables (AuditLog, reference data) may exempt `deleted_at` — document why in the class docstring.

## 2. FK Cascade Rules — Explicit Per Relation

Every foreign key declares `ondelete` explicitly. Never rely on inferred defaults.

```python
parent_id: UUID = Field(
    sa_column=Column(ForeignKey("parent.id", ondelete="CASCADE"), nullable=False)
)
```

| Scenario | `ondelete` |
|----------|-----------|
| Child is meaningless without parent | `CASCADE` |
| Child must survive parent removal | `SET NULL` (FK nullable) |
| Removal blocked while children exist | `RESTRICT` (default) |

Because every row is soft-deleted, `ondelete` only fires on physical deletes (rare). Declare `RESTRICT` as default unless the relation explicitly requires otherwise. v1 shipped an audit_trail FK that would have orphan-cascaded compensation records.

## 3. Enum Columns — Python Enum + Display Mapping

Every enum column uses a `str, enum.Enum` subclass AND ships with a display mapping consumed by the API layer.

```python
class EmployeeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"

EMPLOYEE_STATUS_LABELS: dict[EmployeeStatus, str] = {
    EmployeeStatus.ACTIVE: "Active",
    EmployeeStatus.ON_LEAVE: "On Leave",
    EmployeeStatus.TERMINATED: "Terminated",
}
```

The API returns both: `{"value": "ON_LEAVE", "label": "On Leave"}`. The label mapping is documented in `docs/db-design.md` and referenced by `docs/api-spec.md`. v1 leaked SCREAMING_SNAKE values into the DOM because the mapping was implicit.

## 4. Index Discipline — One Per Documented Query

For every index, a specific user-story-driven query pattern must exist. No speculative indexes. Rules:

- All FKs queried from the child side: indexed
- `status` columns that appear in list filters: indexed
- History tables: composite `(entity_id, effective_date DESC)`
- Search columns: `GIN` with `tsvector` or trigram
- Soft-delete-filtered queries: partial index `postgresql_where=text("deleted_at IS NULL")`

```python
class Entity(SQLModel, table=True):
    __table_args__ = (
        Index("ix_entity_status_owner", "status", "owner_id"),
        Index("ix_entity_active", "status", postgresql_where=text("deleted_at IS NULL")),
    )
```

Naming: `ix_<table>_<cols>`, `uq_<table>_<cols>`, `gin_<table>_<col>`, `_active` suffix for partial. Budget: ≤6 indexes for <100k rows, ≤8 for <1M, ≤4 for write-heavy >1M.

## 5. Naming Conventions

| Layer | Style | Example |
|-------|-------|---------|
| Python class (model) | PascalCase | `ReviewCycle`, `EmployeeDocument` |
| Database table | snake_case auto-derived | `reviewcycle` (SQLModel default) or explicit `__tablename__ = "review_cycle"` |
| Column | snake_case | `created_at`, `employee_id`, `is_active` |
| Primary key | `id: UUID` | always UUID, default `uuid4` |
| FK column | `<parent>_id` | `employee_id`, `cycle_id` |
| Boolean | `is_` or `has_` prefix | `is_active`, `has_submitted` |
| Timestamp | `_at` suffix | `created_at`, `submitted_at` |

Use explicit `__tablename__` when the class name produces an ambiguous or reserved DB identifier.

## 6. Mandatory Entities

Every schema ships with `AuditLog` — append-only, immutable, no `updated_at` / `deleted_at`. Captures INSERT / UPDATE / soft-delete across all tables.

```python
class AuditLog(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    table_name: str
    record_id: UUID
    action: AuditAction
    changed_by: UUID = Field(foreign_key="user.id")
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    old_values: dict | None = Field(default=None, sa_column=Column(JSON))
    new_values: dict | None = Field(default=None, sa_column=Column(JSON))

    __table_args__ = (
        Index("ix_auditlog_table_record", "table_name", "record_id"),
        Index("ix_auditlog_changed_at", "changed_at"),
    )
```

Data-export endpoints (>N rows of PII/compensation) MUST write `AuditAction.EXPORTED` with actor + row count + filter state.

## 7. Alembic Migrations — Reversible, Manually Reviewed

After `alembic revision --autogenerate`:

1. **Read the generated file.** Autogenerate is a starting point, not the answer.
2. **Enum changes**: Alembic does NOT detect changes to PostgreSQL enum values. Manually add:
   ```python
   op.execute('ALTER TABLE "user" ALTER COLUMN role DROP DEFAULT')
   op.execute("ALTER TYPE userrole RENAME TO userrole_old")
   op.execute("CREATE TYPE userrole AS ENUM ('EMPLOYEE', 'MANAGER', ...)")
   op.execute('ALTER TABLE "user" ALTER COLUMN role TYPE userrole USING role::text::userrole')
   op.execute("DROP TYPE userrole_old")
   ```
3. **FK creation ordering**: If table A has FK to table B, B must be created first in `upgrade()`, dropped last in `downgrade()`.
4. **Default values**: Drop old default before type change, add new default after.
5. **downgrade() populated**: Every migration is reversible. `downgrade()` that's just `pass` is a bug — at minimum drop the tables/columns that `upgrade()` added.

## 8. Model Registration

New models MUST be imported in `app/models/__init__.py`, or Alembic won't see them and autogenerate will be empty.

```python
# app/models/__init__.py
from app.models.user import User
from app.models.employee import Employee
from app.models.review_cycle import ReviewCycle
# every new model listed here
```

Same for route registration: `app/api/main.py` includes every new router.

## 9. Money and Text Sizing

- **Money**: `Decimal = Field(max_digits=15, decimal_places=4)` — never `float`. Backend returns as JSON string; frontend uses `parseFloat()` before arithmetic or `Intl.NumberFormat`.
- **Short text**: `Field(max_length=255)` for names/titles
- **Long text**: `Field(max_length=2000)` for descriptions; `sa_column=Column(Text)` for open-ended
- **JSON bucket**: `dict | None = Field(default=None, sa_column=Column(JSON))` — only for attributes that will never appear in WHERE / JOIN / ORDER BY / FK

## 10. Spec-vs-Impl Drift — Zero Tolerance

Field names, enum values, and status transitions in `docs/db-design.md` must match the SQLModel classes exactly. Verifier greps both on every phase — any drift fails the gate. Update the spec in the same commit as the schema change.

---

*Source: COREHR v1 retro, apex-perf retro, Retro v2 (2026-04-20). Raw: docs/retros/*
