import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactElement, type ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { AuthErrorScreen } from "@/components/shared/AuthErrorScreen";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { useAuthSession } from "@/features/auth";
import { useIdentityBootstrap } from "@/features/identity";
import { useIdentityStore } from "@/store/identity";

// /prep/* renders full-bleed (its own TopNav) but still needs the candidate's
// email for BFF→Eightfold OAuth (sub=email). It stays inside AuthGate (so the
// BFF's cookie-derived identity flows through) but skips the AppShell chrome.
//
// Dev escape hatch: VITE_REQUIRE_PREP_AUTH=true forces the gate in dev. With
// the flag unset (default in dev) the gate is skipped for /prep so the page
// renders against the demo-store fixtures without a backend. Prod builds set
// the env var to "true" — see PROVENANCE.md for the rationale.
const FULL_BLEED_PREFIXES = ["/prep"];
const REQUIRE_PREP_AUTH =
	import.meta.env["VITE_REQUIRE_PREP_AUTH"] === "true";

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

function RootLayout(): ReactElement {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const fullBleed = FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p));
	const skipAuth = fullBleed && !REQUIRE_PREP_AUTH;
	const inner = skipAuth ? (
		<Outlet />
	) : (
		<AuthGate>
			<Outlet />
		</AuthGate>
	);
	if (fullBleed) {
		return <>{inner}</>;
	}
	return <AppShell>{inner}</AppShell>;
}

export const Route = createRootRoute({
	component: RootLayout,
});
