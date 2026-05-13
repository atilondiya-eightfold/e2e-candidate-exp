# Provenance

This repo was bootstrapped from three sources at the commits below. No upstream sync after this point — pure fork.

Bootstrap date: 2026-05-13T06:29:02Z

## Sources

- **talent-forge** (`.claude/skills/`)
  - Path: /Users/atilondiya/Desktop/repos/talent-forge
  - Commit: 788a07c37
- **talent-forge-2** (`frontend/`, `backend/`, `Dockerfile`, `render.yaml`)
  - Path: /Users/atilondiya/Desktop/repos/talent-forge-2
  - Commit: 1c4e8a36e
- **vscode** (`docs/specs/`, `docs/mockups/`, `docs/user-stories.md`, `docs/backend-spec.md`)
  - Path: /Users/atilondiya/Desktop/repos/vscode
  - Commit: 433ba89d0ba
  - Branch: atilondiya/candidate-prep-adaptive-design

## Dev log

### 2026-05-13 — First screen: empty state (US-1.1)

Built the first-visit empty state at `/prep/$applicationId` from the canonical mockup
`docs/mockups/empty-state-v2.html` via the `react-ux-designer` skill.

Files added under `frontend/src/features/candidate-prep/`:
- `strings.ts` — centralized copy (NFR-6 i18n prep)
- `mocks/empty-state.ts` — deterministic mock application + timeline
- `components/ApplicationCard.tsx`, `ApplicationTimeline.tsx`, `PrepSuggestionCard.tsx`
- `pages/EmptyStatePage.tsx`
- Route: `frontend/src/routes/prep/$applicationId/index.tsx`

Boilerplate touched:
- `frontend/src/routes/__root.tsx` — added `UNGATED_PREFIXES = ["/prep"]` so the
  candidate-prep route bypasses the boilerplate's `AuthGate`. The candidate-prep flow
  carries its own PCS-issued session token (per design spec §4); when the BFF endpoints
  land, the route will read that token directly rather than go through the boilerplate's
  `/api/auth/session` cookie path.

Skill-pipeline deviations (documented for future sessions):
- The `react-ux-designer` skill expects Forge inputs (`docs/domain-doc.md`, `docs/personas.md`,
  `docs/stories/<id>/story.md`). This project uses the locked equivalents in `docs/specs/`,
  `docs/user-stories.md`, and `docs/mockups/` instead. The skill was briefed manually with
  the right input paths.
- Skipped `PersonaSwitcher` and `StateDebugBar` — single persona, no state branching yet.
- Used the existing chrome-less `AppShell` (intended for iframe embedding) rather than
  reproducing the mockup's top nav strip. Top nav presumed to come from the parent
  application; revisit when the actual deployment shape is decided.

Known mobile polish: 6-stage timeline overflows at 375px width. Spec NFR-3 marks the
empty state as a reading screen but doesn't lock the timeline treatment; revisit when
the hub steady-state screen is built (same component).

Up next: hub steady-state (`hub-meta.html`, US-2.1) — same route, data-driven branch.
Will need the BFF's `/state` endpoint live (waiting on backend api-catalog update).

---

## Sync — 2026-05-13 (api-contract + headless-apis spec + real-tenant gate)

Sources updated on `atilondiya/candidate-prep-adaptive-design` branch of vscode after initial bootstrap. New files copied in:

| Source (vscode) | Target (this repo) | What it is |
|---|---|---|
| `docs/candidate-prep/api-contract.md` | `docs/api-contract.md` | **Frontend API contract** for the 7 v2 endpoints — auth, response envelope, errors, all endpoint shapes |
| `docs/superpowers/specs/2026-05-12-candidate-prep-headless-apis-design.md` | `docs/backend-headless-apis-spec.md` | Backend implementation design for the same 7 endpoints (ephemeral prep-session, HMAC-encoded, no DB) |
| `docs/candidate-prep/phase1-gate-decision.md` | `docs/phase1-gate-decision.md` | Updated with real-tenant S1/S2 PASS verdicts (was BLOCKED) |
| `docs/candidate-prep/phase1-s2-livekit.md` | `docs/phase1-s2-livekit.md` | Real-tenant LiveKit init_call verification + the two seeding prerequisites for Phase 2 mock |

vscode commit at sync time: `4741007d38b` (HEAD of `atilondiya/candidate-prep-adaptive-design` after bootstrap) plus subsequent commits up through `463d97a2ba2`.

The `mock/feedback/active` endpoints are intentionally NOT in `api-contract.md` — that's Phase 2 work. v0 of this React app covers gap report / readiness / stage content / calendar / prep-session creation only.
