import { create } from "zustand";

/**
 * Lightweight identity slice for the BFF frontend.
 *
 * The auth session (cookie or dev fallback) yields an `email`. A root-level
 * bootstrap hook resolves that email -> encoded profile id via the
 * `useEmployees` hook and caches it here. Downstream EF hooks read
 * `profileId` from this store and stay disabled until it is non-null.
 *
 * This is **not** an auth store — it does not hold tokens, it does not
 * persist, and it does not render a login flow. The real auth path is
 * owned by `src/store/auth.ts` (the boilerplate JWT store) and by the
 * BFF's server-side Basic auth. This store exists purely as a shared
 * place for downstream components to find the resolved `profileId`
 * without having to re-run `useHRISEmployee` in every tree.
 */

export type AuthStatus = "pending" | "authenticated" | "unauthenticated";

export type IdentityStatus = "idle" | "loading" | "ready" | "error";

/**
 * Persona inference. We don't have a v2/core endpoint that authoritatively
 * classifies a user as manager vs IC on this tenant — `users.roles`,
 * `rmUserGroups`, and `defaultAccessMode` are all null, the
 * `/employees/{id}/direct-reports` endpoint is not on the public surface,
 * and every `filterQuery` shape that would reverse-look-up direct reports
 * returns 400 "incorrect format". Fallback: regex match on
 * `EmployeeSchema.title`. Brittle but works for demo personas like
 * "Sales Engineer Manager", "Engineering Director", "VP of Product".
 */
export type Persona = "ic" | "manager" | "unknown";

interface IdentityState {
	/** Email as read from `?email=` on first paint. null until set. */
	email: string | null;
	/**
	 * Encoded profile id resolved via `useHRISEmployee`. null until the
	 * bootstrap hook resolves. Downstream hooks must gate on this
	 * being a non-empty string before firing.
	 */
	profileId: string | null;
	/** Title from EmployeeSchema or ExternalProfileSchema. Drives persona regex. */
	title: string | null;
	/** Persona inferred from `title` — see `Persona` doc above. */
	persona: Persona;
	/** Group id resolved from auth bridge bootstrap. null until set. */
	groupId: string | null;
	/** Auth bridge bootstrap status — distinct from `status` (profileId resolution). */
	authStatus: AuthStatus;
	/** Pipeline status — drives the top-level dashboard skeleton. */
	status: IdentityStatus;
	/** Human-readable error — surfaced by the root ErrorBanner. */
	error: string | null;
	setEmail: (email: string | null) => void;
	setProfileId: (profileId: string | null) => void;
	setTitle: (title: string | null) => void;
	setGroupId: (groupId: string | null) => void;
	setAuthStatus: (status: AuthStatus) => void;
	setStatus: (status: IdentityStatus) => void;
	setError: (error: string | null) => void;
	reset: () => void;
}

const MANAGER_REGEX = /\b(manager|director|vp|chief|head of)\b/i;

export function inferPersona(title: string | null): Persona {
	if (!title) return "unknown";
	return MANAGER_REGEX.test(title) ? "manager" : "ic";
}

export const useIdentityStore = create<IdentityState>((set) => ({
	email: null,
	profileId: null,
	title: null,
	persona: "unknown",
	groupId: null,
	authStatus: "pending",
	status: "idle",
	error: null,
	setEmail: (email: string | null): void => {
		set({ email });
	},
	setProfileId: (profileId: string | null): void => {
		set({ profileId });
	},
	setTitle: (title: string | null): void => {
		set({ title, persona: inferPersona(title) });
	},
	setGroupId: (groupId: string | null): void => {
		set({ groupId });
	},
	setAuthStatus: (status: AuthStatus): void => {
		set({ authStatus: status });
	},
	setStatus: (status: IdentityStatus): void => {
		set({ status });
	},
	setError: (error: string | null): void => {
		set({ error });
	},
	reset: (): void => {
		set({
			email: null,
			profileId: null,
			title: null,
			persona: "unknown",
			groupId: null,
			authStatus: "pending",
			status: "idle",
			error: null,
		});
	},
}));
