# Candidate Prep React App — Design Spec

**Date:** 2026-05-13
**Status:** Spec — pending review
**Owner:** atilondiya@eightfold.ai
**Related artifacts:**
- Backend design spec: [`docs/superpowers/specs/2026-05-12-candidate-prep-adaptive-design.md`](../../superpowers/specs/2026-05-12-candidate-prep-adaptive-design.md)
- Phase 1 gate decision: [`docs/candidate-prep/phase1-gate-decision.md`](../../candidate-prep/phase1-gate-decision.md) — selected ✅✅ Full Approach 2
- Mockups: [`docs/candidate-prep/react-app-mockups/`](../../candidate-prep/react-app-mockups/)
- User stories: [`docs/candidate-prep/react-app-user-stories.md`](../../candidate-prep/react-app-user-stories.md)

---

## 1. Goal

Build a candidate-facing React app that consumes the Phase 2 Candidate Prep APIs and presents the adaptive mock interview + gap report + study plan as a coherent, low-pressure prep experience. The app is reached from a button on the candidate's PCS application page and runs as a separate route. The candidate's whole prep flow happens here; the app is voice-only for the mock (the live audio lives in a meeting client, not in our app).

## 2. Non-goals

- Multi-application overview ("all my applications" list) — focus is one application
- In-app live mock interview UI (the audio session runs in the meeting client; we orchestrate but do not render the call)
- Reschedule / message recruiter (deep-link to PCS if needed; v2 may inline)
- Settings / account / preferences
- Notifications, email reminders, calendar integration
- Multi-language support beyond English in v1

## 3. Personas

**Primary — Aarav, candidate.** Has applied via PCS for a Staff SWE role. ~12 days until his technical screen. Wants to prep but doesn't know exactly where to start. Will visit the app 2–5 times over a week, sometimes on phone.

**Implicit — recruiter / interviewer.** Never sees the candidate's practice data. Privacy is a core promise of the product; we surface it explicitly in the UI.

## 4. Architecture overview

```
PCS application page
   │
   │  "Prepare for your screen" button (deep-link)
   ▼
[ React app — Candidate Prep ]
   │
   ├──► Phase 2 backend APIs (§8 of backend spec)
   │       • 9 v2 endpoints (gap report, mock create, etc.)
   │       • Auth: PCS-issued session token (passed via deep-link)
   │
   └──► Meeting client (new tab)
           • LiveKit web URL with token
           • Our agent v2 joins from the other side
           • Returns to our tab on call-end (post-call hook)
```

**Key architectural decisions:**

- **One app per application.** Routes are scoped to a single application/role context, identified by an ID in the URL.
- **State-driven first impression.** The same root route renders the empty-state on first visit (no gap report, no mocks) and the hub on subsequent visits — no flag to flip.
- **Stateless front-end.** All persistent state lives on the backend. The front-end caches in-memory for the session; refresh always re-fetches.
- **Meeting client is external.** The live mock voice UI is the LiveKit web client (or future Meet/Zoom equivalent), opened in a new tab. The Candidate Prep tab shows the launch card, an "in progress" state while the mock runs, and the feedback page after.

## 5. Visual register

Locked in brainstorming. See mockups for canonical examples.

| Aspect | Rule |
|---|---|
| Palette | White background; Meta-blue `#1877f2` for primary actions; neutral greys (`#65676b`, `#8a8d91`) for body. Eightfold navy `#1f3a68` for the product wordmark and where Eightfold branding belongs (header). |
| Spacing | Generous. Page padding ≥ 36px; card padding ≥ 18px. |
| Buttons | Pill-shaped. Primary: solid blue. Secondary: white with blue border. No gradients. |
| Tone | Suggestive. **Never** "you must," "required," "important." Use "Optional," "Suggested," "Recommended next." Reassurance footers. |
| Errors | Soft red (`#fde2e2` / `#c0392b`) for failures, amber (`#fef0d4` / `#b7791f`) for warnings. Reference codes for support tickets. Never expose stack traces, HTTP codes, or API URLs to the candidate. |
| Iconography | Light icon chips on tinted-blue background (`#e7f3ff`). Emoji-style icons OK for v1 to avoid icon-library churn — replaced with proper SVGs during boilerplate integration. |

## 6. Surfaces (screens)

### 6.1 First-visit empty state
**Route:** `/prep/:applicationId` (when no data exists)
**Mockup:** `empty-state-v2.html`

Top: Eightfold-branded nav. Page title "Applications." Application card with role title, applied date, location, "View" pill button, and the 6-stage timeline (Application → Recruiter → Technical screen → Full loop → Team matching → Decision).

Below the application card: heading "Optional prep for your technical screen" with framing copy. Three peer cards (gap report, adaptive mock, curated study material), each with body description and "💡 Helpful when..." footer note. Bottom reassurance panel: "Candidates who do any one of these activities tend to feel more confident... we're not grading you here."

### 6.2 Hub (steady state)
**Route:** `/prep/:applicationId` (when any data exists)
**Mockup:** `hub-meta.html`

Same application card + timeline at top. Application card has two pill buttons: "About this stage" (toggles inline panel) and "Join meeting" (if a mock is scheduled).

Collapsible **About-this-stage panel** under the card. Three columns: "What to expect," "How it's evaluated," "Have questions?" — sourced from a per-stage config (key: `interview_stage`).

**Suggested-next card** — soft blue card (not a gradient), one sentence on what to do, primary action button. State-aware:
- No gap report → "See where your profile maps against this role"
- Has gap report, no mocks → "Try a focused mock on consistency & failure modes"
- Has 1+ mocks → "Run mock #N — focus on <weakest dimension>"

**4 tiles** in a 2×2 grid:
1. **Gap report** — top 3 weak dimensions with severity bars
2. **Mock history** — sparkline of past scores + delta from first attempt
3. **Study plan** — % done + minutes remaining + "Up next" label
4. **Readiness %** — single number 0–100 with explanation tooltip

Subtle footer: "None of this is shared with the interviewer or recruiter."

### 6.3 Gap report
**Route:** `/prep/:applicationId/gap-report`
**Mockup:** `gap-report.html`

Three stacked sections:
1. **Radar chart** (pentagon for 5 dimensions). Two polygons overlaid: candidate (purple, filled) vs. role expectation (navy dashed outline).
2. **Severity counts** — three cards horizontally: high (red) / medium (amber) / already covered (green). Numbers are clickable to filter the list below.
3. **Topic chip clusters** grouped by severity. Each cluster: dimension name + severity badge + 2–3 topic chips (e.g., "Quorum reads", "Vector clocks").

Two CTAs at the bottom: "🎤 Mock these →" (primary) and "📚 Study plan" (secondary).

Topic chips are **read-only** on this page — they are a vocabulary cue, not navigation targets. They link to resources only on the study plan page.

### 6.4 Mock launch card
**Route:** `/prep/:applicationId/mock/launch?focus=<dims>`
**Mockup:** `mock-launch.html`

Three stacked cards in a single column:
1. **Meeting card** — title, meeting ID, passcode, host ("LiveKit · opens in a new tab"). Right side: "🎤 Test mic first" (secondary) and "📹 Join meeting" (primary).
2. **Before you join** — 4 inline tips with emoji icons: headphones, quiet room, plan 25 min, think out loud.
3. **What you'll be asked** — 2-3 topic chips, sourced from `focus` query param or default to weakest gap dimensions.

"Test mic first" opens a modal with browser-mic-permission flow + level meter. "Join meeting" opens the LiveKit URL in a new tab; the Candidate Prep tab transitions to the in-progress state.

### 6.5 Mock in-progress + processing states
**Route:** `/prep/:applicationId/mock/:mockId/active`

Simple page with: title "Mock #N — in progress," elapsed-time counter, "End mock" link (back to launch). Polls or subscribes to mock status; when the backend signals "completed," auto-navigates to the processing state.

Processing state: centered Mira avatar + "Mira is reviewing your interview — usually takes 30–60 seconds." Spinner. On completion, auto-navigate to the feedback route.

**Note:** This is a lightweight transition surface, not a designed-from-scratch screen. The brainstorm intentionally deferred deep design here.

### 6.6 Mock feedback
**Route:** `/prep/:applicationId/mock/:mockId/feedback`
**Mockup:** `mock-feedback.html`

Top: header strip with mock number, duration, date on the left; **readiness score** (e.g., 76/100) + delta vs. previous attempt on the right.

**Mira summary card** — gradient-tinted card with avatar + 3–4 sentences of narrative review.

**4 dimension cards** — vertical list. Each card: left border colored by level (weak red / partial amber / solid green / strong green), dimension name + level tag, one-sentence "what this means" comment from Mira. For **partial or weak** dimensions: 2–3 inline **topic chips** as concise study cues ("Quorum reads", "Vector clocks").

**Moments that moved your score** — 2–4 transcript excerpts. Each: timestamp, level tag, verbatim quote.

Two CTAs at the bottom: "📚 Updated study plan →" (primary) and "📝 Replay transcript" (secondary).

### 6.7 Study plan
**Route:** `/prep/:applicationId/study-plan`
**Mockup:** `study-plan.html`

Top: title + total time remaining + completion bar.

**"Up next" hero card** — highlighted card with the single highest-priority unfinished resource. One CTA: "Resume" (opens external URL in new tab).

**Grouped sections** — one section per weak dimension. Section header: dimension name + severity + completion ("0 of 3 done · 2h 5m") + per-section "🎤 Mock this →" link. Each resource row inside: checkbox + title + type icon (📖 / 🎬 / 📚) + minutes + small **↗** external-link arrow. **No "Open" button.** The title itself is the link. Marking done is one click on the checkbox; no confirmation.

Completed sections collapse to a single summary row at the bottom: "✓ Scaling tradeoffs & Data model · 3 of 3 done."

### 6.8 Error states
**Mockups:** `errors.html` (five scenarios)

| Trigger | Treatment | Reference |
|---|---|---|
| Gap report generation failed | Soft red card on `/gap-report`. "Try again" + "Back to hub." Reference code shown. | US-7.1 |
| Mock meeting failed to connect | Soft red card on `/mock/launch`. "Rejoin meeting" + "Reschedule mock." "Doesn't show up on your record." | US-7.2 |
| Mock dropped mid-call | Amber warning on `/mock/:id/active`. "Score what we have" + "Discard & retry." Discard removes the attempt entirely. | US-7.3 |
| Offline | Amber banner injected at top of any page. "Retry now" link. Cached page content remains readable; network-required actions disabled with tooltip. | US-7.4 |
| Generic 404 / unexpected | Centered calm layout with reference code. "Back to hub" + "Refresh page." | US-7.5 |

**Cross-cutting error principles:** soft tones never crimson; one-line problem statement in plain language; primary action is retry or "continue what you can"; secondary action is escape to safer ground; reference code in monospace for support; reassurance language; no blocking modal dialogs; never expose stack traces / HTTP codes / API URLs.

## 7. The chip-vocabulary contract

The same 2–3 topic chips (e.g., "Quorum reads", "Vector clocks", "Read-your-writes") appear in **three places**: gap report (read-only cluster), mock feedback (inline under partial dimensions), study plan (section header chips above the resource list). This is load-bearing for the app's coherence — the candidate recognizes the same words across all three screens.

**Source of truth:** chips are derived from the gap report dimension → topics map. Phase 2 must produce this map as part of the gap report response. Suggested API shape: each dimension carries a `study_topics: string[]` (length 2–3). When mock feedback or study plan needs chips for a dimension, they read from the same field.

**Constraint:** chips are **not** clickable in gap report (vocabulary cue only). Chips **are** clickable in mock feedback (scroll to study plan section for that dimension). Chips in study plan are display-only (the resources below them are the actionable items).

## 8. API consumption surface

Below maps each screen to the backend endpoint(s) it calls. Full endpoint contracts are in the backend spec (§8.1 of `2026-05-12-candidate-prep-adaptive-design.md`).

| Screen | Endpoint | Method | Notes |
|---|---|---|---|
| Empty / hub root | `/api/candidate-prep/v2/application/:appId/state` | GET | One call returns: application meta, timeline state, gap report (if any), recent mock summary, study plan summary, readiness %. Renders empty-state or hub based on `has_data` flag in the response. |
| Generate gap report | `/api/candidate-prep/v2/application/:appId/gap-report` | POST | Async — returns `job_id`. Poll `/jobs/:id` until ready. |
| Read gap report | `/api/candidate-prep/v2/application/:appId/gap-report` | GET | Includes `dimensions[].study_topics[]` (the chip vocabulary). |
| Create mock | `/api/candidate-prep/v2/application/:appId/mocks` | POST | Body: `{focus: dimension_ids[]}`. Returns `mock_id`, `meeting_url`, `meeting_id`, `passcode`. |
| Read mock status | `/api/candidate-prep/v2/mocks/:mockId` | GET | Poll while in active state; switches to `completed` when post-call hook fires. |
| Read mock feedback | `/api/candidate-prep/v2/mocks/:mockId/feedback` | GET | Returns rubric scores, readiness delta, transcript excerpts, study items. |
| Read study plan | `/api/candidate-prep/v2/application/:appId/study-plan` | GET | Returns sections grouped by dimension, with progress flags per resource. |
| Mark study item done | `/api/candidate-prep/v2/study-items/:itemId/complete` | POST | Idempotent on `(application_id, item_id)`. |
| Discard mock | `/api/candidate-prep/v2/mocks/:mockId` | DELETE | Used by error path US-7.3. |

**Auth:** every request carries the PCS session token (passed from PCS via the deep-link query param or a signed cookie). The backend resolves the candidate identity from the token; the React app never handles raw credentials.

**Pagination:** none of the surfaces have a list large enough to need pagination in v1 (a candidate's prep set is bounded by their gap dimensions).

## 9. Routes summary

```
/prep/:applicationId                       → empty state OR hub (state-driven)
/prep/:applicationId/gap-report            → gap report page
/prep/:applicationId/mock/launch           → mock launch card  (focus via ?focus=)
/prep/:applicationId/mock/:mockId/active   → in-progress / processing
/prep/:applicationId/mock/:mockId/feedback → feedback page
/prep/:applicationId/study-plan            → study plan
/prep/:applicationId/transcript/:mockId    → text transcript replay (v1: text only)
*                                          → generic 404 (US-7.5)
```

No deep-linking from outside PCS — entry is always through `/prep/:applicationId` from PCS's button. If the candidate visits a sub-route directly without PCS context, treat as 404.

## 10. State model (front-end)

In-memory only. No localStorage for prep data — privacy concern (shared device risk). Three logical stores:

- **`applicationContext`** — application id, role title, stage, timeline state, candidate name. Fetched once on mount, never mutates during the session.
- **`prepState`** — gap report, mock summaries, study plan progress, readiness %. The hub renders directly from this. Refresh on entry to root route and after any mutation (mark-done, mock completion).
- **`activeMock`** — only populated when a mock is in flight. Cleared on completion or discard.

State container choice (Redux / Zustand / React Context) is intentionally **not specified here**. It will be decided during boilerplate evaluation in the implementation plan, based on what the talent-forge-2 boilerplate already uses.

## 11. Non-functional requirements

| ID | Requirement | Source |
|---|---|---|
| NFR-1 | Candidate prep data is **never** shared with interviewer or recruiter. UI footer states this on hub and empty state. | US-NF-1 |
| NFR-2 | Tone is suggestive, never aggressive. Copy review pass before each release. | US-NF-2 |
| NFR-3 | Mobile-responsive at 375px width for reading screens (hub, gap, feedback, study). Mock launch + active states may require desktop/landscape — acceptable. | US-NF-3 |
| NFR-4 | Returning candidates never see the empty state once any data exists. Pure state-driven. | US-NF-4 |
| NFR-5 | First contentful paint ≤ 1.5s on broadband. Hub root API call (`/state`) ≤ 500ms p95. | implied perf budget |
| NFR-6 | All copy in English for v1. Strings centralized in one module so future i18n is a wrap, not a refactor. | scope |
| NFR-7 | Accessibility: WCAG AA color contrast on all text. Keyboard navigation for all primary actions. Screen-reader labels on icon buttons. | platform default |

## 12. Open questions for implementation planning

These are intentionally **not** answered in this spec. They get resolved in the writing-plans phase after the talent-forge-2 boilerplate is understood.

1. **Boilerplate fit.** Does the talent-forge-2 React boilerplate already include: the Eightfold design system, routing primitives, an API client layer, an auth/PCS-session handler? Which of those do we reuse vs. extend?
2. **Backend-for-frontend (BFF).** Do we need a BFF layer between the React app and the Phase 2 APIs, or do we hit the v2 endpoints directly? A BFF makes sense if (a) the React app needs aggregated responses the backend doesn't provide, (b) we want to hide multiple backend services behind one URL, or (c) PCS auth requires server-side token exchange. To decide once boilerplate is mapped.
3. **Hosting target.** Where does this app deploy? Existing Eightfold front-end CDN, or a new bucket? Tied to (2) — if there's a BFF, it lives somewhere.
4. **Component library coverage.** Octuple (Eightfold's design system) — does it cover everything we need (timeline component, radar chart, score cards) or are some components new?
5. **Polling vs. server-sent events vs. websocket.** Mock status (`/mocks/:id`) and async job polling (`/jobs/:id`) could be any of these. Pick based on what the platform already supports.
6. **Repo strategy.** "We will make a new repo, will put frontend boilerplate" — confirmed direction. Question: is it a stand-alone repo or a sub-project under an existing monorepo? Affects CI/deploy.

## 13. Out of scope (recorded for visibility)

Same as user-stories doc. Not repeated here.

## 14. Acceptance criteria (per-screen, summary)

For full acceptance criteria see user stories. Spec-level: every screen in §6 renders the data shown in the corresponding mockup, sourced from the API in §8, with the visual register from §5 and the error handling from §6.8.

## 15. Sign-off

| Reviewer | Status | Date |
|---|---|---|
| atilondiya | pending | — |
