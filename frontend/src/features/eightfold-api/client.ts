import { API_VERSION } from "./config";
import { ApiError } from "./errors";

function buildUrl(
	endpoint: string,
	parameters?: Record<string, string | undefined>
): string {
	let url = `${API_VERSION}${endpoint}`;

	if (parameters) {
		const searchParameters = new URLSearchParams();
		for (const [key, value] of Object.entries(parameters)) {
			if (value !== undefined) {
				searchParameters.set(key, value);
			}
		}
		const queryString = searchParameters.toString();
		if (queryString) {
			url += `?${queryString}`;
		}
	}

	return url;
}

// ---------------------------------------------------------------------------
// jwt_bearer token mint — frontend authenticates against the Eightfold v2
// API server directly. The browser POSTs to /oauth/v1/authenticate with the
// dev-user `sub`, holds the resulting access_token in memory, and uses it
// as a Bearer header on every /api/v2/* call. Tokens auto-refresh on 401.
//
// Hackathon caveat: client_id/client_secret/sub are baked into the bundle.
// Move to VITE_* env vars (or a server-issued login flow) before any
// non-demo deployment.
// ---------------------------------------------------------------------------

const OAUTH_CLIENT_ID =
	import.meta.env.VITE_EF_OAUTH_CLIENT_ID ?? "m9ZvEJei5eay3Bk8633BNqdb";
const OAUTH_CLIENT_SECRET =
	import.meta.env.VITE_EF_OAUTH_CLIENT_SECRET ??
	"zCKFmkak3oiENcjJch1WxWkODCFBKegzvaIjGxqcoqrkMOue";
const OAUTH_SUB =
	import.meta.env.VITE_EF_OAUTH_SUB ?? "aarav.mehta.dev@eightfolddemo-atilondiya.com";

interface CachedToken {
	access_token: string;
	expires_at_ms: number;
}

let _cachedToken: CachedToken | null = null;
let _pendingMint: Promise<string> | null = null;

async function mintToken(): Promise<string> {
	// Single-flight: if a mint is already in progress, await it.
	if (_pendingMint) return _pendingMint;
	_pendingMint = (async () => {
		try {
			const response = await fetch("/oauth/v1/authenticate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					grant_type: "jwt_bearer",
					client_id: OAUTH_CLIENT_ID,
					client_secret: OAUTH_CLIENT_SECRET,
					sub: OAUTH_SUB,
				}),
			});
			if (!response.ok) {
				let body: unknown;
				try {
					body = await response.json();
				} catch {
					body = await response.text();
				}
				throw new ApiError(response, body);
			}
			const data = (await response.json()) as {
				access_token: string;
				expires_in?: number;
			};
			const ttlMs = ((data.expires_in ?? 3600) - 30) * 1000;
			_cachedToken = {
				access_token: data.access_token,
				expires_at_ms: Date.now() + ttlMs,
			};
			return data.access_token;
		} finally {
			_pendingMint = null;
		}
	})();
	return _pendingMint;
}

async function getToken(force = false): Promise<string> {
	if (force) {
		_cachedToken = null;
	}
	if (_cachedToken && _cachedToken.expires_at_ms > Date.now()) {
		return _cachedToken.access_token;
	}
	return mintToken();
}

async function fetchApi<T>(
	endpoint: string,
	options?: RequestInit & {
		params?: Record<string, string | undefined>;
	}
): Promise<T> {
	const { params, ...fetchOptions } = options ?? {};
	const url = buildUrl(endpoint, params);

	const doFetch = async (token: string) =>
		fetch(url, {
			...fetchOptions,
			credentials: "include",
			headers: {
				Authorization: `Bearer ${token}`,
				...fetchOptions.headers,
			},
		});

	let response = await doFetch(await getToken());
	if (response.status === 401) {
		// Token may have expired or been revoked; mint a fresh one and retry once.
		response = await doFetch(await getToken(true));
	}

	if (!response.ok) {
		let body: unknown;
		try {
			body = await response.json();
		} catch {
			body = await response.text();
		}
		throw new ApiError(response, body);
	}

	return (await response.json()) as T;
}

export async function fetchApiGet<T>(
	endpoint: string,
	parameters?: Record<string, string | undefined>
): Promise<T> {
	return fetchApi<T>(endpoint, {
		method: "GET",
		params: parameters,
	});
}

export async function fetchApiPost<T>(
	endpoint: string,
	body: unknown
): Promise<T> {
	return fetchApi<T>(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export async function fetchApiPut<T>(
	endpoint: string,
	body: unknown
): Promise<T> {
	return fetchApi<T>(endpoint, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export async function fetchApiPatch<T>(
	endpoint: string,
	body: unknown
): Promise<T> {
	return fetchApi<T>(endpoint, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

export async function fetchApiDelete<T>(endpoint: string): Promise<T> {
	return fetchApi<T>(endpoint, {
		method: "DELETE",
	});
}

export async function fetchApiBlob(
	endpoint: string,
	parameters?: Record<string, string | undefined>
): Promise<Blob> {
	const url = buildUrl(endpoint, parameters);
	const token = await getToken();
	const response = await fetch(url, {
		method: "GET",
		credentials: "include",
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		let body: unknown;
		try {
			body = await response.json();
		} catch {
			body = await response.text();
		}
		throw new ApiError(response, body);
	}

	return response.blob();
}
