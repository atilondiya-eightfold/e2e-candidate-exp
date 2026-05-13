import { Link as RouterLink } from "@tanstack/react-router";
import type { ReactElement } from "react";

/**
 * Drop-in replacement for `@tanstack/react-router`'s `Link` that
 * preserves the current search-string across navigations.
 * Identity bootstrap reads `?email=` (integration-plan §7.1); the
 * default TanStack `Link` strips search params, dropping the email
 * on every nav click and forcing the identity store back to idle.
 *
 * Pass `search` explicitly to override; otherwise prior search is
 * carried forward verbatim via `(prev) => prev`.
 *
 * Typed `any` because the per-route generic narrowing in TanStack's
 * Link doesn't survive a wrapper, and call sites already use
 * `to={... as never}` casts to bypass it.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function Link(props: any): ReactElement {
	const { search, ...rest } = props;
	const mergedSearch = search ?? ((prev: any) => prev);
	return <RouterLink {...rest} search={mergedSearch} />;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
