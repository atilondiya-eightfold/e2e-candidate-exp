/**
 * Thin fetch wrapper for /api/v2/candidate_prep/*. Reuses the boilerplate
 * eightfold-api client conventions: BFF-only auth (cookies), the response
 * envelope (`{ data, metadata?, errors }`) is unwrapped here.
 */

import { getContextEntries } from "@/features/auth";
import { ApiError } from "@/features/eightfold-api/errors";

const BASE = "/api/v2/candidate_prep";

function appendContext(url: string): string {
	const entries = getContextEntries();
	if (entries.length === 0) return url;
	const qs = entries
		.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
		.join("&");
	const sep = url.includes("?") ? "&" : "?";
	return `${url}${sep}${qs}`;
}
const DEFAULT_TIMEOUT_MS = 20_000;

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
	const ctrl = new AbortController();
	const t = window.setTimeout(() => ctrl.abort(), ms);
	return { signal: ctrl.signal, cancel: () => window.clearTimeout(t) };
}

function camelToSnake(s: string): string {
	return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function normalizeKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalizeKeys);
	if (value !== null && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[camelToSnake(k)] = normalizeKeys(v);
		}
		return out;
	}
	return value;
}

function isEnvelope(v: unknown): v is { data: unknown } {
	if (v === null || typeof v !== "object") return false;
	const o = v as Record<string, unknown>;
	if (!("data" in o)) return false;
	const otherKeys = Object.keys(o).filter((k) => k !== "data");
	return otherKeys.every((k) => k === "metadata" || k === "errors" || k === "error");
}

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
	const parsed = (await response.json()) as unknown;
	const body = isEnvelope(parsed) ? parsed.data : parsed;
	return normalizeKeys(body) as T;
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
	const url = appendContext(
		qs.toString() ? `${BASE}${path}?${qs}` : `${BASE}${path}`,
	);
	const t = withTimeout(DEFAULT_TIMEOUT_MS);
	try {
		const r = await fetch(url, { credentials: "include", signal: t.signal });
		return await unwrap<T>(r);
	} finally {
		t.cancel();
	}
}

export async function cpPost<T>(path: string, body: unknown): Promise<T> {
	const t = withTimeout(DEFAULT_TIMEOUT_MS);
	try {
		const r = await fetch(appendContext(`${BASE}${path}`), {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: t.signal,
		});
		return await unwrap<T>(r);
	} finally {
		t.cancel();
	}
}

export async function cpDelete<T>(path: string): Promise<T> {
	const t = withTimeout(DEFAULT_TIMEOUT_MS);
	try {
		const r = await fetch(appendContext(`${BASE}${path}`), {
			method: "DELETE",
			credentials: "include",
			signal: t.signal,
		});
		return await unwrap<T>(r);
	} finally {
		t.cancel();
	}
}
