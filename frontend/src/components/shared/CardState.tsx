import type { ReactElement, ReactNode } from "react";

import { humanizeApiError } from "@/lib/api-error";

import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "./ErrorBanner";
import { SkeletonRows } from "./LoadingSkeleton";

interface QueryLike<TData> {
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	data: TData | undefined;
	refetch: () => unknown;
}

interface EmptyCopy {
	title: string;
	description?: string;
}

interface CardStateProps<TData> {
	query: QueryLike<TData>;
	empty: EmptyCopy;
	loading?: ReactNode;
	isDataEmpty?: (data: TData) => boolean;
	children: (data: TData) => ReactNode;
}

/**
 * Three-state wrapper for any TanStack Query result inside a card body.
 *
 * - `isLoading` → skeleton (caller can override; default = 3 row lines)
 * - `isError` + 404 → `EmptyState` (caller supplies copy via `empty`)
 * - `isError` + other → `ErrorBanner` with retry (hidden for 401/403)
 * - data missing or `isDataEmpty(data)` → `EmptyState`
 * - otherwise → `children(data)`
 */
export function CardState<TData>({
	query,
	empty,
	loading,
	isDataEmpty,
	children,
}: CardStateProps<TData>): ReactElement {
	if (query.isLoading) {
		return <>{loading ?? <SkeletonRows lines={3} />}</>;
	}
	if (query.isError) {
		const view = humanizeApiError(query.error);
		if (view.isEmpty) {
			return (
				<EmptyState
					compact
					description={empty.description}
					title={empty.title}
				/>
			);
		}
		return (
			<ErrorBanner
				compact
				message={view.message}
				onRetry={
					view.canRetry
						? (): void => {
								void query.refetch();
							}
						: undefined
				}
			/>
		);
	}
	if (query.data === undefined || (isDataEmpty && isDataEmpty(query.data))) {
		return (
			<EmptyState
				compact
				description={empty.description}
				title={empty.title}
			/>
		);
	}
	return <>{children(query.data)}</>;
}
