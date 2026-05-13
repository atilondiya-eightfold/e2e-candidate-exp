// Eightfold API client config — BFF-only mode.
// All requests route via the backend proxy at /api/v2/*.
// Browser-side EF_DOMAIN + EF_API_TOKEN are no longer used.

export const API_VERSION = "/api/v2";

// Retained for downstream re-exports (index.ts, types/shared.ts).
// Domain-routing is now handled exclusively server-side by the BFF.
export type EightfoldDomain =
	| "eightfold"
	| "eightfold-eu"
	| "eightfold-gov"
	| "eightfold-ca"
	| "eightfold-me"
	| "eightfold-wu"
	| "eightfold-ap";

// Returned by getApiConfig() for compatibility with existing callers.
// Token is intentionally empty — BFF re-signs upstream auth server-side.
export interface ApiConfig {
	token: string;
}

export function getApiConfig(): ApiConfig {
	return { token: "" };
}
