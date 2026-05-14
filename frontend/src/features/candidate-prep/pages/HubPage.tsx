import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";

import { useMockHistory } from "@/features/eightfold-api/hooks";

import { ApplicationTimeline } from "../components/ApplicationTimeline";
import { ErrorPanel } from "../components/ErrorPanel";
import { PillButton } from "../components/PillButton";
import { PrepFooter } from "../components/PrepFooter";
import { TopNav } from "../components/TopNav";
import { useStageContent } from "../hooks";
import { usePrepData } from "../hooks/use-prep-state";
import type { GapDimension, MockSummary } from "../mocks/data";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

import { EmptyStatePage } from "./EmptyStatePage";

// Demo profile id — same as MockLaunchPage. Move into shared config / derive
// from current candidate session once we're past the hackathon demo.
const DEMO_PROFILE_ID = 361133;

interface Props {
	applicationId: string;
}

export function HubPage({ applicationId }: Props): ReactElement {
	const navigate = useNavigate();
	const [aboutOpen, setAboutOpen] = useState(true);
	const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
	const prep = usePrepData(applicationId);
	const history = useMockHistory(DEMO_PROFILE_ID);
	const s = strings.hub;

	// Resolve "which stage's About panel is on screen" pre-early-return so
	// the dependent useStageContent hook fires on every render (rules of
	// hooks). Falls back to the timeline's current/active stage when the
	// user hasn't clicked a specific stage yet.
	const currentTimelineStage =
		prep.data?.application.timeline.find((t) => t.status === "current") ?? null;
	const effectiveSelectedId =
		selectedStageId ?? currentTimelineStage?.id ?? null;
	const stageContentQ = useStageContent(effectiveSelectedId ?? undefined);
	const stageContent = stageContentQ.data ?? null;

	// Overlay real /mock-history data on top of the demo fixture's mocks
	// + readiness. Falls back to whatever usePrepData returned when the
	// API is loading or errored.
	const baseMocks: MockSummary[] = prep.data?.mocks ?? [];
	const baseReadiness: number = prep.data?.readinessPct ?? 0;
	const { mocks: liveMocks, readinessPct: liveReadiness } = useMemo<{
		mocks: MockSummary[];
		readinessPct: number;
	}>(() => {
		const apiRows = history.data?.mocks;
		if (!apiRows || apiRows.length === 0) {
			return { mocks: baseMocks, readinessPct: baseReadiness };
		}
		// Backend returns most-recent first. The tile reads `mocks[length-1]`
		// for "latest", so flip to ascending here.
		const mapped: MockSummary[] = apiRows
			.slice()
			.reverse()
			.map((row, idx) => ({
				id: String(row.interview_session_id),
				number: idx + 1,
				title: `Mock #${idx + 1}`,
				dateLabel: row.date_label,
				durationMin: row.duration_min ?? 0,
				// Backend score is null until rubric scoring runs. Surface a
				// stable demo placeholder so the bar chart renders.
				score: row.score ?? (row.status === "completed" ? 65 : null),
				status: row.status,
			}));
		return {
			mocks: mapped,
			readinessPct: history.data?.readiness_pct ?? baseReadiness,
		};
	}, [history.data, baseMocks, baseReadiness]);

	if (prep.state === "empty") {
		return <EmptyStatePage applicationId={applicationId} />;
	}
	if (prep.state === "loading") {
		return (
			<div className="bg-white">
				<TopNav applicationId={applicationId} />
				<div className="mx-auto max-w-4xl px-4 py-16 text-center text-[13px] text-[#65676b]">
					Loading your prep dashboard…
				</div>
			</div>
		);
	}
	if (prep.state === "error" || !prep.data) {
		return (
			<div className="bg-white">
				<TopNav applicationId={applicationId} />
				<div className="mx-auto max-w-3xl px-4 py-10">
					<ErrorPanel
						tone="red"
						icon="✦"
						title={strings.errors.genericTitle}
						body={strings.errors.genericBody}
						actions={[
							{
								label: strings.errors.retryNow,
								onClick: () =>
									usePrepDemoStore.getState().setState("populated"),
								variant: "primary",
							},
							{
								label: strings.errors.refresh,
								onClick: () => window.location.reload(),
								variant: "secondary",
							},
						]}
						referenceCode={prep.errorReference ?? "req-unknown"}
						referenceSuffix={strings.errors.referenceSupport}
					/>
				</div>
			</div>
		);
	}

	const { application, gap, studyPlan } = prep.data;
	const mocks = liveMocks;
	const readinessPct = liveReadiness;
	const selectedStage =
		application.timeline.find((t) => t.id === effectiveSelectedId) ?? null;
	const aboutHeading = selectedStage
		? `About the ${selectedStage.label} stage`
		: s.stage.aboutHeading;
	const handleStageSelect = (stageId: string) => {
		if (stageId === effectiveSelectedId && aboutOpen) {
			setAboutOpen(false);
			return;
		}
		setSelectedStageId(stageId);
		setAboutOpen(true);
	};

	const startMock = () =>
		navigate({ to: "/prep/$applicationId/mock/launch", params: { applicationId } });
	const openGap = () =>
		navigate({ to: "/prep/$applicationId/gap-report", params: { applicationId } });
	const openStudy = () =>
		navigate({ to: "/prep/$applicationId/study-plan", params: { applicationId } });
	const lastMock = mocks[mocks.length - 1];
	const openLastMockFeedback = () => {
		if (!lastMock) return;
		navigate({
			to: "/prep/$applicationId/mock/$mockId/feedback",
			params: { applicationId, mockId: lastMock.id },
		});
	};

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="px-4 py-6 sm:px-14 sm:py-8">
				<div className="mb-1.5 text-[13px] text-[#65676b]">
					<Link
						to="/prep/$applicationId"
						params={{ applicationId }}
						className="text-[#1877f2] hover:underline"
					>
						{s.breadcrumb.applications}
					</Link>{" "}
					&nbsp;{s.breadcrumb.separator}&nbsp; Staff SWE
				</div>
				<h1 className="mb-6 text-[26px] font-semibold tracking-[-0.5px] text-[#080809]">
					{application.roleTitle}
				</h1>

				{/* Application card with timeline */}
				<section className="mb-3.5 rounded-xl border border-[#e4e6eb] px-6 py-5.5">
					<div className="mb-4.5 flex flex-wrap items-start justify-between gap-3">
						<div>
							<div className="text-[14.5px] font-semibold text-[#080809]">
								{application.stageTitle}
							</div>
							<div className="mt-1 text-[12.5px] text-[#65676b]">
								{application.stageMeta}
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<PillButton
								size="sm"
								variant="secondary"
								onClick={() => setAboutOpen((v) => !v)}
								aria-expanded={aboutOpen}
							>
								{s.stage.aboutLabel}
							</PillButton>
							<PillButton size="sm" variant="primary" onClick={startMock}>
								{s.stage.joinMeeting}
							</PillButton>
						</div>
					</div>
					<ApplicationTimeline
						stages={application.timeline}
						selectedId={effectiveSelectedId}
						onSelect={handleStageSelect}
					/>
				</section>

				{/* About-this-stage collapsible panel */}
				{aboutOpen && (
					<section className="mb-7 rounded-xl border border-[#e4e6eb] bg-[#f7f8fa] px-6 py-5">
						<div className="mb-3 flex items-center justify-between">
							<h2 className="text-[14px] font-semibold text-[#080809]">
								{aboutHeading}
							</h2>
							<button
								type="button"
								onClick={() => setAboutOpen(false)}
								aria-label={s.stage.hide}
								className="flex h-6 w-6 items-center justify-center rounded-full text-[16px] leading-none text-[#65676b] hover:bg-[#e4e6eb] hover:text-[#080809]"
							>
								×
							</button>
						</div>
						<div className="grid gap-6 text-[12.5px] leading-[1.6] text-[#374151] sm:grid-cols-3">
							<div>
								<div className="mb-1 text-[10.5px] font-bold tracking-wider text-[#1877f2]">
									{s.stage.columns.expect.title}
								</div>
								{stageContent?.what_to_expect ||
									selectedStage?.focusSummary ||
									s.stage.columns.expect.body}
								{stageContent?.tips && stageContent.tips.length > 0 && (
									<ul className="mt-2 list-disc pl-4 text-[11.5px] text-[#65676b]">
										{stageContent.tips.map((tip, i) => (
											<li key={i}>{tip}</li>
										))}
									</ul>
								)}
								{selectedStage?.estimatedDurationLabel && (
									<div className="mt-2 text-[11.5px] text-[#65676b]">
										Duration: {selectedStage.estimatedDurationLabel}
									</div>
								)}
								{selectedStage?.interviewerName && (
									<div className="mt-1 text-[11.5px] text-[#65676b]">
										Interviewer: {selectedStage.interviewerName}
										{selectedStage.interviewerTitle
											? ` · ${selectedStage.interviewerTitle}`
											: ""}
									</div>
								)}
							</div>
							<div>
								<div className="mb-1 text-[10.5px] font-bold tracking-wider text-[#1877f2]">
									{s.stage.columns.evaluated.title}
								</div>
								{stageContent?.how_evaluated ||
									s.stage.columns.evaluated.body}
							</div>
							<div>
								<div className="mb-1 text-[10.5px] font-bold tracking-wider text-[#1877f2]">
									{s.stage.columns.questions.title}
								</div>
								{stageContent?.questions_contact ||
									s.stage.columns.questions.body}
							</div>
						</div>
					</section>
				)}

				<div className="mb-3.5">
					<h2 className="text-[17px] font-semibold text-[#080809]">
						{s.prepHeading}
					</h2>
					<p className="mt-1 text-[12.5px] text-[#65676b]">{s.prepFraming}</p>
				</div>

				{/* Suggested next */}
				<button
					type="button"
					onClick={startMock}
					className="mb-4.5 mt-5 flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1877f2] bg-[#f0f6ff] px-5.5 py-4.5 text-left transition hover:bg-[#e7f0fc] focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:outline-none"
				>
					<div className="flex-1 min-w-0">
						<div className="text-[10.5px] font-bold tracking-wider text-[#1877f2]">
							{s.suggested.eyebrow}
						</div>
						<div className="mt-1 text-[15px] font-semibold text-[#080809]">
							{s.suggested.title}
						</div>
						<div className="mt-0.5 text-[12px] text-[#65676b]">
							{s.suggested.body}
						</div>
					</div>
					<span className="rounded-full bg-[#1877f2] px-5 py-2 text-[12.5px] font-semibold text-white whitespace-nowrap">
						{s.suggested.cta}
					</span>
				</button>

				{/* Readiness hero + the three contributing tiles. Readiness is
				    derived from gap-analysis, mock history, and study-plan
				    progress, so the three tiles render as its children. */}
				<section className="mb-3.5 rounded-xl border border-[#e4e6eb] bg-[#fafbfc] p-5">
					<HeroReadiness pct={readinessPct} />
					<div className="my-4 flex items-center gap-3">
						<div className="h-px flex-1 bg-[#e4e6eb]" />
						<span className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
							WHAT DRIVES THIS SCORE
						</span>
						<div className="h-px flex-1 bg-[#e4e6eb]" />
					</div>
					<div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
						<GapTile
							dimensions={gap?.dimensions ?? []}
							onOpen={openGap}
						/>
						<MockHistoryTile mocks={mocks} onOpen={openLastMockFeedback} />
						{(() => {
							const upSec = studyPlan?.sections.find(
								(sec) => sec.dimensionId === studyPlan?.upNext?.sectionId,
							);
							const upRes = upSec?.resources.find(
								(r) => r.id === studyPlan?.upNext?.resourceId,
							);
							return (
								<StudyTile
									completedCount={studyPlan?.completedCount ?? 0}
									totalCount={studyPlan?.totalCount ?? 0}
									remainingMin={studyPlan?.totalRemainingMin ?? 0}
									upNextTitle={upRes?.title ?? "Pick a starting topic"}
									upNextMin={upRes?.durationMin ?? 0}
									onOpen={openStudy}
								/>
							);
						})()}
					</div>
				</section>

				<PrepFooter variant="hub" />
			</div>
		</div>
	);
}

function GapTile({
	dimensions,
	onOpen,
}: {
	dimensions: GapDimension[];
	onOpen: () => void;
}): ReactElement {
	const weak = dimensions.filter((d) => d.severity !== "covered");
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group rounded-xl border border-[#e4e6eb] px-5 py-4.5 text-left transition hover:border-[#1877f2] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:outline-none"
		>
			<div className="mb-2.5 flex items-start justify-between">
				<div>
					<div className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
						{strings.hub.tiles.gap.eyebrow}
					</div>
					<div className="mt-0.5 text-[13.5px] font-semibold text-[#080809]">
						{weak.length} weak dimension{weak.length === 1 ? "" : "s"}
					</div>
				</div>
				<span className="text-[12px] font-semibold text-[#1877f2] group-hover:underline">
					{strings.hub.tiles.gap.view}
				</span>
			</div>
			<div className="mt-1.5 space-y-1.5">
				{weak.slice(0, 3).map((d) => {
					const sev = d.severity;
					const trackBg = sev === "high" ? "#fde2e2" : "#fef0d4";
					const fillBg = sev === "high" ? "#e74c3c" : "#f39c12";
					const fillPct = sev === "high" ? 35 : 65;
					return (
						<div key={d.id} className="flex items-center gap-2.5">
							<div className="flex-1 text-[11.5px] text-[#65676b]">
								{d.name}
							</div>
							<div
								className="h-1 w-20 rounded-sm"
								style={{ background: trackBg }}
							>
								<div
									className="h-full rounded-sm"
									style={{ background: fillBg, width: `${fillPct}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</button>
	);
}

function MockHistoryTile({
	mocks,
	onOpen,
}: {
	mocks: MockSummary[];
	onOpen: () => void;
}): ReactElement {
	const completed = mocks.filter((m) => m.status === "completed");
	const last = completed[completed.length - 1];
	const first = completed[0];
	const delta = last && first ? (last.score ?? 0) - (first.score ?? 0) : 0;
	const bars: { score: number | null; pending: boolean }[] = [
		...completed.map((m) => ({ score: m.score, pending: false })),
		...Array.from({ length: Math.max(0, 4 - completed.length) }, () => ({
			score: null as number | null,
			pending: true,
		})),
	].slice(0, 4);

	return (
		<button
			type="button"
			onClick={onOpen}
			className="group rounded-xl border border-[#e4e6eb] px-5 py-4.5 text-left transition hover:border-[#1877f2] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:outline-none"
		>
			<div className="mb-3.5 flex items-start justify-between">
				<div>
					<div className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
						{strings.hub.tiles.mocks.eyebrow}
					</div>
					<div className="mt-0.5 text-[13.5px] font-semibold text-[#080809]">
						{last
							? `Last: ${last.score}/100 · ${last.dateLabel}`
							: "No mocks yet"}
					</div>
				</div>
				<span className="text-[12px] font-semibold text-[#1877f2] group-hover:underline">
					{strings.hub.tiles.mocks.view}
				</span>
			</div>
			<div className="flex h-[46px] items-end gap-2">
				{bars.map((b, i) => {
					const h = b.score ? Math.max(14, b.score * 0.5) : 18;
					const isLast = i === completed.length - 1;
					return (
						<div
							key={i}
							className="flex flex-1 flex-col items-center gap-1"
							style={{ opacity: b.pending ? 0.35 : 1 }}
						>
							<div
								className="w-[18px] rounded-sm"
								style={{
									height: `${h}px`,
									background: isLast ? "#1877f2" : "#cbd5e1",
									border: b.pending ? "1px dashed #94a3b8" : undefined,
								}}
							/>
							<div
								className={`text-[9.5px] ${isLast ? "font-bold text-[#080809]" : "text-[#65676b]"}`}
							>
								{b.score ?? `#${i + 1}`}
							</div>
						</div>
					);
				})}
			</div>
			{delta > 0 && (
				<div className="mt-2 text-[11px] font-semibold text-[#27ae60]">
					↑ {delta} since first attempt
				</div>
			)}
		</button>
	);
}

function StudyTile({
	completedCount,
	totalCount,
	remainingMin,
	upNextTitle,
	upNextMin,
	onOpen,
}: {
	completedCount: number;
	totalCount: number;
	remainingMin: number;
	upNextTitle: string;
	upNextMin: number;
	onOpen: () => void;
}): ReactElement {
	const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
	const hrs = Math.floor(remainingMin / 60);
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group rounded-xl border border-[#e4e6eb] px-5 py-4.5 text-left transition hover:border-[#1877f2] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:outline-none"
		>
			<div className="mb-3 flex items-start justify-between">
				<div>
					<div className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
						{strings.hub.tiles.study.eyebrow}
					</div>
					<div className="mt-0.5 text-[13.5px] font-semibold text-[#080809]">
						{completedCount} of {totalCount} done · {hrs}h left
					</div>
				</div>
				<span className="text-[12px] font-semibold text-[#1877f2] group-hover:underline">
					{strings.hub.tiles.study.view}
				</span>
			</div>
			<div className="mb-2 h-1.5 rounded-sm bg-[#e4e6eb]">
				<div
					className="h-full rounded-sm bg-[#1877f2]"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className="text-[11.5px] text-[#65676b]">
				Up next: {upNextTitle} · {upNextMin} min
			</div>
		</button>
	);
}

function HeroReadiness({ pct }: { pct: number }): ReactElement {
	return (
		<div className="flex items-center gap-4">
			<div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#1877f2] text-white">
				<span className="text-[20px] font-bold leading-none">{pct}%</span>
			</div>
			<div className="min-w-0">
				<div className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
					{strings.hub.tiles.readiness.eyebrow}
				</div>
				<div className="mt-0.5 text-[15px] font-semibold text-[#080809]">
					{pct}% ready for the screen
				</div>
				<p className="mt-1 text-[11.5px] leading-[1.5] text-[#65676b]">
					{strings.hub.tiles.readiness.explanation}
				</p>
			</div>
		</div>
	);
}
