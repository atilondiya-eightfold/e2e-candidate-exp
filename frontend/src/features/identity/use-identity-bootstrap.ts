import { useEffect } from "react";

import { useEmployees } from "@/features/eightfold-api";
import { useIdentityStore } from "@/store/identity";

/**
 * Root-level identity bootstrap — decision §7.1 of the integration plan.
 *
 * Resolves the authenticated user's `email` (written into the identity
 * store by `AuthGate` once `useAuthSession` returns) to an encoded
 * profile id by calling
 * `GET /api/v2/core/employees?filterQuery=email:<email>` and reading
 * `data[0].id`. That encoded id is what every downstream EF detail
 * endpoint accepts; the HRIS row's `id` field is the HRIS-internal id
 * and will not satisfy `/employees/:id`, `/profiles/:id`, etc.
 *
 * Identity status flips to `idle` while no email is present, so the
 * dashboard can render an empty `Welcome` banner instead of issuing a
 * request that we know will fail.
 */
export function useIdentityBootstrap(
	emailInput: string | null | undefined,
): void {
	const setEmail = useIdentityStore((s) => s.setEmail);
	const setProfileId = useIdentityStore((s) => s.setProfileId);
	const setTitle = useIdentityStore((s) => s.setTitle);
	const setStatus = useIdentityStore((s) => s.setStatus);
	const setError = useIdentityStore((s) => s.setError);

	const email = emailInput ?? null;

	const query = useEmployees(
		email ? { filterQuery: `email:${email}`, limit: 1 } : undefined,
		{ enabled: !!email },
	);

	useEffect(() => {
		setEmail(email);
	}, [email, setEmail]);

	useEffect(() => {
		if (!email) {
			setStatus("idle");
			setProfileId(null);
			setTitle(null);
			setError(null);
			return;
		}
		if (query.isLoading) {
			setStatus("loading");
			setError(null);
			return;
		}
		if (query.isError) {
			setStatus("error");
			setError(
				query.error.message ||
					`Couldn't resolve profile for ${email}.`,
			);
			setProfileId(null);
			setTitle(null);
			return;
		}
		if (query.isSuccess) {
			const row = query.data.data?.[0];
			const resolvedId = row?.id ?? null;
			if (!resolvedId) {
				setStatus("error");
				setError(`No employee record found for ${email}.`);
				setProfileId(null);
				setTitle(null);
				return;
			}
			setProfileId(resolvedId);
			// `title` drives persona regex — see `inferPersona` in
			// `@/store/identity`. Fall back to `role` if title is empty.
			setTitle(row?.title ?? row?.role ?? null);
			setStatus("ready");
			setError(null);
		}
	}, [
		email,
		query.isLoading,
		query.isError,
		query.isSuccess,
		query.data,
		query.error,
		setError,
		setProfileId,
		setTitle,
		setStatus,
	]);
}
