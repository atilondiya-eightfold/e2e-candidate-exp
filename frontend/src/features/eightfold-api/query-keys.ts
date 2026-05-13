/**
 * Eightfold query-key factory. Single shared factory used by every per-entity
 * hooks file under hooks/use-<entity>.ts. Pass the kebab-case entity name as
 * the first arg. Cache stays unified across all entities.
 */

export const eightfoldKeys = {
	entity: (entity: string) => [entity] as const,
	all: (entity: string) => [entity] as const,
	lists: (entity: string) => [entity, "list"] as const,
	list: (entity: string, filters?: Record<string, unknown>) =>
		[entity, "list", filters ?? {}] as const,
	details: (entity: string) => [entity, "detail"] as const,
	detail: (entity: string, id: string) =>
		[entity, "detail", id] as const,
	sub: (entity: string, id: string, sub: string, params?: unknown) =>
		[entity, "detail", id, sub, params ?? {}] as const,
	batch: (entity: string, ids: readonly string[]) =>
		[entity, "batch", [...ids].sort()] as const,
};
