/**
 * TanStack Query keys for candidate-prep. Centralized so invalidations
 * stay consistent.
 */

export const candidatePrepKeys = {
	all: ["candidate-prep"] as const,
	applications: () => [...candidatePrepKeys.all, "applications"] as const,
	application: (applicationId: number | string) =>
		[...candidatePrepKeys.all, "application", String(applicationId)] as const,
	prepSession: (applicationId: number | string) =>
		[...candidatePrepKeys.all, "prep-session", String(applicationId)] as const,
	gapAnalysis: (prepSessionId: string) =>
		[...candidatePrepKeys.all, "gap-analysis", prepSessionId] as const,
	readiness: (prepSessionId: string) =>
		[...candidatePrepKeys.all, "readiness", prepSessionId] as const,
	stageContent: (stageId: string) =>
		[...candidatePrepKeys.all, "stage-content", stageId] as const,
	stageCalendar: (stageId: string) =>
		[...candidatePrepKeys.all, "stage-calendar", stageId] as const,
	studyPlan: (prepSessionId: string) =>
		[...candidatePrepKeys.all, "study-plan", prepSessionId] as const,
	mocks: () => [...candidatePrepKeys.all, "mocks"] as const,
	mock: (mockId: string) =>
		[...candidatePrepKeys.all, "mock", mockId] as const,
	mockStatus: (mockId: string) =>
		[...candidatePrepKeys.all, "mock-status", mockId] as const,
	mockFeedback: (mockId: string) =>
		[...candidatePrepKeys.all, "mock-feedback", mockId] as const,
	mockTranscript: (mockId: string) =>
		[...candidatePrepKeys.all, "mock-transcript", mockId] as const,
};
