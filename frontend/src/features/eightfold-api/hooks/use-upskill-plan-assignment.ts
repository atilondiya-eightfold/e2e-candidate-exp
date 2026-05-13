// @generator:skip — Hand-written sub-resource hook (path-scoped by profileEncId).
// Generator emits a flat list hook for `upskill-plan-assignment`, but the upstream
// path is `/{profileEncId}/upskill-plan-assignment`, so we wire a 3-arg signature.
// The @generator:skip marker tells `_generator/generate.ts` to leave this file untouched.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchApiGet } from "../client";
import { eightfoldKeys } from "../query-keys";
import type { ListEnvelope } from "../types/shared";
import type { UpskillPlanAssignment } from "../types/upskill-plan-assignment";

export function useUpskillPlanAssignment(
	profileEncId: string,
	planId: string,
	options?: Omit<UseQueryOptions<UpskillPlanAssignment, Error, UpskillPlanAssignment, any>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: eightfoldKeys.detail("upskill-plan-assignment", `${profileEncId}/${planId}`),
		queryFn: () =>
			fetchApiGet<UpskillPlanAssignment>(`/careerhub/${profileEncId}/upskill-plan-assignment/${planId}`),
		enabled: !!profileEncId && !!planId,
		...options,
	});
}

export function useUpskillPlanAssignments(
	profileEncId: string,
	params?: { limit?: number; status?: string; offset?: number },
	options?: Omit<UseQueryOptions<ListEnvelope<UpskillPlanAssignment>, Error, ListEnvelope<UpskillPlanAssignment>, any>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: eightfoldKeys.list("upskill-plan-assignment", { profileEncId, ...params }),
		queryFn: () => {
			const qs: Record<string, string | undefined> = {};
			if (params?.limit !== undefined) qs["limit"] = String(params.limit);
			if (params?.status !== undefined) qs["status"] = params.status;
			if (params?.offset !== undefined) qs["offset"] = String(params.offset);
			return fetchApiGet<ListEnvelope<UpskillPlanAssignment>>(`/careerhub/${profileEncId}/upskill-plan-assignment`, qs);
		},
		enabled: !!profileEncId,
		...options,
	});
}
