# Information Architecture Rules

Rules for structuring navigation, scoping data per persona, and eliminating redundant views. Apply these **before building any screens** — IA mistakes are the most expensive to fix later.

---

## Navigation Pattern Default: Top Nav

**Always use the top navigation bar as the primary navigation pattern.** This applies to every persona, every screen count, every layout — including admin and "power user" personas.

Use `Navbar` from `@/components/ef-design-system`. Persona-specific nav items derive from the screen inventory; bell icon + avatar dropdown go on the right.

### Why top nav, always

- Sidebars consume 240px+ of horizontal width. On tablet (768px) and mobile (375px) this leaves the content area unusably narrow — tables overflow, filter rows wrap into walls, and modals start clipping the viewport.
- A single top-nav shell maintains itself across breakpoints (collapses to a hamburger on mobile via `Navbar` props). A sidebar shell needs a separate mobile variant, doubling the work and the bug surface.
- Every previous prototype that opted into a sidebar required retroactive responsive fixes during the build phase.

### When sidebar is acceptable (rare exception)

Both conditions must be true, AND the user must explicitly request it:
1. The persona has **≥7 peer destinations** that don't fit horizontally even after grouping
2. The user has explicitly requested a sidebar for that persona during IA approval

Even then, design the top-nav variant first, present both, and let the user pick. Never default to sidebar because the persona "feels admin-y" or "has a lot of features" — group features into nested nav menus on the top bar instead.

### Layout shell consistency

All personas in a single project should use the **same layout shell** unless there is a hard reason to diverge. Mixing sidebar + topnav across personas (e.g. HR Admin sidebar, Employee topnav) means switching personas in the prototype causes a layout flash and inconsistency that's distracting during review.

---

## Design Nav Structure BEFORE Screens

Before writing any components, create a **persona → nav items → home sections** table and get explicit user approval.

```
| Persona       | Nav Items              | Home Dashboard Sections         |
|---------------|------------------------|---------------------------------|
| IC            | Dashboard, My Tasks    | Task summary, Recent tasks      |
| Manager       | Team Dashboard, Tasks  | Team stats, Member overview     |
| Admin         | Cycles, Users, Forms   | Active cycles, Pending actions  |
```

This table is the single source of truth for what gets built. No screen should exist that isn't traceable to this table.

---

## No Redundant Views

**If a view is reachable from a home dashboard card, it is NOT a nav tab.**

Home cards are the entry points. If "My Reviews" is a card on the IC dashboard that links to a detail view, don't also put "My Reviews" as a sidebar nav item — that creates two paths to the same content and confuses users about where they "are."

**Merge related views into one dashboard.** Don't create separate pages when a section within an existing page works:
- Calibration ⊂ Cycle Dashboard (as a tab or section, not a separate page)
- Analytics scoped per persona (not tabs showing all persona views)
- Form sharing ⊂ Form Builder per question (not a separate wizard step)

**Test:** For each nav item, ask "Can the user already get here from a card on the dashboard?" If yes, remove the nav item.

---

## Notifications = Bell Icon

Notifications are a **utility**, not a **section**.

- Bell icon next to the avatar in the top nav / navbar — use `NumberBadge` from ef-design-system for unread count
- Available from every page, every persona
- NOT a nav tab, NOT a sidebar item
- Clicking opens a dropdown panel or slide-over, not a full page

---

## Persona Scoping Is Non-Negotiable

Each persona sees **only their own data**. No cross-persona tabs or views.

| Persona | Sees |
|---------|------|
| IC | Their own tasks, goals, reviews, feedback |
| Manager | Their team's data (direct reports) |
| Admin/HRBP | Their department or configured scope |
| Executive | Org-level aggregates and trends |

**Never** show a tab like "Manager View" inside the IC persona, or "IC View" inside the Manager persona. If two personas need similar data, build it separately with persona-appropriate scope, not a shared view with tabs.

---

## Admin Config Stays in Admin Views

Don't show configuration metadata in consumption views.

**Wrong:** Showing "May be shared" / "Manager only" visibility pills on peer feedback that an IC is reading. The IC didn't set that config and can't change it — showing it adds noise.

**Right:** Sharing visibility is set by the admin in the admin screen. The IC sees the feedback content only. The admin sees the config controls only.

**Rule:** If the current persona can't change a setting, don't show it to them. Configuration belongs in the persona that controls it.
