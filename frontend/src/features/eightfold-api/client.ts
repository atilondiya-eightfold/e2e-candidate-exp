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

function getAuthHeaders(): Record<string, string> {
	// Direct-to-API-server mode. The Vite dev server proxies /api/* straight
	// to https://rmeena.dev3.eightfold.ai (no BFF), so the browser participates
	// in Eightfold auth directly with the tenant's API key. The key value comes
	// from VITE_EF_API_KEY at build time; for the hackathon demo it's the same
	// rmeena.dev3 key used by curls/postman.
	const apiKey =
		import.meta.env.VITE_EF_API_KEY ?? "yhxgixomtiosurmwizgcvtesyyyatdus";
	return apiKey ? { Authorization: `Basic ${apiKey}` } : {};
}

async function fetchApi<T>(
	endpoint: string,
	options?: RequestInit & {
		params?: Record<string, string | undefined>;
	}
): Promise<T> {
	const { params, ...fetchOptions } = options ?? {};
	const url = buildUrl(endpoint, params);

	const response = await fetch(url, {
		...fetchOptions,
		credentials: "include",
		headers: {
			...getAuthHeaders(),
			...fetchOptions.headers,
		},
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

	const response = await fetch(url, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
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
