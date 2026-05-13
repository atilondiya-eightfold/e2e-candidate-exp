# eightfold-api/_generator

Maintainer-only tooling. Customers cloning this boilerplate **never** run anything in this folder.

## Modes

### `pnpm gen:eightfold` (default — emits per-entity files)

Regenerates per-entity files (`types/<entity>.ts`, `services/<entity>.service.ts`, `hooks/use-<entity>.ts`, `docs/<entity>.md`) from `api-catalog.json`. No network. CI-runnable.

Use this when:
- You hand-edit `api-catalog.json` (e.g. add a `gotcha`).
- Factory output format changes and you want to refresh per-entity files.

### `pnpm gen:eightfold --catalog [--source <path>]`

Bootstraps or refreshes `api-catalog.json` from the local Eightfold vscode repo. Local file reads only — **no network**.

Reads:

1. **api_server_v2.json** — `<source>` arg, default `~/Downloads/eightfold/vscode/www/api_generator/configs/api_server_v2.json`. Provides entity list, ops, paths, caller_ids, parameters, and a string reference to each op's request/response schema (e.g. `"external_objects.profile_schema.ProfileSchema"`).
2. **Marshmallow schemas** — `~/Downloads/eightfold/vscode/www/external_objects/<schema_file>.py` for each schema referenced. Generator parses `get_field(field_type=..., description=..., getter=...)` calls and resolves `SchemaTypes.<key>` cross-refs through `external_objects/base_constants.py`'s `SchemaTypes` enum.

Writes `api-catalog.json` with schemas inlined.

Use this when:
- Initial bootstrap.
- Upstream Eightfold APIs drift (new entities, new ops, schema changes).

## Files

- `generate.ts` — the script.
- `schema-overrides.json` — optional. Maps unresolvable `SchemaTypes.<key>` or non-standard schema refs to local mappings. Add entries when the parser logs an unresolved ref. Created lazily; absent means no overrides yet.
- `README.md` — this file.

## Bootstrap workflow

1. Confirm vscode repo exists at `~/Downloads/eightfold/vscode/www/`.
2. `pnpm gen:eightfold --catalog` → writes `api-catalog.json`.
3. Review `git diff frontend/src/features/eightfold-api/api-catalog.json`.
4. Hand-curate `gotchas`, `batchLimit`, `writesAsync` in catalog where appropriate (lift from existing `docs/<entity>.md` for the 18 currently-shipped surfaces; leave empty for the 17 new entities).
5. `pnpm gen:eightfold` → regenerates per-entity files.
6. Review per-entity diff.
7. `pnpm run lint && pnpm run build && pnpm run test` — fix breakages from any consumer / schema mismatch.
8. Commit catalog + per-entity files.

## How `--catalog` resolves Marshmallow → JSON Schema

Marshmallow `field_type` → JSON Schema mapping:

| Marshmallow | JSON Schema |
|---|---|
| `FieldTypes.string`, `FieldTypes.email` | `{ "type": "string" }` |
| `FieldTypes.int`, `FieldTypes.float` | `{ "type": "number" }` |
| `FieldTypes.boolean` | `{ "type": "boolean" }` |
| `FieldTypes.datetime`, `FieldTypes.date` | `{ "type": "string", "format": "date-time" / "date" }` |
| `FieldTypes.dict`, `FieldTypes.typed_dict`, `FieldTypes.raw` | `{ "type": "object" }` |
| `[FieldTypes.X]` | `{ "type": "array", "items": <X> }` |
| `SchemaTypes.foo` | resolved to nested `{ "type": "object", "properties": {...} }` from `<file>.<class>` |
| `[SchemaTypes.foo]` | array of nested object |

`request_only=True` fields are excluded from response schemas. `dump_only=True` fields are excluded from request schemas. All other fields appear in both.

## Why not apidocs.eightfold.ai?

Earlier design considered fetching `${docUrl}.md` from apidocs.eightfold.ai per op (~150 HTTP requests). Rejected because:

- Network-dependent (rate limits, DNS, transient failures).
- Slug derivation rules (`caller_id` → `<slug>-1`) had ~5-10% miss rate, requiring manual override list.
- Local repo (`vscode/www/external_objects/`) is the upstream source of truth — apidocs is generated from it. One step closer = fewer translations + fewer bugs.
