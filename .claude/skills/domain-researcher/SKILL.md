---
name: domain-researcher
description: Use when the user wants to start building a software product in any domain (performance management, applicant tracking, learning management, employee engagement, etc.) and no market research or domain doc exists yet. Required first step of the Forge pipeline. Also triggers when the user says "start a new project", "build an HRIS", "I want to build [domain] software", or when forger reports no approved `domain-doc.md`.
---

# Domain Researcher

## Overview

Researches the competitive landscape for a software domain, then conducts a targeted, research-informed discovery interview. Produces `docs/market-research.md` and `docs/domain-doc.md` — inputs to every downstream skill. Core principle: **research comes BEFORE questions**, so the user feels they're talking to a domain expert, not a form.

## When to Use

- Starting a new product build (required first step before any other skill).
- Restarting a project where market research was never captured.
- User invokes forger and no `docs/domain-doc.md` exists with `approved: true`.

## Pre-conditions

- User has named a domain (e.g., "performance management", "applicant tracking").
- No gate — this is the entry point.

## Workflow

### Phase 1 — Market Research (before any question)

1. **Identify 3–5 leading competitors** in the domain, noting target segment (SMB / mid-market / enterprise).
2. **Research product flows in depth** per competitor: modules/features, admin config flows, IC flows, manager flows, differentiators, pricing tiers.
3. **Research screen patterns**: dashboard layouts, form/wizard step counts, configuration options (rating scales, visibility controls), calibration UI (9-box, bell curve, table), notification patterns.
4. **Synthesize** into the Market Research Brief: competitor matrix, standard vs differentiating modules, personas, UX patterns to adopt, patterns to avoid.
5. **Present research inline** to the user. Example opener:
   > "Based on my research, here are the standard modules in [domain]. Here's what the top products offer. Now let me ask targeted questions about YOUR specific needs."
6. Write the brief to `docs/market-research.md`.

### Phase 2 — Targeted Interview (informed by research)

Four rounds, **one at a time** via `AskUserQuestion`. Never dump all questions at once.

**Round 1 — Company & Context.** `AskUserQuestion` for build type (greenfield / replacement) + industry. Follow up with free-form questions for company name + headcount. If replacement, research the product being replaced first — it's the most important reference.

**Round 2 — Module Selection.** Present the modules discovered in research as a checklist with one-line descriptions citing how each competitor implements it:

> "Based on my research of [competitors], here are the standard modules in [domain]. Which ones are in scope?"

`AskUserQuestion` with `multiSelect: true`. Each option: `label` = module name; `description` = one-line research-backed note (e.g., "Bi-annual / quarterly / continuous — Culture Amp supports 4 feedback components per cycle"). Split across questions (max 4 options each) if needed.

**Round 3 — Deep Dive per Selected Module.** For each module, ask competitor-framed questions:

> "Culture Amp's review cycles include 4 feedback components (self, manager, peer, upward) with per-component timelines. Lattice offers a simpler 2-step flow. Which is closer to what you need?"

`AskUserQuestion` single-select; each option = a competitor approach. Conditional follow-ups only — if user said "no OKRs" in Round 2, skip goal-setting detail in Round 3.

**Round 4 — Enterprise & Technical.** `AskUserQuestion` for:
- Authentication method (SSO / email+password / both)
- Compliance requirements (GDPR / SOC2 / CCPA / HIPAA, multi-select)
- Multi-tenancy (single company / SaaS)
- Tech-stack preference (No preference / Node+TS / Python / Go)

Ask integrations as free-form — don't limit to a fixed HRIS list.

### Phase 3 — Output

**`docs/market-research.md`** — competitor analysis + feature matrix + UX patterns worth adopting (cited) + patterns to avoid + per-module depth notes (how the reference products implement each selected module).

**`docs/domain-doc.md`** — Domain Assumptions Document:

```markdown
# Domain Assumptions Document
**Project:** [Name]
**Version:** 1.0
**Status:** Pending Approval

## Organisation Profile
- Company: [name]
- Size: [headcount]
- Industry: [sector]
- Build type: [Greenfield / Replacement]
- If replacement: [product + what liked/disliked]

## Selected Modules
[List from Round 2, with config details from Round 3]

## Personas
| Persona | Role | Key Goals | Pain Points |
|---|---|---|---|
| ... | ... | ... | ... |

*(Derive from research + interview — no fixed template.)*

## Integrations & Technical Constraints
- Integrations: [open-ended list]
- Auth: [method]
- Compliance: [list]
- Multi-tenancy: [yes/no]
- Constraints: [list]

## Open Questions
*(Anything deferred or unsure.)*

## Out of Scope (this phase)
*(Explicit exclusions.)*
```

Present both artifacts inline in the conversation, then write to `docs/`. Hand off to **forger** for user approval before any other skill proceeds.

## Rules

1. **Never ask a question you could answer through research.** Web-search first, ask second.
2. **Always present options with context.** Don't ask "What rating scale?" — ask "Culture Amp recommends 4-point to avoid central tendency; Lattice defaults to 5-point. Which?"
3. **Research before questions, not after.** Show the market brief before asking anything.
4. **Ask for the replacement product** if it's a replacement build — that product is the most important reference.
5. **Open-ended integration questions.** Never limit to a fixed HRIS list.
6. **Conditional follow-ups.** Skip questions already answered by prior rounds.
7. **Present artifacts inline**, not just file paths.

## Interview Tone

Conversational, not formal. If an answer is vague, ask one follow-up, then move on. If unknown, capture as an open question — don't block. Sound like a domain consultant who has done this before (because, via research, you have).

## After Completion

- Both `docs/market-research.md` and `docs/domain-doc.md` exist.
- User has reviewed both inline and approved via forger.
- Hand off to forger; forger gates `story-writer` behind domain-doc approval.
