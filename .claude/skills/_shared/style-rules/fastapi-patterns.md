# FastAPI Service-Layer Conventions

**Purpose:** single source of truth for FastAPI route and service design in the TalentForge backend. Every rule here corresponds to a production bug shipped in COREHR v1 or apex-perf.

---

## 1. Trailing Slash on Collection Endpoints — Mandatory

FastAPI's default `redirect_slashes=True` returns `307 Temporary Redirect` when a client hits `/users` but the route is `/users/`. The 307 redirect **strips the Authorization header**, producing silent 401s in browsers (curl follows redirects, so it looks fine in tests).

**This caused 37% of bugs in apex-perf.**

```python
# GOOD — collection endpoints always trailing slash
@router.get("/users/")
@router.post("/users/")
@router.get("/users/{user_id}/")
@router.patch("/users/{user_id}/submit/")
```

Clients match exactly: `api.get("/users/")`, `api.get(\`/users/${id}/\`)`. Grep gate on the frontend:

```bash
grep -rn 'api\.' src/features/ | grep '"/' | grep -v '/"'
grep -rn 'api\.' src/features/ | grep '`/' | grep -v '/`'
# Both must be empty
```

## 2. Self-Access Bypass — DEFAULT, Not Exception

For any endpoint returning PII, compensation, documents, or personal history, the self-access check runs BEFORE the role gate. Employees viewing their own data is the most common case; 403'ing them is a UX failure, not a security win.

```python
def check_access(current_user: User, target_employee_id: UUID, allowed_roles: set[Role]) -> None:
    is_own = current_user.employee_id == target_employee_id
    is_privileged = current_user.role in allowed_roles or current_user.is_superuser
    if not is_own and not is_privileged:
        raise HTTPException(403, detail="Insufficient permissions")
```

v1 shipped a compensation-history endpoint that 403'd employees viewing their own data because self-access was treated as edge case.

## 3. Side-Channel Response Fields

Responses include derived permission flags the UI needs to render controls:

```python
return {
    "data": employee.model_dump(),
    "can_edit": current_user.role in {Role.HR_ADMIN} or is_own_and_field_editable,
    "can_delete": current_user.is_superuser,
    "can_assign": current_user.role == Role.MANAGER,
}
```

For creates with ephemeral values (temp_password, login_email, one-time tokens), return them at top level — never bury inside the resource:

```python
return {
    "data": employee_schema,
    "login_email": user.email,
    "temp_password": raw_password,  # surfaced once, never stored
}
```

Document side-channel fields in the endpoint docstring.

## 4. Enum Display-Name Contract

Every enum in a response includes both `value` AND `label`. Client never hardcodes label strings.

```python
class EnumOption(BaseModel):
    value: str
    label: str

class EmploymentTypeResponse(BaseModel):
    type: EnumOption  # {"value": "FULL_TIME", "label": "Full-time"}
```

Labels come from a single mapping per enum (shared with the FE via an `/api/v1/enums/` endpoint or a generated `enums.ts`). v1 shipped `FULL_TIME` / `ON_LEAVE` as literal DOM text across 6 screens because the label mapping was implicit.

## 5. 4-Layer Field Exposure Check (Backend Side)

Adding a new field requires edits to ALL four layers:

1. `app/models/<entity>.py` — DB column
2. `app/schemas/<entity>.py` — API schema (the common bottleneck)
3. `app/services/<entity>.py` — business logic / persistence
4. Frontend `features/<entity>/hooks.ts` — type + render

```bash
grep -n "FIELD_NAME" backend/app/models/*.py backend/app/schemas/*.py \
                    backend/app/services/*.py frontend/src/features/**/hooks.ts
```

Model-only presence is a trap — the Pydantic schema is the common dropped layer.

## 6. CORS — `localhost:*` in Local, Allowlist in Prod

`app/core/config.py` allows `http://localhost:*` (regex) when `ENVIRONMENT == "local"`. Preview tools reassign ports (5173 → 64615 is common); a hardcoded port breaks tooling silently. Production keeps an explicit origin allowlist.

```python
if settings.ENVIRONMENT == "local":
    allow_origin_regex = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
else:
    allow_origins = settings.FRONTEND_ORIGINS  # explicit list
```

## 7. Error Envelope — Structured, Never Bare Strings

```python
raise HTTPException(
    status_code=400,
    detail={"code": "INVALID_STATE", "message": "Cycle is already closed", "field": "status"},
)
```

Shape: `{ code: SCREAMING_SNAKE, message: string, field?: string, detail?: any }`. 403 is distinguishable from 404 — never mask one with the other unless the endpoint is explicitly information-hiding. Frontend reads `error.code` to branch UI; human-readable `message` is fallback.

## 8. Pagination Contract

Cursor-based for list endpoints: `?cursor=<opaque>&limit=20` (default 20, max 100). Response envelope:

```python
return {
    "data": [...],
    "meta": {"cursor": next_cursor, "has_more": bool, "total": total_count},
}
```

No unbounded lists. Offset pagination is forbidden — it breaks under concurrent inserts. The `total_count` is computed once per query and cached per cursor page.

## 9. Validation Runs BEFORE Business Logic

Pydantic model validators reject malformed input before the service method executes. Custom field validators handle cross-field rules (LWD ≥ start_date, salary > 0) that mirror frontend Zod.

```python
class EmployeeUpdate(BaseModel):
    lwd: date | None = None
    start_date: date

    @model_validator(mode="after")
    def validate_lwd(self) -> "EmployeeUpdate":
        if self.lwd and self.lwd < self.start_date:
            raise ValueError("LWD must be on or after start_date")
        return self
```

Backend validation is for security; frontend for UX. Never assume the client validated.

## 10. Argon2 Is a Known Bottleneck

Argon2 password hashing dominates login latency (~200–500ms per call on dev hardware). In perf tests, auth endpoints must be measured in a separate scenario (`auth-perf`) with its own SLA threshold. Never collapse auth into the general load test — it skews p95 across the whole suite.

```python
# pwdlib/argon2 settings are tuned for security, not throughput
# Expected: ~2–5 req/s per worker for /login/access-token
```

## 11. Dedicated Filter Endpoints for Common Subsets

Don't make the frontend filter a 200-item list. If the UI needs "managers", build `GET /employees/managers/` that returns only employees with `direct_report_count > 0 OR User.role IN (MANAGER, HR_ADMIN)`. v1 fetched all active employees and filtered client-side.

## 12. Mutation Responses Return Full Updated Resource

POST/PUT/PATCH always return the updated object wrapped in `{ "data": {...} }`. The client should never need a follow-up GET to render the post-mutation state.

---

*Source: COREHR v1 retro, apex-perf retro, Retro v2 (2026-04-20). Raw: docs/retros/*
