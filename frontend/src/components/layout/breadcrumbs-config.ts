export interface BreadcrumbContext {
	params: Record<string, string>;
	pathname: string;
}

export type BreadcrumbResolver = string | ((ctx: BreadcrumbContext) => string);

/**
 * Map of TanStack Router `routeId` to a breadcrumb label or resolver.
 * Add an entry here when a new route is created. Routes not in the map
 * are skipped in the breadcrumb trail (useful for layout-only routes).
 */
export const BREADCRUMBS: Record<string, BreadcrumbResolver> = {};

/**
 * Resolve a breadcrumb label for a given TanStack Router routeId.
 * Returns null when the route has no registered label (route is skipped).
 */
export function resolveBreadcrumb(routeId: string, ctx: BreadcrumbContext): string | null {
	const entry = BREADCRUMBS[routeId];
	if (entry === undefined) return null;
	if (typeof entry === "string") return entry;
	return entry(ctx);
}
