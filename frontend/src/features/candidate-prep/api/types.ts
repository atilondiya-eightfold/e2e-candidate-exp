/**
 * Wire types for the candidate-prep v2 endpoints (v0 + v1).
 * Source of truth: docs/api-contract.md §3 + §8.
 *
 * Field names mirror the API (snake_case) — do not rename in this file.
 * Display-layer renaming/normalisation happens in selectors, not here.
 */

export interface ApiEnvelope<T> {
	data: T;
	metadata?: { total_found?: number; start_index?: number };
	errors: Array<{ message: string; reference?: string }>;
}

// 3.1 / 3.2 / 8.1 — applications

export interface CurrentStage {
	name: string;
	status: string;
}

export interface ApplicationRow {
	application_id: number;
	position_id: number;
	position_title: string;
	current_stage: CurrentStage | null;
	status: string;
	t_create: number;
	prep_session_id: string;
}

export interface Stage {
	stage_id: string;
	name: string;
	status: string;
	stage_type: string | null;
	scheduled_at: number | null;
	content_available: boolean;
	// v1 deltas — see §8.1
	interviewer_name?: string | null;
	interviewer_title?: string | null;
	duration_min?: number;
	estimated_duration_label?: string;
	focus_summary?: string;
}

export interface ApplicationDetail {
	application_id: number;
	position_id: number;
	position_title?: string;
	stages: Stage[];
	active_stage_id: string | null;
	prep_session_id: string;
}

// 3.3 — prep session

export interface PrepSession {
	prep_session_id: string;
	profile_id: number;
	position_id: number;
}

// 3.4 / 8.2 — gap analysis

export interface Gap {
	skill_name: string;
	gap_level: number;
	source: "role_feed" | "position_skills";
}

export type GapSeverity = "high" | "medium" | "covered";

export interface StudyTopic {
	id: string;
	label: string;
}

export interface GapDimension {
	dimension_id: string;
	name: string;
	severity: GapSeverity;
	rationale: string;
	study_topics: StudyTopic[];
	candidate_level: number;
	role_expected_level: number;
}

export interface GapAnalysis {
	prep_session_id: string;
	gaps: Gap[];
	dimensions?: GapDimension[]; // v1 delta — preferred shape
	source: "role_feed" | "position_skills";
	computed_at: number;
	cache_hit: boolean;
}

// 3.5 — readiness

export type ReadinessLabel = "low" | "moderate" | "high";

export interface Readiness {
	prep_session_id: string;
	score: number;
	label: ReadinessLabel;
	top_gaps: string[];
	components: { gap_severity: number; mock: number | null };
}

// 3.6 / 8.3 — stage content

export type StageType =
	| "phone_screen"
	| "tech_screen"
	| "system_design"
	| "behavioral"
	| "onsite"
	| "__default__";

export interface StageResource {
	title: string;
	url: string;
	minutes: number;
	type: "read" | "video" | "book";
}

// Upstream `/api/v2/candidate_prep/stage/{stageId}/content` returns:
//   { stageId, name, whatToExpect, howEvaluated, questionsContact, tips[] }
// (camelCase wire → snake_case after the cp client's normalizer).
export interface StageContent {
	stage_id: string;
	name: string;
	what_to_expect: string;
	how_evaluated: string;
	questions_contact: string;
	tips?: string[];
}

// 3.7 — calendar

export interface StageCalendar {
	stage_id: string;
	filename: string;
	ics: string;
}

// 8.5 — study plan
//
// New backend shape (camelCase wire, snake_case after the cp client's
// camel→snake normalizer):
//
//   { sections: [{ dimension, summary, priority, resources: [...] }],
//     totalMinutes }  →  { sections: [...], total_minutes }
//
// Resources are leaner than before: no per-item id, no done flag, no
// publisher, no duration_min — instead `minutes`. The frontend synthesizes
// the missing fields in `use-prep-state.ts`.

export type StudyPriority = "high" | "medium" | "low";

export interface StudyResource {
	title: string;
	url: string;
	minutes: number;
	type: "read" | "video" | "book";
}

export interface StudySection {
	dimension: string;
	summary: string;
	priority: StudyPriority;
	resources: StudyResource[];
}

export interface StudyPlan {
	sections: StudySection[];
	total_minutes: number;
}

// 8.6 / 8.7 — study item completion

export interface StudyItemToggle {
	item_id: string;
	done: boolean;
	completed_at: number | null;
	study_plan: StudyPlan;
}

// 8.9 / 8.10 — mock interview

export type MockStatus =
	| "scheduled"
	| "in_progress"
	| "processing"
	| "completed"
	| "dropped"
	| "discarded";

export interface MockFocus {
	dimension_id: string;
	label: string;
}

export interface MockMeeting {
	provider: string;
	url: string;
	meeting_id: string;
	passcode: string;
	opens_in_new_tab: boolean;
}

export interface MockSummary {
	mock_id: string;
	mock_number: number;
	title: string;
	duration_sec: number;
	status: MockStatus;
	meeting: MockMeeting | null;
	focus: MockFocus[];
	review: MockFocus[];
	expires_at: number | null;
	completed_at: number | null;
	score: number | null;
}

// 8.12 — mock status (lightweight poll)

export interface MockStatusView {
	mock_id: string;
	status: MockStatus;
	started_at: number | null;
	elapsed_sec: number;
	min_viable_duration_sec: number;
}

// 8.13 — mock feedback

export type DimensionLevel = "weak" | "partial" | "solid" | "strong";

export interface FeedbackDimension {
	dimension_id: string;
	name: string;
	level: DimensionLevel;
	comment: string;
	study_topics: StudyTopic[];
}

export interface FeedbackMoment {
	id: string;
	timestamp: string;
	level: "strong" | "weak";
	quote: string;
	annotation: string | null;
}

export interface MockFeedback {
	mock_id: string;
	mock_number: number;
	title: string;
	completed_at: number;
	duration_sec: number;
	score: number;
	delta_vs_previous: number;
	mira_summary: string;
	dimensions: FeedbackDimension[];
	moments: FeedbackMoment[];
}

// 8.14 — mock transcript

export interface TranscriptTurn {
	id: string;
	speaker: "agent" | "candidate";
	timestamp: string;
	text: string;
	highlight: "strong" | "weak" | null;
}

export interface MockTranscript {
	mock_id: string;
	turns: TranscriptTurn[];
}
