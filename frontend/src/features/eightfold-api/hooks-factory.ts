/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationOptions,
	type UseQueryOptions,
} from "@tanstack/react-query";
import { eightfoldKeys } from "./query-keys";
import type { ListResult, OpInvokeArgs } from "./service-factory";

interface MinService<T> {
	getById: (id: string) => Promise<T>;
	list: (filters?: any) => Promise<ListResult<T>>;
	batchFetch: (ids: readonly string[]) => Promise<T[]>;
	create: (input: any) => Promise<T>;
	update: (id: string, input: any) => Promise<T>;
	patch?: (id: string, input: any) => Promise<T>;
	delete: (id: string) => Promise<void>;
	call: <R = unknown>(opKey: string, args?: OpInvokeArgs) => Promise<R>;
	__entity: string;
}

export function createEntityHooks<T, F = any>(entity: string, serviceArg: any) {
	const service = serviceArg as MinService<T>;
	const useDetail = (
		id: string,
		_paramsOrOptions?: any,
		options?: Omit<UseQueryOptions<T, Error, T, any>, "queryKey" | "queryFn">,
	) =>
		useQuery({
			queryKey: eightfoldKeys.detail(entity, id),
			queryFn: () => service.getById(id),
			enabled: id.length > 0,
			...options,
		});

	const useList = (
		filters?: F,
		_paramsOrOptions?: any,
		options?: Omit<UseQueryOptions<ListResult<T>, Error, ListResult<T>, any>, "queryKey" | "queryFn">,
	) =>
		useQuery({
			queryKey: eightfoldKeys.list(entity, filters as Record<string, unknown> | undefined),
			queryFn: () => service.list(filters),
			...options,
		});

	const useBatchFetch = (
		ids: readonly string[],
		options?: Omit<UseQueryOptions<T[], Error, T[], any>, "queryKey" | "queryFn">,
	) =>
		useQuery({
			queryKey: eightfoldKeys.batch(entity, ids),
			queryFn: () => service.batchFetch(ids),
			enabled: ids.length > 0,
			...options,
		});

	const useCreate = <CI>(options?: UseMutationOptions<T, Error, CI>) => {
		const client = useQueryClient();
		return useMutation({
			mutationFn: (input: CI) => service.create(input as any),
			...options,
			onSuccess: (data, vars, ctx) => {
				void client.invalidateQueries({ queryKey: eightfoldKeys.lists(entity) });
				(options?.onSuccess as any)?.(data, vars, ctx);
			},
		});
	};

	const useUpdate = <UI>(options?: UseMutationOptions<T, Error, { id: string; input: UI }>) => {
		const client = useQueryClient();
		return useMutation({
			mutationFn: ({ id, input }: { id: string; input: UI }) => service.update(id, input as any),
			...options,
			onSuccess: (data, vars, ctx) => {
				void client.invalidateQueries({ queryKey: eightfoldKeys.detail(entity, vars.id) });
				void client.invalidateQueries({ queryKey: eightfoldKeys.lists(entity) });
				(options?.onSuccess as any)?.(data, vars, ctx);
			},
		});
	};

	const usePatch = <UI>(options?: UseMutationOptions<T, Error, { id: string; input: Partial<UI> }>) => {
		const client = useQueryClient();
		return useMutation({
			mutationFn: ({ id, input }: { id: string; input: Partial<UI> }) => {
				if (!service.patch) return Promise.reject(new Error(`hooks-factory: ${entity}.patch not defined`));
				return service.patch(id, input as any);
			},
			...options,
			onSuccess: (data, vars, ctx) => {
				void client.invalidateQueries({ queryKey: eightfoldKeys.detail(entity, vars.id) });
				void client.invalidateQueries({ queryKey: eightfoldKeys.lists(entity) });
				(options?.onSuccess as any)?.(data, vars, ctx);
			},
		});
	};

	const useDelete = (options?: UseMutationOptions<void, Error, string>) => {
		const client = useQueryClient();
		return useMutation({
			mutationFn: (id: string) => service.delete(id),
			...options,
			onSuccess: (data, id, ctx) => {
				void client.invalidateQueries({ queryKey: eightfoldKeys.detail(entity, id) });
				void client.invalidateQueries({ queryKey: eightfoldKeys.lists(entity) });
				(options?.onSuccess as any)?.(data, id, ctx);
			},
		});
	};

	// Custom-op query hook factory. For non-standard GET ops (sub-resource lists, search
	// variants, etc.), per-entity hooks files call this to wire a useQuery against the named op.
	function makeOpQuery<R = unknown>(opKey: string) {
		return (
			args?: OpInvokeArgs,
			options?: Omit<UseQueryOptions<R, Error, R, any>, "queryKey" | "queryFn">,
		) => {
			const pathFingerprint = args?.path ? Object.values(args.path).join("/") : "default";
			const queryKey = eightfoldKeys.sub(entity, pathFingerprint, opKey, args?.query ?? {});
			const allPathFilled = !args?.path || Object.values(args.path).every(v => v && v.length > 0);
			return useQuery({
				queryKey,
				queryFn: () => service.call<R>(opKey, args),
				enabled: allPathFilled,
				...options,
			});
		};
	}

	// Custom-op mutation hook factory. For non-standard POST/PUT/PATCH/DELETE ops.
	function makeOpMutation<R = unknown>(opKey: string) {
		return (options?: UseMutationOptions<R, Error, OpInvokeArgs | undefined>) => {
			const client = useQueryClient();
			return useMutation({
				mutationFn: (args?: OpInvokeArgs) => service.call<R>(opKey, args),
				...options,
				onSuccess: (data, vars, ctx) => {
					void client.invalidateQueries({ queryKey: eightfoldKeys.lists(entity) });
					(options?.onSuccess as any)?.(data, vars, ctx);
				},
			});
		};
	}

	return { useDetail, useList, useBatchFetch, useCreate, useUpdate, usePatch, useDelete, makeOpQuery, makeOpMutation } as const;
}
