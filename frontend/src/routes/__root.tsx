import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactElement, type ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { AuthErrorScreen } from "@/components/shared/AuthErrorScreen";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { useAuthSession } from "@/features/auth";
import { DemoToolbar } from "@/features/candidate-prep/components/DemoToolbar";
import { useIdentityBootstrap } from "@/features/identity";
import { useIdentityStore } from "@/store/identity";

function AuthGate({ children }: { children: ReactNode }): ReactElement {
	const { data, isLoading, isError } = useAuthSession();
	const setEmail = useIdentityStore((s) => s.setEmail);
	const setGroupId = useIdentityStore((s) => s.setGroupId);
	const setAuthStatus = useIdentityStore((s) => s.setAuthStatus);
	const email = useIdentityStore((s) => s.email);

	useEffect(() => {
		if (data) {
			setEmail(data.email);
			setGroupId(data.group_id);
			setAuthStatus("authenticated");
		} else if (isError) {
			setAuthStatus("unauthenticated");
		}
	}, [data, isError, setEmail, setGroupId, setAuthStatus]);

	useIdentityBootstrap(email);

	if (isLoading) return <LoadingScreen />;
	if (isError) return <AuthErrorScreen />;
	if (!data) return <LoadingScreen />;
	return <>{children}</>;
}

// Routes that handle their own auth context (e.g. PCS deep-link to /prep/*).
// AuthGate is skipped for these — the candidate-prep flow carries its own
// session token from the parent application.
const UNGATED_PREFIXES = ["/prep"];

function RootLayout(): ReactElement {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const ungated = UNGATED_PREFIXES.some((p) => pathname.startsWith(p));
	// Ungated prep routes render full-bleed (their own TopNav). Everything
	// else gets the boilerplate AppShell + AuthGate.
	if (ungated) {
		return (
			<>
				<Outlet />
				<DemoToolbar />
			</>
		);
	}
	return (
		<AppShell>
			<AuthGate>
				<Outlet />
			</AuthGate>
		</AppShell>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
