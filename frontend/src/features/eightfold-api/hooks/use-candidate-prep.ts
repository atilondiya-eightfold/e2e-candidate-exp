// Hand-written (not generated). Hooks for the three voice-mock endpoints
// shipped on the candidate_prep_api v2 entity. The autogen catalog doesn't
// know about these yet because the entity has non-standard sub-paths
// (mock-status/<id>, mock-summary/<id>); the routes go through the BFF's
// catch-all proxy at /api/v2/* exactly like every other call.
//
// Backend routes (see vscode www/api_generator/configs/api_server_v2.json
// under `candidate_prep_api`):
//   POST /api/v2/candidate_prep/candidate-prep/mock-interviews
//   GET  /api/v2/candidate_prep/candidate-prep/mock-status/<id>
//   GET  /api/v2/candidate_prep/candidate-prep/mock-summary/<id>

import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchApiGet, fetchApiPost } from "../client";
import { eightfoldKeys } from "../query-keys";

const ENTITY = "candidate-prep";
const BASE = "/candidate_prep/candidate-prep";

// -----------------------------------------------------------------------
// Request / response shapes
// -----------------------------------------------------------------------

export interface MockInterviewRequest {
	positionId: number;
	feedbackFormTemplateId: number;
	/** Optional candidate profile id. Required when calling via service-account auth. */
	profileId?: number;
	applicationId?: number;
	stageType?: string;
	interviewShortCode?: string;
}

export interface MockInterviewResponse {
	callSessionId: string;
	interviewSessionId: number;
	roomName: string;
	token: string;
	serverUrl: string;
	agentName: string;
	isNew: boolean;
}

export type MockStatusValue = "in_progress" | "completed";

export interface MockStatus {
	interviewSessionId: number;
	status: MockStatusValue;
	rawStatus: string;
	tCreate: number | null;
	completedAt: number | null;
}

export interface MockSummaryTranscriptTurn {
	role: "agent" | "user";
	message: string | null;
	time_in_call_secs: number;
}

export interface MockSummaryQuestion {
	question_id: number;
	label: string;
	transcript: MockSummaryTranscriptTurn[];
	slice_start_secs: number | null;
	slice_end_secs: number | null;
}

export interface MockSummaryCriterion {
	criteria: string;
	rating: string;
	stars: number;
	reason: string;
}

export interface MockSummaryOverallScores {
	all_criterias?: Record<string, MockSummaryCriterion>;
	reason?: string;
	compute_score_ts_ms?: number;
	group_id?: string;
	position_id?: number;
	profile_id?: number;
	session_id?: number;
	version?: number;
	[key: string]: unknown;
}

export interface MockSummary {
	interviewSessionId: number;
	status: MockStatusValue;
	totalDurationSecs: number;
	transcriptAvailable: boolean;
	questions: MockSummaryQuestion[];
	overallScores: MockSummaryOverallScores | null;
}

// -----------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------

/**
 * POST /candidate-prep/mock-interviews — start a voice mock session.
 * Returns LiveKit room + JWT; the candidate browser uses these to join.
 */
export function useStartMockInterview() {
	return useMutation<MockInterviewResponse, Error, MockInterviewRequest>({
		mutationFn: (body) =>
			fetchApiPost<MockInterviewResponse>(`${BASE}/mock-interviews`, body),
	});
}

/**
 * GET /candidate-prep/mock-status/<id> — poll while the candidate is on the
 * call. Pass `refetchInterval` (ms) to enable polling in the consumer.
 */
export function useMockStatus(
	mockInterviewId: number | string | undefined,
	options?: { refetchInterval?: number | false; enabled?: boolean }
) {
	const id = mockInterviewId ? String(mockInterviewId) : "";
	return useQuery<MockStatus>({
		queryKey: eightfoldKeys.sub(ENTITY, id, "status"),
		queryFn: () => fetchApiGet<MockStatus>(`${BASE}/mock-status/${id}`),
		enabled: Boolean(id) && (options?.enabled ?? true),
		refetchInterval: options?.refetchInterval ?? false,
	});
}

/**
 * GET /candidate-prep/mock-summary/<id> — per-question transcript slices
 * plus the ScoreInterview rubric. First fetch may take 15-30s while the
 * scoring LLM runs; cache afterwards so the page is snappy on re-render.
 */
export function useMockSummary(
	mockInterviewId: number | string | undefined,
	options?: { enabled?: boolean }
) {
	const id = mockInterviewId ? String(mockInterviewId) : "";
	return useQuery<MockSummary>({
		queryKey: eightfoldKeys.sub(ENTITY, id, "summary"),
		queryFn: () => fetchApiGet<MockSummary>(`${BASE}/mock-summary/${id}`),
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 60_000,
	});
}
