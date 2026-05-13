/**
 * TanStack Query hooks for the 7 candidate-prep v2 endpoints.
 * Spec: docs/api-contract.md §3.
 *
 * Conventions:
 * - 401/403 are surfaced unchanged (AuthGate handles redirect).
 * - 404 is a terminal error: do not retry.
 * - GET hooks reuse the global QueryClient retry policy from
 *   features/eightfold-api (no retry on 401/403, otherwise 3 attempts).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cpGet, cpPost } from "../api/client";
import { candidatePrepKeys } from "../api/keys";
import type {
	ApplicationDetail,
	ApplicationRow,
	GapAnalysis,
	PrepSession,
	Readiness,
	StageCalendar,
	StageContent,
} from "../api/types";

function noRetryOn404(failureCount: number, error: unknown): boolean {
	const status = (error as { status?: number }).status;
	if (status === 404 || status === 401 || status === 403) return false;
	// Network failures (timeout, aborted, ECONNREFUSED) surface as Error
	// without a numeric `.status` — fail fast so the UI can fall back to
	// the fixture without a 15s retry cascade.
	if (status === undefined) return false;
	return failureCount < 3;
}

// 3.1 — list applications
export function useApplications(limit?: number) {
	return useQuery({
		queryKey: candidatePrepKeys.applications(),
		queryFn: () =>
			cpGet<ApplicationRow[]>(
				"/applications",
				limit !== undefined ? { limit } : undefined,
			),
		retry: noRetryOn404,
	});
}

// 3.2 — application detail
export function useApplication(applicationId: number | string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.application(applicationId ?? ""),
		queryFn: () => cpGet<ApplicationDetail>(`/applications/${applicationId}`),
		enabled: applicationId !== undefined,
		retry: noRetryOn404,
	});
}

// 3.3 — create / look up prep session
export function useCreatePrepSession() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (applicationId: number) =>
			cpPost<PrepSession>("/prep-session", { applicationId }),
		onSuccess: (data, applicationId) => {
			qc.setQueryData(candidatePrepKeys.prepSession(applicationId), data);
		},
	});
}

// 3.4 — gap analysis
export function useGapAnalysis(prepSessionId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.gapAnalysis(prepSessionId ?? ""),
		queryFn: () =>
			cpGet<GapAnalysis>(`/prep-session/${prepSessionId}/gap-analysis`),
		enabled: Boolean(prepSessionId),
		retry: noRetryOn404,
		staleTime: 60 * 60 * 1000, // matches the Redis 1h TTL on the server.
	});
}

// 3.5 — readiness
export function useReadiness(prepSessionId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.readiness(prepSessionId ?? ""),
		queryFn: () =>
			cpGet<Readiness>(`/prep-session/${prepSessionId}/readiness`),
		enabled: Boolean(prepSessionId),
		retry: noRetryOn404,
		staleTime: 60 * 60 * 1000,
	});
}

// 3.6 — stage content
export function useStageContent(stageId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.stageContent(stageId ?? ""),
		queryFn: () => cpGet<StageContent>(`/stage/${stageId}/content`),
		enabled: Boolean(stageId),
		retry: noRetryOn404,
	});
}

// 3.7 — stage calendar (.ics). Used as a lazy fetch + download, not a render hook.
export function useStageCalendarDownload() {
	return useMutation({
		mutationFn: async (stageId: string) =>
			cpGet<StageCalendar>(`/stage/${stageId}/calendar`),
		onSuccess: (data) => {
			const blob = new Blob([data.ics], { type: "text/calendar;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = data.filename;
			a.click();
			URL.revokeObjectURL(url);
		},
	});
}
