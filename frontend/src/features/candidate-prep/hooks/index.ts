/**
 * TanStack Query hooks for the candidate-prep v2 endpoints (v0 + v1).
 * Spec: docs/api-contract.md §3 + §8.
 *
 * Conventions:
 * - 401 / 403 / 404 are surfaced unchanged (AuthGate / page-level error
 *   handlers redirect or recover).
 * - Status-less network errors (down BFF, timeout) also short-circuit
 *   retries so a missing backend fails fast.
 * - GET hooks for gap-analysis / readiness mirror the server-side 1h
 *   Redis TTL with staleTime.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cpDelete, cpGet, cpPost } from "../api/client";
import { candidatePrepKeys } from "../api/keys";
import type {
	ApplicationDetail,
	ApplicationRow,
	GapAnalysis,
	MockFeedback,
	MockStatusView,
	MockSummary,
	MockTranscript,
	PrepSession,
	Readiness,
	StageCalendar,
	StageContent,
	StudyItemToggle,
	StudyPlan,
} from "../api/types";

function noRetryOnTerminalError(
	failureCount: number,
	error: unknown,
): boolean {
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
		retry: noRetryOnTerminalError,
	});
}

// 3.2 — application detail
export function useApplication(applicationId: number | string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.application(applicationId ?? ""),
		queryFn: () => cpGet<ApplicationDetail>(`/applications/${applicationId}`),
		enabled: applicationId !== undefined,
		retry: noRetryOnTerminalError,
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
		retry: noRetryOnTerminalError,
		staleTime: 60 * 60 * 1000,
	});
}

// 8.4 — regenerate gap analysis (US-7.1 retry)
export function useRegenerateGapAnalysis() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (prepSessionId: string) =>
			cpPost<GapAnalysis>(
				`/prep-session/${prepSessionId}/regenerate-gap-analysis`,
				{},
			),
		onSuccess: (data, prepSessionId) => {
			qc.setQueryData(candidatePrepKeys.gapAnalysis(prepSessionId), data);
		},
	});
}

// 3.5 — readiness
export function useReadiness(prepSessionId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.readiness(prepSessionId ?? ""),
		queryFn: () =>
			cpGet<Readiness>(`/prep-session/${prepSessionId}/readiness`),
		enabled: Boolean(prepSessionId),
		retry: noRetryOnTerminalError,
		staleTime: 60 * 60 * 1000,
	});
}

// 3.6 — stage content
export function useStageContent(stageId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.stageContent(stageId ?? ""),
		queryFn: () => cpGet<StageContent>(`/stage/${stageId}/content`),
		enabled: Boolean(stageId),
		retry: noRetryOnTerminalError,
	});
}

// 3.7 — stage calendar (.ics) — lazy fetch + download
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

// 8.5 — study plan
// Phase 1: hardcoded sections on the upstream side, no per-candidate
// parameters required. Backend ignores query strings other than v2's
// reserved keys (limit/start/exclude/keyList), so we send none.
export function useStudyPlan() {
	return useQuery({
		queryKey: candidatePrepKeys.studyPlan(""),
		queryFn: () => cpGet<StudyPlan>("/study-plan"),
		staleTime: 60 * 60 * 1000,
		retry: noRetryOnTerminalError,
	});
}

// 8.6 / 8.7 — toggle study item completion (idempotent)
function useToggleStudyItem(suffix: "complete" | "uncomplete") {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: { itemId: string; prepSessionId: string }) =>
			cpPost<StudyItemToggle>(`/study-items/${vars.itemId}/${suffix}`, {
				prepSessionId: vars.prepSessionId,
			}),
		onSuccess: (data, vars) => {
			// The server returns the refreshed plan — seed it into the cache so
			// the page re-renders without a follow-up GET.
			qc.setQueryData(
				candidatePrepKeys.studyPlan(vars.prepSessionId),
				data.study_plan,
			);
		},
	});
}
export const useCompleteStudyItem = () => useToggleStudyItem("complete");
export const useUncompleteStudyItem = () => useToggleStudyItem("uncomplete");

// 8.8 — list mocks (history)
interface MockHistoryResponse {
	mocks: MockSummary[];
	readiness_label?: string;
	readiness_pct?: number;
}
export function useMocks(limit?: number) {
	return useQuery({
		queryKey: candidatePrepKeys.mocks(),
		queryFn: async () => {
			const resp = await cpGet<MockHistoryResponse>(
				"/candidate-prep/mock-history",
				limit !== undefined ? { limit } : undefined,
			);
			return resp.mocks ?? [];
		},
		retry: noRetryOnTerminalError,
	});
}

// 8.9 — create mock
export function useCreateMock() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: {
			applicationId: number;
			focusDimensionIds?: string[];
		}) =>
			cpPost<MockSummary>("/mocks", {
				applicationId: vars.applicationId,
				focusDimensionIds: vars.focusDimensionIds,
			}),
		onSuccess: (data) => {
			qc.setQueryData(candidatePrepKeys.mock(data.mock_id), data);
			qc.invalidateQueries({ queryKey: candidatePrepKeys.mocks() });
		},
	});
}

// 8.10 — read one mock
export function useMock(mockId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.mock(mockId ?? ""),
		queryFn: () => cpGet<MockSummary>(`/mocks/${mockId}`),
		enabled: Boolean(mockId),
		retry: noRetryOnTerminalError,
	});
}

// 8.11 — discard mock
export function useDiscardMock() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (mockId: string) =>
			cpDelete<MockStatusView>(`/mocks/${mockId}`),
		onSuccess: (_data, mockId) => {
			qc.removeQueries({ queryKey: candidatePrepKeys.mock(mockId) });
			qc.invalidateQueries({ queryKey: candidatePrepKeys.mocks() });
		},
	});
}

// 8.12 — poll mock status (3s default refetch interval)
export function useMockStatus(
	mockId: string | undefined,
	options?: { pollMs?: number },
) {
	const pollMs = options?.pollMs ?? 3000;
	return useQuery({
		queryKey: candidatePrepKeys.mockStatus(mockId ?? ""),
		queryFn: () => cpGet<MockStatusView>(`/mocks/${mockId}/status`),
		enabled: Boolean(mockId),
		retry: noRetryOnTerminalError,
		refetchInterval: (q) => {
			const status = (q.state.data as MockStatusView | undefined)?.status;
			if (status === "completed" || status === "discarded" || status === "dropped") {
				return false;
			}
			return pollMs;
		},
	});
}

// 8.13 — mock feedback
export function useMockFeedback(mockId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.mockFeedback(mockId ?? ""),
		queryFn: () => cpGet<MockFeedback>(`/mocks/${mockId}/feedback`),
		enabled: Boolean(mockId),
		retry: noRetryOnTerminalError,
	});
}

// 8.14 — mock transcript
export function useMockTranscript(mockId: string | undefined) {
	return useQuery({
		queryKey: candidatePrepKeys.mockTranscript(mockId ?? ""),
		queryFn: () => cpGet<MockTranscript>(`/mocks/${mockId}/transcript`),
		enabled: Boolean(mockId),
		retry: noRetryOnTerminalError,
	});
}
