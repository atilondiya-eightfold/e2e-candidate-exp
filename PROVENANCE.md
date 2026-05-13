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

---

## Dev log — 2026-05-13 (full UI + API wiring)

### What landed

**Full mock UI** (commit `c825c55`): every screen from `docs/mockups/` — hub
steady-state, gap report, mock launch / active / feedback, study plan,
transcript, error states — built under `frontend/src/features/candidate-prep/`
with the shared mock-data fixture, the TopNav / PillButton / ChipsCluster /
ErrorPanel components, and a dev-only `DemoToolbar` that flips a Zustand store
across `empty / populated / loading / error` so every workflow-test-plan state
is reachable from one URL. All buttons wired to TanStack Router navigation.

**API contract wiring** (commit `bbfbf84`):
- 7 hand-written TanStack Query hooks in
  `frontend/src/features/candidate-prep/hooks/index.ts` against the v0
  contract in `docs/api-contract.md`. One per endpoint, typed against
  `api/types.ts`. `useStageCalendarDownload` is a mutation that fetches the
  .ics blob and triggers the browser download per contract §3.7.
- Thin fetch client at `api/client.ts` — unwraps the `{ data, errors }`
  envelope, adds a 5s timeout via AbortController so a hanging proxy fails
  fast.
- TanStack Query key registry at `api/keys.ts`.
- `noRetryOn404` policy: bail immediately on 404/401/403 **and** on
  status-less errors (network / abort) so a downed BFF doesn't trigger a
  15s retry cascade.

**BFF**: no new route file. The existing catch-all `ef_proxy` already
forwards `/api/v2/candidate_prep/*` to `apiv2.<tenant>.ai/api/v2/...` and
mints per-`sub` jwt_bearer tokens via the boilerplate's `TokenCache`. So
zero backend work was needed beyond extending `app/services/mock_eightfold.py`
with canned candidate-prep responses for offline dev (fires only when
`ENVIRONMENT=local` AND the upstream call errors or the OAuth mint fails).

**Hub-to-API selector** (`hooks/use-prep-state.ts`): composes
`useApplication`, `useGapAnalysis`, `useReadiness`, `useStageContent` into
the `PrepState` display shape the page already consumed. The DemoToolbar
state acts as an explicit override (`empty` / `loading` / `error` short-
circuit the API entirely; `populated` fans out to the hooks). When
`populated` mode is on but the backend is unreachable, the selector falls
back to the local fixture so the hub still renders something — a hackathon-
friendly default. Set DemoToolbar to `error` to see the explicit error UI.

### AuthGate reconciliation — decision recorded

The first build added `UNGATED_PREFIXES = ["/prep"]` to bypass the
boilerplate's AuthGate. Now that BFF endpoints exist and need the
candidate's email for `sub`, the bypass is gated behind a Vite env flag:

- `VITE_REQUIRE_PREP_AUTH=true` — `/prep/*` goes through AuthGate (prod).
- Unset (default) — `/prep/*` renders without AuthGate (local dev,
  hackathon previews).

In both modes the BFF proxy reads the candidate's email from the cookie
(or the `EFTF_DEV_EMAIL` fallback) and mints the OAuth token server-side.
The frontend never sees the token. The full-bleed layout (no AppShell
chrome) stays the same in both modes — only the gate flips.

Path forward when production-ready: set `VITE_REQUIRE_PREP_AUTH=true` in
`frontend/.env.production`. No code change.

### Known gaps / Phase 2 boundary

- **Mock-interview surfaces** (mock launch / active / feedback / transcript)
  remain on the local fixture per `docs/phase1-gate-decision.md`. The hub's
  Mock History tile still reads from the fixture's `populatedState.mocks`
  because the API doesn't surface this yet.
- **Per-dimension chip vocabulary** from spec §7 isn't in the v0 API
  (`gaps[].skill_name` is the only string we get per gap). The gap-report
  card mapping in `use-prep-state.ts` therefore returns empty `studyTopics[]`
  for API-sourced dimensions. Locked fixture chips still appear when the
  selector falls back to the fixture.
- **Study plan** structure (per-dimension sections) is richer than what
  `/stage/:id/content` returns. v0 keeps the fixture's section grouping;
  `StudyPlanPage` is not yet wired to the API.
- **Gap report / mock launch / study plan / transcript / feedback pages**
  still consume the fixture directly. Only the hub root is wired to the
  selector. Each remaining page is the same pattern — point it at
  `usePrepData` (or the relevant hook) and let the selector handle states.
- **No integration smoke test** added for the proxy on candidate_prep
  paths. The existing `tests/api/routes/test_ef_proxy.py` covers the catch-
  all contract, and the mock-fallback paths are pure data.

### Up next

1. Set `VITE_REQUIRE_PREP_AUTH=true` + verify against a real dev tenant
   (`eightfolddemo-atilondiya.com` per the OAuth provisioning notes).
2. Wire `GapReportPage`, `StudyPlanPage` to the same selector + their
   own hooks; fall back to fixture on error like the hub does.
3. Add an integration smoke test for the proxy on candidate_prep paths —
   one happy path (`GET /applications`) is enough.
4. When Phase 2 mock-interview APIs land, wire `MockLaunchPage` etc.
