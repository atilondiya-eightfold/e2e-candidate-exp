import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getSubOverride } from "./sub-override";

export interface AuthSession {
	email: string;
	group_id: string;
}

const AUTH_SESSION_PATH = "/api/v1/auth/session";

export function useAuthSession(): UseQueryResult<AuthSession> {
	return useQuery<AuthSession>({
		queryKey: ["auth", "session", getSubOverride() ?? ""],
		queryFn: async (): Promise<AuthSession> => {
			const sub = getSubOverride();
			const url = sub
				? `${AUTH_SESSION_PATH}?sub=${encodeURIComponent(sub)}`
				: AUTH_SESSION_PATH;
			const res = await fetch(url, { credentials: "include" });
			if (!res.ok) throw new Error("unauthenticated");
			return (await res.json()) as AuthSession;
		},
		staleTime: Infinity,
		retry: false,
	});
}
