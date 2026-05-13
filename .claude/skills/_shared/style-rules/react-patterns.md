# React 19 + TanStack + Zustand — Canonical Patterns

**Purpose:** single source of truth for React discipline in the TalentForge frontend. These rules come from real bugs shipped in COREHR v1 and apex-perf; each one corresponds to a production regression.

---

## 1. Zustand Access in Mutations via `getState()`

Inside TanStack Query `mutationFn` and `onSuccess` callbacks, access Zustand via `useStore.getState()`, not a selector hook. Selector hooks are closure-captured at mutation definition time, producing stale reads and "Invalid hook call" errors under code-splitting.

```tsx
// WRONG — stale closure, hook-call warning
export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({ mutationFn: async (x) => { setAuth(data); } });
}

// GOOD
export function useLogin() {
  return useMutation({
    mutationFn: async (x) => { /* call API */ },
    onSuccess: (data) => { useAuthStore.getState().setAuth(data); },
  });
}
```

## 2. `useState` Initializer Is Sync-Only

`useState(() => compute())` runs once at mount. It will NOT re-run when async data arrives. For data sourced from a query, start empty and hydrate in `useEffect`.

```tsx
// WRONG — `assessment` is null at mount, initializer returns {}
const [responses, setResponses] = useState(() => buildFrom(assessment));

// GOOD — hydrate once query data is available
const [responses, setResponses] = useState({});
const [hydrated, setHydrated] = useState(false);
useEffect(() => {
  if (data && !hydrated) { setResponses(buildFrom(data)); setHydrated(true); }
}, [data, hydrated]);
```

The `useState(() => computeInitial())` form is reserved for synchronous expensive computation (parsing localStorage, deriving from props available at mount) — never for async data.

## 3. TanStack Query — No Retry on 401 / 403

Default retry (3 attempts) on auth failures causes delayed errors and redirect-loop cascades. Gate the retry predicate:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 3;
      },
    },
  },
});
```

Mutations get `retry: false` by default. Never auto-logout in the axios interceptor — that cascade-clears tokens for other in-flight requests. Let the auth guard handle redirects.

## 4. TanStack Router for Navigation

Use `useNavigate()` or `<Link>` for all navigation. Never `window.location.href = ...` — it full-reloads, drops query cache, and breaks the SPA model.

```tsx
import { useNavigate, Link } from "@tanstack/react-router";
const navigate = useNavigate();
navigate({ to: "/ic/goals/$goalId", params: { goalId } });
<Link to="/ic/review-results">View My Review</Link>
```

Every splat / catch-all route MUST render an explicit `<RouteNotFound>` — silent redirects hide nav bugs.

## 5. 4-Layer Field Exposure Check

Any new field must appear at ALL four layers or it is a bug:

1. `backend/app/models/<entity>.py` — DB column
2. `backend/app/schemas/<entity>.py` — API schema (the common bottleneck)
3. `backend/app/services/<entity>.py` — business logic / route response
4. `frontend/src/features/<entity>/hooks.ts` — TanStack Query type + render

```bash
grep -n "FIELD_NAME" backend/app/models/*.py backend/app/schemas/*.py \
                    backend/app/services/*.py frontend/src/features/**/hooks.ts
```

Model-only presence is a trap. 15 employee fields had this pattern in COREHR-002 remediation.

## 6. localStorage Keys Are Versioned

Every `localStorage.setItem` key carries a `:vN:` segment. When the stored shape changes, bump N — old data is discarded rather than read into the new shape.

```ts
const STORAGE_KEY = `emp-directory-columns:v2:${userId}:${tenantId}`;
localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
```

Gate:
```bash
grep -rE 'localStorage\.setItem\([^,]+,' frontend/src/ | grep -vE ':v[0-9]+:'
# Non-empty → FAIL
```

Unversioned keys cause invisible regressions for returning users (COREHR-001 column-prefs v1 → v2).

## 7. Persona Sync — Zustand + localStorage Atomic

PersonaSwitcher (dev) and real auth MUST write to Zustand store AND localStorage atomically. Readers subscribe to Zustand; never poll localStorage.

```ts
setPersona: (p) => {
  localStorage.setItem("persona:v2:current", JSON.stringify(p));
  set({ persona: p });
}
```

Never call `useDevToolbar()` from route files once real auth ships — grep `useDevToolbar` in `src/routes/` must return empty at handoff. Real auth store persists BOTH token AND user object; restoring only the token on reload leaves role-based routing broken.

## 8. Form Validation — RHF + Zod, Backend-Mirrored

All forms: React Hook Form + `zodResolver(schema)`. The Zod schema mirrors the backend Pydantic schema field-for-field — same lengths, same required flags, same enum values. Frontend catches UX errors; backend re-validates for security.

```tsx
const schema = z.object({
  email: z.string().email(),
  salary: z.number().positive(),
  lwd: z.date().min(startDate, "LWD must be on or after start date"),
});
const form = useForm({ resolver: zodResolver(schema) });
```

Field errors clear on change, not on next-click. Rules appearing client-side but not server-side (or vice versa) are bugs.

## 9. Component Naming Conventions

- **Components**: PascalCase (`EmployeeAvatar`, `BulkActionBar`)
- **Hooks**: `useXxx` camelCase (`useCurrentUser`, `useEmployees`)
- **Props interface**: `${Component}Props` (`EmployeeAvatarProps`)
- **Files**: match the primary export (`EmployeeAvatar.tsx`, `useEmployees.ts`)
- **Route files**: TanStack Router convention (`admin.tsx`, `admin/users.tsx`, `admin/users.$id.tsx`)

Exported functions declare explicit return types (`(): ReactElement`, `(): Promise<User>`). No `any`; prefer `unknown` with type guards.

## 10. Mandatory Format Helpers in `src/lib/format.ts`

Ship these BEFORE any screen renders data:
- `formatEnum(v)` — `FULL_TIME` → `Full-time`, `ON_LEAVE` → `On Leave`
- `formatCurrency(amount, currency, locale?)` via `Intl.NumberFormat`
- `formatDate(value, locale?)` via `Intl.DateTimeFormat`
- Specific wrappers: `formatStatus`, `formatEmploymentType`, `formatChangeReason`, `formatAuditAction`

No raw enum strings in the DOM. Grep check:
```bash
curl -s http://localhost:5173/ | grep -oE '[A-Z]+_[A-Z]+' | sort -u
# Expected: only CSS class names and hex — no FULL_TIME / ON_LEAVE / PENDING_APPROVAL
```

---

*Source: COREHR v1 retro, apex-perf retro, Retro v2 (2026-04-20). Raw: docs/retros/*
