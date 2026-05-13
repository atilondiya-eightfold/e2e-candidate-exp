# Candidate Prep React App — User Stories

Captured 2026-05-13. Companion to `react-app-mockups/`. These stories drive the implementation plan for the React app that consumes the Phase 2 adaptive mock + study plan APIs.

**Persona:** Aarav, a software engineer applying for a Staff SWE role. He has applied via PCS (Profile/Candidate Site). The Candidate Prep app is reached via a button on his application's PCS page.

All stories follow the form **"As <persona>, I want <action>, so that <outcome>"** plus acceptance criteria.

---

## Flow 1 · First entry (no data yet)

> Aarav clicks the "Prepare for your screen" button on PCS for the first time. He has never used Candidate Prep before. The app has zero data about him beyond what PCS already knows (profile, the application, the role).

### US-1.1 · See what this app offers
**As** a candidate visiting Candidate Prep for the first time,
**I want** to immediately understand what the app does and what's available,
**so that** I can decide if it's worth my time before clicking anything.

**Acceptance:**
- Landing page shows the application card (role, timeline, next stage) at the top — same skeleton as PCS so it feels continuous.
- Below the card: heading "Optional prep for your technical screen" with one-sentence framing copy.
- Three peer prep cards visible: gap report, adaptive mock, curated study material. Each has a body description and a "💡 Helpful when…" footer note.
- A footer panel reassures: "we're not grading you here — practice scores and progress are visible only to you."
- No login wall, no forms, no required actions. Page is informative even if Aarav reads and leaves.

### US-1.2 · Generate first gap report
**As** a candidate who wants to know my weak spots,
**I want** to generate a personalized gap report against my target role,
**so that** I know where to focus.

**Acceptance:**
- Clicking "Generate my gap report →" kicks off the generation.
- A progress indicator shows "Analyzing your profile against the role…" — completes in <30s on the happy path.
- Result page shows: radar chart (me vs. role), severity counts (high/medium/already-covered), 2–3 topic chips per weak dimension, primary CTA "🎤 Practice these in a mock," secondary CTA "📚 Open study plan."
- If generation fails, see [US-7.1](#us-71--gap-report-generation-failed).
- After success, the hub steady-state begins to populate (gap report tile shows "3 weak dimensions").

### US-1.3 · Skip the gap report
**As** a candidate who already knows what to study,
**I want** to bypass the gap report and go straight to a mock or study material,
**so that** the app doesn't gate me on a step I don't need.

**Acceptance:**
- All three prep cards on the empty state are equally clickable; none is gated behind another.
- The mock card opens the mock launch flow even if no gap report exists. The mock then uses fallback topic selection (Phase 0's static fallback tree).
- The study material card opens a generic "browse by topic" view if no gap report exists.

---

## Flow 2 · Pre-mock prep

> Aarav has his gap report. He has 12 days until his technical screen. He wants to prepare.

### US-2.1 · View the hub and pick what to do next
**As** a returning candidate,
**I want** to see my current readiness state on a single page,
**so that** I can decide what to do in this session without hunting.

**Acceptance:**
- Hub shows the application card with timeline at the top.
- Suggested next-action card right below (state-aware: e.g., "Run mock #2 focused on consistency").
- 4 tiles visible: Gap report (top 3 weak dimensions with bars), Mock history (sparkline + last score), Study plan (% done + up-next item), Readiness % (single number with explanation on hover).
- No tile is hidden; tiles for sections with no data show a neutral empty state ("No mocks yet").

### US-2.2 · Open the about-this-stage panel
**As** a candidate who doesn't know what to expect at this stage,
**I want** to read process info without leaving the app,
**so that** I don't have to bounce back to PCS for context.

**Acceptance:**
- The "About this stage" pill button in the application card header toggles an inline panel directly below the card.
- Panel content: 3 columns — "What to expect," "How it's evaluated," "Have questions?" — sourced from a per-stage config.
- The panel opens and closes in place; no modal, no new page.

### US-2.3 · Read the gap report in detail
**As** a candidate,
**I want** to click into the gap report and understand each weak dimension,
**so that** I know what specifically to study and why.

**Acceptance:**
- Clicking the gap report tile (or the "View →" link) opens the gap report page.
- Each weak dimension shows: name, severity badge (high/medium), one-sentence "why this is a gap" (from the matching graph), 2–3 topic chips.
- Topic chips are not clickable in the gap report (they're a reading aid); the same chips link to resources only in the study plan.
- Page ends with two CTAs: "Practice these in a mock" (launches mock filtered to weak dimensions) and "Open study plan."

### US-2.4 · Browse the study plan
**As** a candidate with limited time,
**I want** to see exactly what I should read/watch and how long each takes,
**so that** I can fit prep into the time I actually have.

**Acceptance:**
- Study plan shows an "Up next" hero (the single highest-priority unfinished item) with a clear "Resume" CTA.
- Below: sections grouped by weak dimension. Each section header: dimension name + severity + completion (e.g., "0 of 3 done · 2h 5m").
- Each section lists its resources with title + type icon (📖 read / 🎬 video / 📚 book) + minutes + external-link arrow (↗).
- Resources open the publisher's URL in a new tab — we never render external content in-app.
- Mark-as-done is one click per row; no confirmation dialog. Done items move to bottom of section and grey out.

### US-2.5 · Resume study from anywhere
**As** a candidate returning between sessions,
**I want** the app to remember exactly where I left off,
**so that** I never re-read something I finished or hunt for the next item.

**Acceptance:**
- The "Up next" hero on the study plan page picks the highest-priority unfinished resource (highest-severity dimension, smallest minutes-remaining).
- Hub's study plan tile shows "Up next: <title> · <N> min."
- Marking the current up-next item done auto-advances to the next priority resource.

---

## Flow 3 · Mock interview

> Aarav decides to take an adaptive mock. The live conversation happens in a meeting client (LiveKit / Meet). Our React app sits outside that.

### US-3.1 · Open the mock launch card
**As** a candidate about to take a mock,
**I want** a clear pre-flight screen that tells me what to expect,
**so that** I'm not surprised mid-call.

**Acceptance:**
- Launch card shows: meeting title ("Mock #2 — Consistency & failure modes"), duration ("Voice only · 25 min · adapts as you talk"), meeting ID + passcode, "Hosted on LiveKit · opens in a new tab."
- Primary CTA: "📹 Join meeting." Secondary: "🎤 Test mic first."
- Pre-flight tips section: 4 bullets (headphones, quiet room, plan 25 min, think out loud) with brief explanations.
- "What you'll be asked" section shows the topic chips for this mock (pulled from gap report).
- A back link returns to the hub without launching the mock.

### US-3.2 · Test mic before joining
**As** a candidate,
**I want** to verify my mic works before the mock starts,
**so that** I don't waste the first 2 minutes troubleshooting audio.

**Acceptance:**
- "Test mic first" opens an in-app modal with a level meter.
- Modal shows browser permission request if permission isn't granted yet.
- "Looks good — join the meeting" button in the modal launches the meeting in a new tab.

### US-3.3 · Join the meeting
**As** a candidate,
**I want** to join the adaptive mock with one click,
**so that** I'm in the meeting in <5 seconds.

**Acceptance:**
- "Join meeting" opens the LiveKit web URL in a new browser tab with token pre-attached.
- The Candidate Prep tab shows a "Mock in progress" state with: title, elapsed time, "End mock" link.
- On meeting-end (signaled via the existing post-call hook), the tab auto-navigates to "Processing your interview…" then to the feedback page.

### US-3.4 · Handle abandoned mocks
**As** a candidate who got disconnected mid-mock,
**I want** to choose whether to score what I have or discard the attempt,
**so that** a bad connection doesn't pollute my history.

**Acceptance:**
- If the meeting ends before the minimum-viable duration (e.g., 8 min), the candidate sees the [mock-dropped warning state](#us-73--mock-dropped-mid-call).
- "Score what we have" produces partial feedback (only dimensions with enough material are scored).
- "Discard & retry" deletes the attempt; it never appears in mock history.

---

## Flow 4 · Post-mock review

> Aarav finishes a 25-min mock and returns to the app.

### US-4.1 · See the readiness score and Mira's summary
**As** a candidate who just finished a mock,
**I want** an at-a-glance verdict plus a coach's explanation,
**so that** I understand the number and what to do with it.

**Acceptance:**
- Feedback page top: overall readiness score (e.g., 76/100) + delta vs. previous attempt + Mira summary card (3–4 sentences of narrative review).
- Below: 4 dimension cards, color-coded by level (weak / partial / solid / strong).
- Each dimension card has a one-sentence "what this means" comment from Mira.
- Partial / weak dimensions additionally show 2–3 topic chips ("Quorum reads", "Vector clocks") — concise study topics, not full resource links.

### US-4.2 · See moments from the transcript
**As** a candidate,
**I want** to see exactly which moments scored well or poorly,
**so that** I can learn from specifics instead of vague feedback.

**Acceptance:**
- Below the dimension cards, a "Moments that moved your score" section shows 2–4 transcript excerpts.
- Each excerpt: timestamp ("04:12"), level tag (STRONG / WEAK), the verbatim quote.
- Strong moments use the green palette; weak moments use the amber palette.

### US-4.3 · Jump from feedback into study material
**As** a candidate who just saw a weak dimension,
**I want** to act on it immediately,
**so that** I don't lose momentum.

**Acceptance:**
- A topic chip on a weak dimension card is clickable; clicking it scrolls the page to (or navigates to) the study plan section for that dimension.
- A bottom CTA "📚 See your updated study plan" navigates to the study plan with the focus on whatever dimension scored weakest.

### US-4.4 · Replay the transcript later
**As** a candidate who didn't have time to review thoroughly,
**I want** to come back and read the full transcript,
**so that** I can review at my own pace.

**Acceptance:**
- "📝 Replay transcript" link on the feedback page opens a paginated transcript view.
- Transcript view shows: agent and candidate turns alternating, timestamps, the dimension highlights from the feedback inline.
- (v1 simplification — no audio playback; just text.)

---

## Flow 5 · Returning candidate (steady state)

> Aarav opens the app on day 4, after one gap report and one mock.

### US-5.1 · See progress at a glance
**As** a returning candidate,
**I want** to see my readiness % and progress trends on the hub,
**so that** I know if my prep is working.

**Acceptance:**
- Readiness % tile shows current readiness with an explanation on hover ("Estimated from gap report + mock scores + study-plan progress").
- Mock history tile shows a sparkline of past scores with the latest highlighted.
- Tile-level deltas use color: green up-arrow for improvements, neutral for no change. No red down-arrow — never punish.

### US-5.2 · Run another mock
**As** a candidate who has done one mock,
**I want** to take another one focused on the weakest areas,
**so that** I close the gap before the real interview.

**Acceptance:**
- "Suggested next" card on the hub now reads "Run mock #2 — focus on <weakest dimension(s)>".
- Clicking it opens the mock launch card pre-configured with those topics.
- Mock history tile increments after each completed attempt (not after dropped/discarded ones).

### US-5.3 · Track readiness over time
**As** a candidate prepping over multiple days,
**I want** my readiness % to update as I complete things,
**so that** I see progress accumulating.

**Acceptance:**
- Marking a study item done increases readiness by a deterministic, displayed-in-explanation amount.
- Completing a mock with a higher score than the previous attempt raises readiness; a lower score does not lower it (always take the max).
- Hover/tooltip on readiness % explains the formula in plain language.

---

## Flow 6 · Error recovery

### US-7.1 · Gap report generation failed
**As** a candidate whose gap report failed to generate,
**I want** a clear, blame-free explanation and a way to retry,
**so that** I don't think I broke something.

**Acceptance:**
- Soft-red card on the gap report page: "We couldn't generate your gap report. This usually clears up if you try again in a minute. If it keeps happening, the issue is on our side — not anything you did."
- Two CTAs: primary "Try again," secondary "Back to hub."
- A short reference code (e.g., `req-7f3a2b9c`) is shown in monospace for support tickets.
- No HTTP status, no stack trace, no API URL.

### US-7.2 · Mock meeting failed to start
**As** a candidate who clicked "Join meeting" but couldn't connect,
**I want** clear next steps,
**so that** I can fix the issue or reschedule without anxiety.

**Acceptance:**
- Soft-red card: "We couldn't connect to the interview room. Check your internet — voice needs a stable connection. Try again in a few seconds."
- Two CTAs: "Rejoin meeting," "Reschedule mock."
- Footer reassurance: "Your mock attempt count isn't affected. This doesn't show up on your record."

### US-7.3 · Mock dropped mid-call
**As** a candidate whose call dropped after 8 minutes,
**I want** to decide whether the partial mock counts,
**so that** a bad connection doesn't ruin my history.

**Acceptance:**
- Amber warning card: "Your mock ended early. Looks like the call disconnected after 8 minutes. We can still score what we have, but the feedback will be limited — only one or two dimensions had enough material."
- Two CTAs: "Score what we have," "Discard & retry."
- Discard removes the attempt entirely; it never appears in history.

### US-7.4 · Offline / network lost
**As** a candidate who lost connection mid-session,
**I want** to know the app is offline and what still works,
**so that** I can keep reading without being confused.

**Acceptance:**
- Inline amber banner at top of every page: "⚡ You're offline. Some data may be out of date. We'll reconnect automatically."
- "Retry now" link in the banner.
- Behind the banner: cached view of whatever page the candidate is on (gap report text, study plan items, mock feedback all readable offline).
- Actions that require connectivity (start mock, generate report) are disabled with tooltip "Needs internet."

### US-7.5 · Generic page-level error (404 / unexpected)
**As** a candidate who hit an unexpected error,
**I want** a calm, reassuring page,
**so that** I trust the app and try again.

**Acceptance:**
- Centered layout with a soft icon, "We hit a snag" heading, 2-sentence apology, and a reference code.
- Two CTAs: "Back to hub" (primary), "Refresh page" (secondary).
- No error code displayed by default; reference code is enough to look up details on the backend.

---

## Cross-cutting non-functional stories

### US-NF-1 · No interviewer-visible data
**As** a candidate,
**I want** assurance that my practice scores and transcripts are private,
**so that** I'm not afraid to fail mocks.

**Acceptance:**
- Footer note on hub: "None of this is shared with the interviewer or recruiter."
- Same line on the empty state.
- Privacy section in any "About" / help page that's added later.

### US-NF-2 · Suggestive, never aggressive
**As** a candidate,
**I want** the app to suggest, not demand,
**so that** I don't feel pushed or judged.

**Acceptance:**
- No copy uses "you must," "required," "important — do this now."
- Section headings use "Optional," "Suggested," "Recommended next."
- CTAs are blue pills with verbs like "Generate," "Start," "Open," not "Submit," "Complete," "Finish."

### US-NF-3 · Mobile-responsive (v1 = portrait phone reasonable)
**As** a candidate on my phone,
**I want** the app to be readable on a phone,
**so that** I can review study items on the go.

**Acceptance:**
- All locked pages render usably at 375px width.
- The mock launch and active-mock pages may require landscape or desktop — that's acceptable for v1 since the mock itself happens in a meeting client.
- Tile grids collapse from 2-up to 1-up below 600px.

### US-NF-4 · Returning candidate doesn't re-onboard
**As** a returning candidate,
**I want** the app to remember I've been here before,
**so that** I'm not shown the empty-state welcome every time.

**Acceptance:**
- Once any of {gap report, mock attempt, study item marked done} exists for this application, the empty-state page is replaced by the hub on entry.
- The 3-card prep section is replaced by the suggested-next + tile-grid section.
- No flag to flip — purely state-driven.

---

## Out of scope (recorded for visibility)

- Multi-application overview ("all my applications" view) — focus is one application
- Direct messaging with the recruiter (deep-link to PCS instead, v2 may inline)
- Settings / account / preferences page
- Audio playback of past mock transcripts (text-only for v1)
- Drill-down mock history view (tile only for v1)
- Mid-call mic / permission errors (meeting client's job)
- Notifications / email reminders to prep
- Cross-role / cross-application analytics
