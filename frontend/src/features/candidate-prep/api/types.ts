/**
 * Wire types for the 7 candidate-prep v2 endpoints.
 * Source of truth: docs/api-contract.md §3.
 *
 * Field names mirror the API (snake_case) — do not rename in this file.
 * Display-layer renaming/normalisation happens in selectors, not here.
 */

export interface ApiEnvelope<T> {
	data: T;
	metadata?: { total_found?: number; start_index?: number };
	errors: Array<{ message: string }>;
}

// 3.1 / 3.2 — applications

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
}

export interface ApplicationDetail {
	application_id: number;
	position_id: number;
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

// 3.4 — gap analysis

export interface Gap {
	skill_name: string;
	gap_level: number;
	source: "role_feed" | "position_skills";
}

export interface GapAnalysis {
	prep_session_id: string;
	gaps: Gap[];
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

// 3.6 — stage content

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

export interface StageContent {
	stage_type: StageType;
	title: string;
	description: string;
	what_to_expect: string[];
	checklist: string[];
	resources: StageResource[];
}

// 3.7 — calendar

export interface StageCalendar {
	stage_id: string;
	filename: string;
	ics: string;
}
