/**
 * Composes the candidate-prep v2 hooks into the display shape the
 * existing pages already consume (`PrepState` in mocks/data.ts). This
 * lets us swap mock → real API by changing one import in the pages.
 *
 * Mock-interview surfaces (mocks list, feedback, transcript) are NOT in
 * the v0 API — they stay on the local fixture per
 * docs/phase1-gate-decision.md.
 */

import { useMemo } from "react";

import {
	populatedState,
	type ApplicationSummary,
	type GapDimension,
	type GapSeverity,
	type PrepState,
	type TimelineStage,
} from "../mocks/data";
import { usePrepDemoStore, type DemoState } from "../store";
import {
	useApplication,
	useGapAnalysis,
	useReadiness,
	useStageContent,
} from "./index";
import type { ApplicationDetail, Gap } from "../api/types";

export interface PrepDataResult {
	state: "loading" | "error" | "empty" | "ready";
	data: PrepState | null;
	source: "api" | "fixture";
	errorReference?: string;
}

// Stable demo reference used for offline / fixture mode.
const FIXTURE_REFERENCE = "req-demo-fixture";

function severityFromGapLevel(level: number): GapSeverity {
	if (level >= 0.85) return "high";
	if (level >= 0.5) return "medium";
	return "covered";
}

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

function gapDimensionsFromApi(gaps: Gap[]): GapDimension[] {
	return gaps.map((g) => ({
		id: g.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
		name: g.skill_name,
		severity: severityFromGapLevel(g.gap_level),
		rationale:
			g.source === "role_feed"
				? "Calibrated against the role library — typical for this position."
				: "Surfaced from the position's required skills vs. your profile.",
		// API v0 doesn't carry per-gap study topic chips. The chip vocabulary
		// in the spec §7 needs server support that's not in the contract yet.
		studyTopics: [],
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
	const stageTitle = activeStage
		? `${activeStage.name}${scheduledAt ? ` · ${scheduledAt.toLocaleDateString()}` : ""}`
		: "Stage";
	return {
		id: applicationId,
		roleTitle:
			(detail as ApplicationDetail & { position_title?: string })
				.position_title ?? populatedState.application.roleTitle,
		appliedOn: populatedState.application.appliedOn,
		location: populatedState.application.location,
		stageTitle,
		stageMeta: populatedState.application.stageMeta,
		timeline: timelineFromStages(detail),
	};
}

export function usePrepData(applicationId: string): PrepDataResult {
	const demoState: DemoState = usePrepDemoStore((s) => s.state);

	// Only hit the network when the demo store is in "populated" mode.
	// Other states short-circuit to fixture-driven visuals.
	const apiEnabled = demoState === "populated";
	const appQ = useApplication(apiEnabled ? applicationId : undefined);
	const prepSessionId = apiEnabled ? appQ.data?.prep_session_id : undefined;
	const gapQ = useGapAnalysis(prepSessionId);
	const readinessQ = useReadiness(prepSessionId);
	const activeStageId =
		apiEnabled && appQ.data?.active_stage_id
			? appQ.data.active_stage_id
			: undefined;
	const stageQ = useStageContent(activeStageId);

	const composed = useMemo<PrepDataResult>(() => {
		// Manual demo overrides win — useful for screenshots and design QA.
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

		// "populated" — use the API. If the application fetch errors
		// (no backend in dev, network blip), fall back to the fixture
		// so the page still renders something sensible. Toggle DemoToolbar
		// to "error" to see the explicit error UI.
		if (appQ.isLoading) {
			return { state: "loading", data: null, source: "api" };
		}
		if (appQ.isError || !appQ.data) {
			return { state: "ready", data: populatedState, source: "fixture" };
		}

		const application = buildApplicationSummary(applicationId, appQ.data);
		const dims = gapQ.data ? gapDimensionsFromApi(gapQ.data.gaps) : [];
		const counts = {
			high: dims.filter((d) => d.severity === "high").length,
			medium: dims.filter((d) => d.severity === "medium").length,
			covered: dims.filter((d) => d.severity === "covered").length,
		};
		const readinessPct = readinessQ.data?.score ?? 0;

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
			// Mock history is Phase 2 — keep the local fixture so the tile
			// still renders something meaningful in v0.
			mocks: populatedState.mocks,
			// Study plan content is fed from stage content for v0; per-dimension
			// section grouping is a richer shape the API doesn't surface today.
			// Keep the existing fixture so the page stays interactive.
			studyPlan: populatedState.studyPlan,
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
		gapQ.isLoading,
		readinessQ.data?.score,
		readinessQ.isLoading,
		stageQ.data,
	]);

	return composed;
}
