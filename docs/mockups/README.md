# Candidate Prep — React App Mockups

Brainstorm artifacts for the Candidate Prep React app (the consumer of the Phase 2 adaptive mock + study plan APIs). Captured 2026-05-13.

Each HTML file is a self-contained, browser-openable mockup. Open any of them in a browser directly (`open <file>.html` on macOS) — they pull no external assets, just inline CSS and SVG.

## File map — open in this order

| # | File | What it shows | Status |
|---|---|---|---|
| 1 | [framing.html](framing.html) | Three product framings — Mission Control / Guided Wizard / Coach Chat. Picked: hub-spine hybrid. | reference |
| 2 | [hybrid.html](hybrid.html) | Hub-spine vs Wizard-spine vs Adaptive hybrid. Picked: **Hub-spine** (option 1). | reference |
| 3 | [hub-anatomy.html](hub-anatomy.html) | Full hub surface + 7 candidate wizard segments. Locked segments: hero CTA, gap report, mock, feedback, study plan, mock history (tile), about-this-stage. | reference (early style) |
| 4 | [empty-state-v2.html](empty-state-v2.html) | **First-visit (Meta style).** Application card + 3 optional prep cards with "💡 helpful when…" notes. | **locked** |
| 5 | [hub-meta.html](hub-meta.html) | **Hub steady-state (Meta style).** App card + timeline + collapsible "About this stage" panel + suggested-next card + 4 tiles (gap / mocks / study / readiness%). | **locked** |
| 6 | [gap-report.html](gap-report.html) | Gap report screen. Locked: **radar chart + severity counts + topic chip clusters** (combined). | **locked** |
| 7 | [mock-launch.html](mock-launch.html) | Mock interview launch card — Meta-style meeting card (ID + passcode + Join) + pre-flight tips + topic chips. Live mock UI rendered by meeting client, not us. | **locked** |
| 8 | [mock-feedback.html](mock-feedback.html) | Post-mock feedback. Locked: **Hybrid H** — readiness score + Mira summary + 4 dimension cards + 2–3 study-topic chips on partial dimensions. | **locked** |
| 9 | [study-plan.html](study-plan.html) | Study plan. Locked: **Hybrid H** — "Up next" hero + grouped sections, external-link styling (no Open buttons; we don't host material). | **locked** |
| 10 | [errors.html](errors.html) | Five error states: gap-gen failed, mock launch failed, mock dropped mid-call, offline, generic 404/unexpected. Soft tones, reassurance language, reference codes. | **locked** |

## Locked design choices (one-liner each)

- **Framing:** hub-spine hybrid (single home dashboard, wizard flows launch from tiles)
- **Visual register:** Meta-style — white bg, generous whitespace, blue accent (#1877f2), pill buttons, suggestive not aggressive
- **Mock interview:** the live UI happens in the meeting client (LiveKit / Meet equivalent). Our app gives the candidate a launch card with meeting ID + Join button, not an in-app voice UI.
- **Chip vocabulary:** the same 2–3 topic chips (e.g. "Quorum reads", "Vector clocks") appear across gap report → mock feedback → study plan, so the candidate sees one coherent system.
- **Tone:** prep is **optional**. The candidate never sees "you must" / "required". Footer reassurance: "we're not grading you here".

## Out of scope for v1

- Reschedule / message recruiter (segment #7 — deep-links to PCS)
- Mock history drill-down (just tile-level for v1)
- Settings / account
- Mid-call audio errors (mic permission, browser support — meeting client's job)
- Multi-application overview (focus is one application at a time)

## How these were produced

Generated during a brainstorming session using the visual-companion tool (superpowers skill). The originals live at `.superpowers/brainstorm/45554-1778642091/content/` and may be regenerated/iterated there before being re-copied here. This `react-app-mockups/` folder is the source of truth.
