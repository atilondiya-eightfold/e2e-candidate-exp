# UI Builder — Retro Lessons (from apex-perf)

**When to load this file:** Only when a unit touches auth flow, dev toolbar removal, async form state, or API trailing slashes. The context manifest's `conditional_loads` gates this.

The ui-builder skill caused 63% of all bugs (12 of 19) in the apex-perf project. These are the specific mistakes and their fixes. If your unit does not touch auth, dev toolbar, async forms, or API path conventions, skip this file — the inline rules in `SKILL.md` are sufficient.

---

## Mistake 1: Auth System Built Piecemeal (4 bugs)

**What happened:** Token persistence, user persistence, 401 handling, redirect logic, and logout were built across multiple sessions without a holistic design. Each piece worked alone but together they caused infinite redirect loops and cascade failures.

**Root cause:** The skill built the auth store with just `token` in localStorage. The `user` object (needed for role-based routing) was NOT persisted. On page reload: token existed, user was null, role check failed, redirect to login, login saw token, redirect to /, no user, redirect to login → infinite loop.

**RULE: Design the complete auth flow BEFORE writing any code:**
1. `setAuth(token, user)` → save BOTH to localStorage
2. Store init → read BOTH from localStorage
3. 401 interceptor → do NOT call logout (causes cascade). Let auth guard handle redirects.
4. Index route → check BOTH token AND user. If token but no user, call logout (clear stale token).
5. Logout → clear BOTH from localStorage, redirect to /login
6. Add a logout button from day 1 (sidebar footer + avatar menu)

---

## Mistake 2: Dev Toolbar Never Removed (4 bugs)

**What happened:** The skill wired individual page components to real API hooks but left the layout infrastructure using the mock dev toolbar. `__root.tsx` still wrapped everything in `DevToolbarProvider`. `AppShell.tsx` still read persona from `useDevToolbar()`. Layout routes (`ic.tsx`, `manager.tsx`, etc.) still checked `useDevToolbar().currentPersona.role`.

**Root cause:** Dev toolbar removal was Step 5 (last step) in the build order. In practice, the skill wired pages 1-4 and declared done before reaching Step 5.

**RULE: Remove dev toolbar in Step 0, not Step 5.**
When creating the auth store and API client (Phase 0), ALSO:
1. Remove `DevToolbarProvider` from `__root.tsx`
2. Rewrite `AppShell.tsx` to use `useAuthStore` for persona detection
3. Rewrite ALL layout routes (`ic.tsx`, `manager.tsx`, `hrbp.tsx`, `executive.tsx`, `admin.tsx`) to use `requireAuth()` with real role checks
4. Add role-based redirect in `index.tsx` (not hardcoded to `/ic`)

---

## Mistake 3: API Trailing Slashes Inconsistent (7 bugs)

**What happened:** FastAPI routes were defined with/without trailing slashes inconsistently. Frontend API hooks called paths without trailing slashes. FastAPI's default `redirect_slashes=True` caused 307 redirects that stripped the Authorization header → silent 401 failures in the browser (but not in curl, which follows redirects).

**Root cause:** No convention was established. Each file used whatever felt natural.

**RULE: ALL API paths MUST end with `/`**
- Static paths: `"/users/"` not `"/users"`
- Template literals: `` `/users/${id}/` `` not `` `/users/${id}` ``
- Sub-actions: `` `/users/${id}/submit/` `` not `` `/users/${id}/submit` ``
- Verify with: `grep -rn 'api\.' src/features/ | grep '"/' | grep -v '/"'`

---

## Mistake 4: useState Initializer for Async Data (3 bugs)

**What happened:** Form pages used `useState<Responses>(() => buildInitialResponses())` to pre-populate draft data. But at mount time, the assessment data is still loading (null), so the initializer returns `{}`. When data arrives later, useState's initial value is already set and won't update.

**Root cause:** React anti-pattern. `useState` initializer runs ONCE on mount. For async data, use `useEffect` to update state when data arrives.

**RULE: Never use useState initializer for data that comes from an API.**
```tsx
// WRONG — only runs once, data is null at mount time
const [responses, setResponses] = useState(() => buildFromApiData(assessment));

// CORRECT — updates when API data arrives
const [responses, setResponses] = useState({});
const [initialized, setInitialized] = useState(false);
useEffect(() => {
  if (assessment?.responses && !initialized) {
    setResponses(buildFromApiData(assessment));
    setInitialized(true);
  }
}, [assessment, initialized]);
```

---

## Mistake 5: Sub-Agent Quality (3 bugs)

**What happened:** When 12 screens were wired by a sub-agent, it used wrong icon names (Lucide-style instead of Material Symbols), wrote placeholder dialogs ("coming soon"), and left buttons without onClick handlers.

**RULE: When delegating to sub-agents, provide:**
1. The exact icon library being used (Material Symbols Outlined, not Lucide for StatCard)
2. Explicit instruction: "Every button MUST have an onClick handler. No placeholders."
3. A reference implementation from a working screen (e.g., "Follow the pattern in admin/users.tsx")
4. The trailing slash convention
5. Run the button audit after: `grep -rn '<Button' src/routes/ | grep -v 'onClick'`

---

## Mistake 6: No Self-Testing (the root of all issues)

**What happened:** The ui-builder declared "done" after `pnpm run build` passed. It never tested:
- Can a user login?
- Does the page render data?
- Do buttons work?
- Does draft data persist on reload?

**RULE: Before declaring any phase done, the ui-builder MUST:**
1. Login as the target persona through `/login`
2. Navigate to EVERY screen in that persona's section
3. Verify data renders (not loading/error/empty when data exists)
4. Click every button and verify it does something
5. If a form exists: fill it, save, reload, verify persistence
