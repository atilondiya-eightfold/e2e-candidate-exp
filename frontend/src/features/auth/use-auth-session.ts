import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export interface AuthSession {
	email: string;
	group_id: string;
}

const AUTH_SESSION_PATH = "/api/v1/auth/session";

export function useAuthSession(): UseQueryResult<AuthSession> {
	return useQuery<AuthSession>({
		queryKey: ["auth", "session"],
		queryFn: async (): Promise<AuthSession> => {
			const res = await fetch(AUTH_SESSION_PATH, { credentials: "include" });
			if (!res.ok) throw new Error("unauthenticated");
			return (await res.json()) as AuthSession;
		},
		staleTime: Infinity,
		retry: false,
	});
}
