import type { ReactElement, ReactNode } from "react";

import { Breadcrumbs } from "./Breadcrumbs";

interface AppShellProps {
	children: ReactNode;
}

/**
 * App shell for an iframe-embedded frontend. Renders a single scrollable
 * column with a breadcrumb trail. The parent application owns top-level
 * navigation chrome; this shell intentionally has none of its own.
 */
export function AppShell({ children }: AppShellProps): ReactElement {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
				<Breadcrumbs />
				{children}
			</main>
		</div>
	);
}
