/**
 * Deterministic mock data for the empty-state route. Replace with real
 * /api/candidate-prep/v2/application/:appId/state response in ui-builder.
 */

export type TimelineStageStatus = "complete" | "current" | "upcoming";

export interface TimelineStage {
	label: string;
	status: TimelineStageStatus;
}

export interface ApplicationSummary {
	id: string;
	roleTitle: string;
	appliedOn: string;
	location: string;
	timeline: TimelineStage[];
}

export const mockApplication: ApplicationSummary = {
	id: "app_mock_01",
	roleTitle: "Staff Software Engineer · Distributed Systems",
	appliedOn: "Mar 9, 2026",
	location: "Bangalore, India",
	timeline: [
		{ label: "Application", status: "complete" },
		{ label: "Recruiter conversation", status: "complete" },
		{ label: "Technical screen", status: "current" },
		{ label: "Full loop interview", status: "upcoming" },
		{ label: "Team matching", status: "upcoming" },
		{ label: "Decision", status: "upcoming" },
	],
};
