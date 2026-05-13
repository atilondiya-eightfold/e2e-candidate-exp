/**
 * Thin fetch wrapper for /api/v2/candidate_prep/*. Reuses the boilerplate
 * eightfold-api client conventions: BFF-only auth (cookies), the response
 * envelope (`{ data, metadata?, errors }`) is unwrapped here.
 */

import { ApiError } from "@/features/eightfold-api/errors";

import type { ApiEnvelope } from "./types";

const BASE = "/api/v2/candidate_prep";

async function unwrap<T>(response: Response): Promise<T> {
	if (!response.ok) {
		let body: unknown;
		try {
			body = await response.json();
		} catch {
			body = await response.text();
		}
		throw new ApiError(response, body);
	}
	const env = (await response.json()) as ApiEnvelope<T>;
	return env.data;
}

export async function cpGet<T>(
	path: string,
	params?: Record<string, string | number | undefined>,
): Promise<T> {
	const qs = new URLSearchParams();
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			if (v !== undefined) qs.set(k, String(v));
		}
	}
	const url = qs.toString() ? `${BASE}${path}?${qs}` : `${BASE}${path}`;
	const r = await fetch(url, { credentials: "include" });
	return unwrap<T>(r);
}

export async function cpPost<T>(path: string, body: unknown): Promise<T> {
	const r = await fetch(`${BASE}${path}`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return unwrap<T>(r);
}
