/**
 * Reads identity-shaping query params once from the page URL and exposes
 * them to the BFF clients. Both BFF clients (eightfold-api, candidate-prep)
 * append these as query params on every request:
 *
 *   ?sub=<email>            — BFF OAuth JWT subject (overrides cookie/.env
 *                             only when backend ENVIRONMENT=local)
 *   ?application_id=<id>    — forwarded upstream
 *   ?position_id=<id>       — forwarded upstream
 *   ?group_id=<id>          — forwarded upstream
 *   ?profile_id=<id>        — forwarded upstream
 *
 * `email` is accepted as an alias for `sub` for backwards compatibility.
 */

export type ContextKey =
	| "sub"
	| "application_id"
	| "position_id"
	| "group_id"
	| "profile_id";

const KEYS: ContextKey[] = [
	"sub",
	"application_id",
	"position_id",
	"group_id",
	"profile_id",
];

function readInitialContext(): Record<ContextKey, string | null> {
	const ctx: Record<ContextKey, string | null> = {
		sub: null,
		application_id: null,
		position_id: null,
		group_id: null,
		profile_id: null,
	};
	if (typeof window === "undefined") return ctx;
	const p = new URLSearchParams(window.location.search);
	const email = p.get("email");
	if (email && email.trim()) ctx.sub = email.trim();
	for (const k of KEYS) {
		const v = p.get(k);
		if (v && v.trim()) ctx[k] = v.trim();
	}
	return ctx;
}

const context: Record<ContextKey, string | null> = readInitialContext();

export function getSubOverride(): string | null {
	return context.sub;
}

export function setSubOverride(email: string | null): void {
	context.sub = email && email.trim() ? email.trim() : null;
}

export function getContextParam(key: ContextKey): string | null {
	return context[key];
}

export function setContextParam(key: ContextKey, value: string | null): void {
	context[key] = value && value.trim() ? value.trim() : null;
}

/** Entries for non-null context params — used by BFF clients to append. */
export function getContextEntries(): [ContextKey, string][] {
	return KEYS.flatMap((k) => {
		const v = context[k];
		return v ? ([[k, v]] as [ContextKey, string][]) : [];
	});
}
