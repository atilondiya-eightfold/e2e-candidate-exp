/**
 * Composes the candidate-prep v2 hooks into the display shape the
 * existing pages already consume (`PrepState` in mocks/data.ts). This
 * lets us swap mock → real API by changing one import in the pages.
 *
 * v1 wiring (post `docs/api-contract.md` §8):
 * - Uses `dimensions[]` + `studyTopics[]` from gap-analysis directly.
 * - Pulls mock history from `/mocks` instead of the fixture.
 * - Pulls study plan structure from `/study-plan` instead of the fixture.
 *
 * When the API errors or the demo store is in non-`populated` mode the
 * selector falls back to the local fixture so the page always renders.
 */

import { useMemo } from "react";

import {
	populatedState,
	type ApplicationSummary,
	type GapDimension as DisplayDimension,
	type GapSeverity,
	type MockSummary as DisplayMockSummary,
	type PrepState,
	type StudyPlan as DisplayStudyPlan,
	type StudyResource as DisplayStudyResource,
	type StudySection as DisplayStudySection,
	type TimelineStage,
	type TopicChip,
} from "../mocks/data";
import { usePrepDemoStore, type DemoState } from "../store";
import type {
	ApplicationDetail,
	GapDimension as ApiGapDimension,
	MockSummary as ApiMockSummary,
	StudyPlan as ApiStudyPlan,
	StudySection as ApiStudySection,
} from "../api/types";
import {
	useApplication,
	useGapAnalysis,
	useMocks,
	useReadiness,
	useStageContent,
	useStudyPlan,
} from "./index";

export interface PrepDataResult {
	state: "loading" | "error" | "empty" | "ready";
	data: PrepState | null;
	source: "api" | "fixture";
	errorReference?: string;
}

const FIXTURE_REFERENCE = "req-demo-fixture";

function timelineFromStages(detail: ApplicationDetail): TimelineStage[] {
	return detail.stages.map((s) => {
		const status =
			s.status === "completed"
				? "complete"
				: s.stage_id === detail.active_stage_id ||
					  ["scheduled", "active", "in_progress"].includes(s.status)
					? "current"
					: "upcoming";
		return { label: s.name, status } as TimelineStage;
	});
}

function chipFromApi(c: { id: string; label: string }): TopicChip {
	return { id: c.id, label: c.label };
}

function gapDimensionsFromApi(dims: ApiGapDimension[]): DisplayDimension[] {
	return dims.map((d) => ({
		id: d.dimension_id,
		name: d.name,
		severity: d.severity,
		rationale: d.rationale,
		studyTopics: d.study_topics.map(chipFromApi),
	}));
}

function buildApplicationSummary(
	applicationId: string,
	detail: ApplicationDetail,
): ApplicationSummary {
	const activeStage = detail.stages.find(
		(s) => s.stage_id === detail.active_stage_id,
	);
	const scheduledAt =
		activeStage?.scheduled_at != null
			? new Date(activeStage.scheduled_at * 1000)
			: null;
	const parts: string[] = [];
	if (activeStage) {
		parts.push(activeStage.name);
		if (activeStage.interviewer_name) {
			parts.push(`with ${activeStage.interviewer_name}`);
		}
		if (scheduledAt) {
			parts.push(scheduledAt.toLocaleString());
		}
	}
	const stageMetaParts: string[] = [];
	if (scheduledAt) {
		const days = Math.max(
			0,
			Math.round((scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
		);
		stageMetaParts.push(`${days} days away`);
	}
	if (activeStage?.estimated_duration_label) {
		stageMetaParts.push(activeStage.estimated_duration_label);
	}
	if (activeStage?.focus_summary) {
		stageMetaParts.push(activeStage.focus_summary);
	}

	return {
		id: applicationId,
		roleTitle:
			detail.position_title ?? populatedState.application.roleTitle,
		appliedOn: populatedState.application.appliedOn,
		location: populatedState.application.location,
		stageTitle: parts.length
			? parts.join(" · ")
			: populatedState.application.stageTitle,
		stageMeta: stageMetaParts.length
			? stageMetaParts.join(" · ")
			: populatedState.application.stageMeta,
		timeline: timelineFromStages(detail),
	};
}

function studySectionFromApi(s: ApiStudySection): DisplayStudySection {
	const resources: DisplayStudyResource[] = s.resources.map((r) => ({
		id: r.id,
		title: r.title,
		type: r.type,
		durationMin: r.duration_min,
		url: r.url,
		publisher: r.publisher,
		done: r.done,
	}));
	return {
		dimensionId: s.dimension_id,
		name: s.name,
		severity: s.severity as GapSeverity,
		totalMin: s.total_min,
		completedCount: s.completed_count,
		totalCount: s.total_count,
		completed: s.completed,
		studyTopics: s.study_topics.map(chipFromApi),
		resources,
	};
}

function studyPlanFromApi(plan: ApiStudyPlan): DisplayStudyPlan {
	return {
		totalRemainingMin: plan.total_remaining_min,
		completedCount: plan.completed_count,
		totalCount: plan.total_count,
		upNext: plan.up_next
			? {
					sectionId: plan.up_next.section_id,
					resourceId: plan.up_next.resource_id,
				}
			: null,
		sections: plan.sections.map(studySectionFromApi),
	};
}

function mocksFromApi(rows: ApiMockSummary[]): DisplayMockSummary[] {
	return rows.map((m) => ({
		id: m.mock_id,
		number: m.mock_number,
		title: m.title,
		dateLabel: m.completed_at
			? new Date(m.completed_at * 1000).toLocaleDateString(undefined, {
					month: "short",
					day: "numeric",
				})
			: "scheduled",
		durationMin: Math.round(m.duration_sec / 60),
		score: m.score,
		status:
			m.status === "completed"
				? "completed"
				: m.status === "scheduled"
					? "scheduled"
					: m.status === "in_progress"
						? "in_progress"
						: "discarded",
	}));
}

export function usePrepData(applicationId: string): PrepDataResult {
	const demoState: DemoState = usePrepDemoStore((s) => s.state);
	const apiEnabled = demoState === "populated";

	const appQ = useApplication(apiEnabled ? applicationId : undefined);
	const prepSessionId = apiEnabled ? appQ.data?.prep_session_id : undefined;
	const gapQ = useGapAnalysis(prepSessionId);
	const readinessQ = useReadiness(prepSessionId);
	const studyPlanQ = useStudyPlan(prepSessionId);
	const mocksQ = useMocks(apiEnabled ? 10 : undefined);
	const activeStageId =
		apiEnabled && appQ.data?.active_stage_id
			? appQ.data.active_stage_id
			: undefined;
	const stageQ = useStageContent(activeStageId);

	return useMemo<PrepDataResult>(() => {
		if (demoState === "empty") {
			return { state: "empty", data: null, source: "fixture" };
		}
		if (demoState === "loading") {
			return { state: "loading", data: null, source: "fixture" };
		}
		if (demoState === "error") {
			return {
				state: "error",
				data: null,
				source: "fixture",
				errorReference: FIXTURE_REFERENCE,
			};
		}

		// "populated" — use the API; fall back to fixture on any failure.
		if (appQ.isLoading) {
			return { state: "loading", data: null, source: "api" };
		}
		if (appQ.isError || !appQ.data) {
			return { state: "ready", data: populatedState, source: "fixture" };
		}

		const application = buildApplicationSummary(applicationId, appQ.data);
		const dims = gapQ.data?.dimensions
			? gapDimensionsFromApi(gapQ.data.dimensions)
			: [];
		const counts = {
			high: dims.filter((d) => d.severity === "high").length,
			medium: dims.filter((d) => d.severity === "medium").length,
			covered: dims.filter((d) => d.severity === "covered").length,
		};
		const readinessPct = readinessQ.data?.score ?? 0;
		const mocks = mocksQ.data
			? mocksFromApi(mocksQ.data)
			: populatedState.mocks;
		const studyPlan = studyPlanQ.data
			? studyPlanFromApi(studyPlanQ.data)
			: populatedState.studyPlan;

		const data: PrepState = {
			application,
			gap: gapQ.data
				? {
						generated: true,
						generatedOn: new Date(gapQ.data.computed_at * 1000)
							.toLocaleDateString(),
						dimensions: dims,
						counts,
					}
				: null,
			mocks,
			studyPlan,
			readinessPct,
		};
		return { state: "ready", data, source: "api" };
	}, [
		applicationId,
		appQ.data,
		appQ.isError,
		appQ.isLoading,
		demoState,
		gapQ.data,
		mocksQ.data,
		readinessQ.data?.score,
		stageQ.data,
		studyPlanQ.data,
	]);
}
