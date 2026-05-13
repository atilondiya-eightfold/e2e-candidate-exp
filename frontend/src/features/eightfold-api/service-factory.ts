/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	fetchApiDelete,
	fetchApiGet,
	fetchApiPatch,
	fetchApiPost,
	fetchApiPut,
} from "./client";

export interface OpDef {
	callerId: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	scope?: "READ" | "WRITE";
}

export interface EntityServiceConfig {
	entity: string;
	namespace: string;
	ops: Record<string, OpDef>;
}

export interface ListResult<T> {
	data: T[];
	meta?: Record<string, unknown>;
}

export interface OpInvokeArgs {
	path?: Record<string, string>;
	query?: Record<string, unknown>;
	body?: unknown;
}

function interpolate(pathTemplate: string, params: Record<string, string>): string {
	return pathTemplate.replace(/\{(\w+)\}/g, (_match: string, key: string) => {
		const v = params[key];
		if (v === undefined || v === "") {
			throw new Error(`service-factory: missing path param "${key}" for "${pathTemplate}"`);
		}
		return encodeURIComponent(v);
	});
}

function pathParams(pathTemplate: string): string[] {
	const out: string[] = [];
	const re = /\{(\w+)\}/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(pathTemplate)) !== null) {
		const token = m[1];
		if (token) out.push(token);
	}
	return out;
}

function dispatch<R>(
	method: OpDef["method"],
	endpoint: string,
	init?: { body?: unknown; query?: Record<string, string | undefined> }
): Promise<R> {
	switch (method) {
		case "GET": return fetchApiGet<R>(endpoint, init?.query);
		case "POST": return fetchApiPost<R>(endpoint, init?.body);
		case "PUT": return fetchApiPut<R>(endpoint, init?.body);
		case "PATCH": return fetchApiPatch<R>(endpoint, init?.body);
		case "DELETE": return fetchApiDelete<R>(endpoint);
	}
}

function stringifyFilters(filters?: Record<string, unknown>): Record<string, string | undefined> {
	if (!filters) return {};
	const out: Record<string, string | undefined> = {};
	for (const [k, v] of Object.entries(filters)) {
		if (v === undefined || v === null) continue;
		out[k] = typeof v === "string" ? v : JSON.stringify(v);
	}
	return out;
}

function firstPathParam(p: string): string {
	const m = /\{(\w+)\}/.exec(p);
	return m ? (m[1] ?? "id") : "id";
}

export function createEntityService<
	T,
	F = any,
	CI = Partial<T>,
	UI = Partial<T>,
>(config: EntityServiceConfig) {
	const { ops, namespace } = config;
	const nsPrefix = namespace ? `/${namespace}` : "";
	const withNs = (p: string): string => `${nsPrefix}${p}`;
	const requireOp = (key: string): OpDef => {
		const op = ops[key];
		if (!op) throw new Error(`service-factory: ${config.entity}.${key} not defined`);
		return op;
	};

	// Generic per-op invoker. Used for non-standard ops the factory doesn't have a typed
	// shortcut for (e.g. sub-resource lists, search variants). Path params are filled from
	// `args.path`; query/body are passed through directly.
	const call = <R = unknown>(opKey: string, args?: OpInvokeArgs): Promise<R> => {
		const op = requireOp(opKey);
		const tokens = pathParams(op.path);
		const filled = tokens.length > 0 ? interpolate(op.path, args?.path ?? {}) : op.path;
		return dispatch<R>(op.method, withNs(filled), {
			body: args?.body,
			query: stringifyFilters(args?.query),
		});
	};

	return {
		// Standard CRUD shortcuts (these exist only when the entity has the matching op key).
		getById: async (id: string): Promise<T> => {
			const op = requireOp("getById");
			return dispatch<T>(op.method, withNs(interpolate(op.path, { [firstPathParam(op.path)]: id })));
		},
		list: async (filters?: F): Promise<ListResult<T>> => {
			const op = requireOp("list");
			return dispatch<ListResult<T>>(op.method, withNs(op.path), { query: stringifyFilters(filters as Record<string, unknown> | undefined) });
		},
		batchFetch: async (ids: readonly string[]): Promise<T[]> => {
			const op = requireOp("batchFetch");
			const result = await dispatch<{ data: T[] } | T[]>(op.method, withNs(op.path), { body: { ids } });
			return Array.isArray(result) ? result : result.data;
		},
		create: async (input: CI): Promise<T> => {
			const op = requireOp("create");
			return dispatch<T>(op.method, withNs(op.path), { body: input });
		},
		update: async (id: string, input: UI): Promise<T> => {
			const op = requireOp("update");
			return dispatch<T>(op.method, withNs(interpolate(op.path, { [firstPathParam(op.path)]: id })), { body: input });
		},
		patch: async (id: string, input: Partial<UI>): Promise<T> => {
			const op = requireOp("patch");
			return dispatch<T>(op.method, withNs(interpolate(op.path, { [firstPathParam(op.path)]: id })), { body: input });
		},
		delete: async (id: string): Promise<void> => {
			const op = requireOp("delete");
			await dispatch<unknown>(op.method, withNs(interpolate(op.path, { [firstPathParam(op.path)]: id })));
		},
		call,
		__entity: config.entity,
		__ops: ops,
	} as const;
}

export type EntityService<T, F = any, CI = Partial<T>, UI = Partial<T>> = ReturnType<typeof createEntityService<T, F, CI, UI>>;
