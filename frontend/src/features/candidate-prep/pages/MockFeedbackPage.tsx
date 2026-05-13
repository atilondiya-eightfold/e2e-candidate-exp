import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";

import {
	useMockSummary,
	type MockSummary,
	type MockSummaryCriterion,
	type MockSummaryQuestion,
} from "@/features/eightfold-api/hooks";

import { PillButton } from "../components/PillButton";
import { TopNav } from "../components/TopNav";
import { TopicChips } from "../components/TopicChips";
import {
	mockFeedback,
	type DimensionLevel,
	type DimensionScore,
	type GapSeverity,
	type TranscriptMoment,
} from "../mocks/data";
import { strings } from "../strings";

interface Props {
	applicationId: string;
	mockId: string;
}

const LEVEL_STYLES: Record<
	DimensionLevel,
	{ border: string; bg: string; fg: string; tag: string }
> = {
	weak: { border: "#dc2626", bg: "#fef2f2", fg: "#dc2626", tag: "WEAK" },
	partial: {
		border: "#d97706",
		bg: "#fffbeb",
		fg: "#d97706",
		tag: "PARTIAL",
	},
	solid: { border: "#16a34a", bg: "#f0fdf4", fg: "#16a34a", tag: "SOLID" },
	strong: { border: "#16a34a", bg: "#f0fdf4", fg: "#16a34a", tag: "STRONG" },
};

const LEVEL_TO_SEVERITY: Record<DimensionLevel, GapSeverity> = {
	weak: "high",
	partial: "medium",
	solid: "covered",
	strong: "covered",
};

export function MockFeedbackPage({ applicationId, mockId }: Props): ReactElement {
	const navigate = useNavigate();
	// Only call the real summary endpoint when the mockId is numeric — the
	// static mocks ("mock_2", etc.) come from the local fixture instead.
	const isLiveMock = /^\d+$/.test(mockId);
	const summary = useMockSummary(mockId, { enabled: isLiveMock });

	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });

	if (isLiveMock) {
		if (summary.isPending) {
			return <FeedbackLoading applicationId={applicationId} />;
		}
		if (summary.isError || !summary.data) {
			return (
				<FeedbackError
					applicationId={applicationId}
					message={summary.error?.message ?? "Could not load summary"}
				/>
			);
		}
		return (
			<LiveFeedback
				applicationId={applicationId}
				mockId={mockId}
				data={summary.data}
				onBack={backToHub}
			/>
		);
	}

	return <StaticFeedback applicationId={applicationId} mockId={mockId} />;
}

// ---------------------------------------------------------------------------
// Live data view — driven by the /mock-summary/<id> response.
// ---------------------------------------------------------------------------

function LiveFeedback({
	applicationId,
	mockId,
	data,
	onBack,
}: {
	applicationId: string;
	mockId: string;
	data: MockSummary;
	onBack: () => void;
}): ReactElement {
	const navigate = useNavigate();
	const goStudy = () =>
		navigate({
			to: "/prep/$applicationId/study-plan",
			params: { applicationId },
		});
	const goTranscript = () =>
		navigate({
			to: "/prep/$applicationId/transcript/$mockId",
			params: { applicationId, mockId },
		});

	const criteria: [string, MockSummaryCriterion][] = Object.entries(
		data.overallScores?.all_criterias ?? {},
	);
	// Overall score = avg stars across rubric items, scaled to /100. Falls back
	// to – if the rubric is empty (early demos where scoring hasn't run yet).
	const avgStars =
		criteria.length > 0
			? criteria.reduce((sum, [, c]) => sum + (c.stars || 0), 0) / criteria.length
			: null;
	const overallScore = avgStars !== null ? Math.round(avgStars * 20) : null;

	const fmtDuration = (s: number) => {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}m ${sec}s`;
	};

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-4xl px-4 py-8 sm:px-12 sm:py-10">
				<button
					type="button"
					onClick={onBack}
					className="mb-3 text-[12px] text-[#1877f2] hover:underline"
				>
					{strings.common.backToHubLink}
				</button>

				{/* Header strip */}
				<section className="mb-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5">
					<div>
						<div className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
							SESSION #{data.interviewSessionId} ·{" "}
							{fmtDuration(data.totalDurationSecs).toUpperCase()}
						</div>
						<div className="mt-0.5 text-[15px] font-bold text-[#111]">
							Candidate Prep Mock — System Design
						</div>
					</div>
					<div className="text-right">
						{overallScore !== null ? (
							<div className="text-[22px] font-extrabold text-[#1f3a68]">
								{overallScore}
								<span className="ml-0.5 text-[11px] font-medium text-[#65676b]">
									/100
								</span>
							</div>
						) : (
							<div className="text-[11px] text-[#65676b]">No rubric yet</div>
						)}
					</div>
				</section>

				{/* Status banner if not completed */}
				{data.status !== "completed" && (
					<section className="mb-3.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[12px] text-[#92400e]">
						⏳ Scoring still in progress on the backend — refresh in a few
						seconds to see the rubric.
					</section>
				)}

				{/* Rubric criteria */}
				{criteria.length > 0 && (
					<>
						<div className="mb-2 text-[10.5px] font-semibold tracking-wider text-[#65676b]">
							{strings.mockFeedback.dimensionsEyebrow}
						</div>
						<div className="mb-5 space-y-2">
							{criteria.map(([key, c]) => (
								<CriterionCard key={key} criterion={c} />
							))}
						</div>
					</>
				)}

				{/* Per-question transcript */}
				{data.questions.length > 0 && (
					<>
						<div className="mb-2 text-[10.5px] font-semibold tracking-wider text-[#65676b]">
							PER-QUESTION TRANSCRIPT
						</div>
						<div className="mb-5 space-y-2">
							{data.questions.map((q) => (
								<QuestionTranscript key={q.question_id} question={q} />
							))}
						</div>
					</>
				)}

				{!data.transcriptAvailable && (
					<section className="mb-5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-[12px] text-[#65676b]">
						Transcript isn't available yet — it usually shows up within a
						minute after the call ends.
					</section>
				)}

				<div className="flex flex-wrap gap-3">
					<PillButton size="lg" variant="primary" onClick={goStudy}>
						{strings.mockFeedback.ctas.study}
					</PillButton>
					<PillButton size="lg" variant="secondary" onClick={goTranscript}>
						{strings.mockFeedback.ctas.transcript}
					</PillButton>
				</div>
			</div>
		</div>
	);
}

function CriterionCard({
	criterion,
}: {
	criterion: MockSummaryCriterion;
}): ReactElement {
	const level: DimensionLevel =
		criterion.stars >= 4
			? "strong"
			: criterion.stars >= 3
				? "solid"
				: criterion.stars >= 2
					? "partial"
					: "weak";
	const css = LEVEL_STYLES[level];
	return (
		<section
			className="rounded-[0_8px_8px_0] border-l-[3px] px-3.5 py-3"
			style={{ background: css.bg, borderLeftColor: css.border }}
		>
			<div className="flex items-center justify-between">
				<div className="text-[13px] font-bold text-[#111]">
					{criterion.criteria}
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-bold" style={{ color: css.fg }}>
						{(criterion.rating || css.tag).toUpperCase()}
					</span>
					<span className="text-[12px]" style={{ color: css.fg }}>
						{"★".repeat(Math.max(0, Math.min(5, criterion.stars)))}
						<span className="text-[#d1d5db]">
							{"★".repeat(Math.max(0, 5 - criterion.stars))}
						</span>
					</span>
				</div>
			</div>
			<p className="mt-1 text-[12px] leading-[1.5] text-[#374151]">
				{criterion.reason}
			</p>
		</section>
	);
}

function QuestionTranscript({
	question,
}: {
	question: MockSummaryQuestion;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const turnCount = question.transcript.length;
	const fmt = (s: number | null) => {
		if (s === null) return "—";
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, "0")}`;
	};
	return (
		<section className="rounded-xl border border-[#e5e7eb] bg-white">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between px-4 py-3 text-left"
			>
				<div>
					<div className="text-[13px] font-semibold text-[#111]">
						{question.label}
					</div>
					<div className="text-[10.5px] text-[#65676b]">
						{turnCount} turn{turnCount === 1 ? "" : "s"} · {fmt(question.slice_start_secs)}
						{" → "}
						{fmt(question.slice_end_secs)}
					</div>
				</div>
				<span className="text-[#65676b]">{open ? "▴" : "▾"}</span>
			</button>
			{open && (
				<div className="border-t border-[#f3f4f6] px-4 py-3 space-y-2">
					{question.transcript.length === 0 ? (
						<div className="text-[12px] text-[#9ca3af]">No turns captured.</div>
					) : (
						question.transcript.map((turn, i) => (
							<div key={i} className="text-[12px] leading-[1.55]">
								<span
									className={
										turn.role === "agent"
											? "font-semibold text-[#7c3aed]"
											: "font-semibold text-[#1877f2]"
									}
								>
									{turn.role === "agent" ? "Mira" : "You"}:
								</span>{" "}
								<span className="text-[#374151]">
									{turn.message ?? "(no transcript)"}
								</span>
							</div>
						))
					)}
				</div>
			)}
		</section>
	);
}

function FeedbackLoading({
	applicationId,
}: {
	applicationId: string;
}): ReactElement {
	return (
		<div className="bg-white min-h-screen">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-md px-4 py-16 text-center">
				<div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e7f3ff] border-t-[#1877f2]" />
				<h1 className="text-[18px] font-semibold text-[#080809]">
					Loading your feedback…
				</h1>
				<p className="mt-2 text-[12.5px] text-[#65676b]">
					Mira is finishing scoring. This usually takes 15–30 seconds the
					first time.
				</p>
			</div>
		</div>
	);
}

function FeedbackError({
	applicationId,
	message,
}: {
	applicationId: string;
	message: string;
}): ReactElement {
	const navigate = useNavigate();
	return (
		<div className="bg-white min-h-screen">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-md px-4 py-16 text-center">
				<h1 className="text-[18px] font-semibold text-[#080809]">
					Could not load feedback
				</h1>
				<p className="mt-2 text-[12.5px] text-[#65676b]">{message}</p>
				<div className="mt-5">
					<PillButton
						variant="primary"
						onClick={() =>
							navigate({
								to: "/prep/$applicationId",
								params: { applicationId },
							})
						}
					>
						Back to hub
					</PillButton>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Static fixture view — kept for the demo "mock_2" route etc.
// ---------------------------------------------------------------------------

function StaticFeedback({
	applicationId,
	mockId,
}: {
	applicationId: string;
	mockId: string;
}): ReactElement {
	const navigate = useNavigate();
	const fb = mockFeedback[mockId] ?? mockFeedback["mock_2"]!;
	const s = strings.mockFeedback;

	const goStudy = () =>
		navigate({
			to: "/prep/$applicationId/study-plan",
			params: { applicationId },
		});
	const goTranscript = () =>
		navigate({
			to: "/prep/$applicationId/transcript/$mockId",
			params: { applicationId, mockId: fb.mockId },
		});
	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-4xl px-4 py-8 sm:px-12 sm:py-10">
				<button
					type="button"
					onClick={backToHub}
					className="mb-3 text-[12px] text-[#1877f2] hover:underline"
				>
					{strings.common.backToHubLink}
				</button>

				<section className="mb-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5">
					<div>
						<div className="text-[10.5px] font-semibold tracking-wider text-[#65676b]">
							MOCK #{fb.mockNumber} · {fb.durationMin} MIN ·{" "}
							{fb.dateLabel.toUpperCase()}
						</div>
						<div className="mt-0.5 text-[15px] font-bold text-[#111]">
							{fb.title}
						</div>
					</div>
					<div className="text-right">
						<div className="text-[22px] font-extrabold text-[#1f3a68]">
							{fb.score}
							<span className="ml-0.5 text-[11px] font-medium text-[#65676b]">
								/100
							</span>
						</div>
						{fb.delta !== 0 && (
							<div className="text-[10.5px] font-semibold text-[#16a34a]">
								{strings.mockFeedback.deltaPrefix} {fb.delta}{" "}
								{strings.mockFeedback.deltaSuffix}
							</div>
						)}
					</div>
				</section>

				<section
					className="mb-4 rounded-xl p-5"
					style={{
						background: "linear-gradient(135deg,#faf5ff,#eef2ff)",
					}}
				>
					<div className="mb-3 flex items-center gap-2.5">
						<div
							className="h-9 w-9 rounded-full"
							style={{
								background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
							}}
							aria-hidden
						/>
						<div>
							<div className="text-[13px] font-bold text-[#111]">
								{s.miraHeading}
							</div>
							<div className="text-[10.5px] text-[#65676b]">
								{s.miraSubheading}
							</div>
						</div>
					</div>
					<p className="text-[13px] leading-[1.55] text-[#374151]">
						{fb.miraSummary}
					</p>
				</section>

				<div className="mb-2 text-[10.5px] font-semibold tracking-wider text-[#65676b]">
					{s.dimensionsEyebrow}
				</div>
				<div className="mb-5 space-y-2">
					{fb.dimensions.map((d) => (
						<DimensionCard key={d.dimensionId} d={d} onChipClick={goStudy} />
					))}
				</div>

				<section className="mb-5 rounded-xl border border-[#e5e7eb] p-4">
					<div className="mb-2.5 text-[10.5px] font-bold tracking-wider text-[#1f3a68]">
						{s.momentsEyebrow}
					</div>
					<div className="space-y-2">
						{fb.moments.map((m) => (
							<MomentRow key={m.id} moment={m} />
						))}
					</div>
				</section>

				<div className="flex flex-wrap gap-3">
					<PillButton size="lg" variant="primary" onClick={goStudy}>
						{s.ctas.study}
					</PillButton>
					<PillButton size="lg" variant="secondary" onClick={goTranscript}>
						{s.ctas.transcript}
					</PillButton>
				</div>
			</div>
		</div>
	);
}

function DimensionCard({
	d,
	onChipClick,
}: {
	d: DimensionScore;
	onChipClick: () => void;
}): ReactElement {
	const css = LEVEL_STYLES[d.level];
	return (
		<section
			className="rounded-[0_8px_8px_0] border-l-[3px] px-3.5 py-3"
			style={{ background: css.bg, borderLeftColor: css.border }}
		>
			<div className="flex items-center justify-between">
				<div className="text-[13px] font-bold text-[#111]">{d.name}</div>
				<span className="text-[11px] font-bold" style={{ color: css.fg }}>
					{css.tag}
				</span>
			</div>
			<p className="mt-1 text-[12px] leading-[1.5] text-[#374151]">
				{d.comment}
			</p>
			{d.studyTopics.length > 0 && (
				<div className="mt-2.5">
					<TopicChips
						chips={d.studyTopics}
						severity={LEVEL_TO_SEVERITY[d.level]}
						clickable
						onChipClick={onChipClick}
					/>
				</div>
			)}
		</section>
	);
}

function MomentRow({ moment }: { moment: TranscriptMoment }): ReactElement {
	const strong = moment.level === "strong";
	const bg = strong ? "#f0fdf4" : "#fffbeb";
	const border = strong ? "#16a34a" : "#d97706";
	const tagColor = strong ? "#16a34a" : "#d97706";
	return (
		<div
			className="rounded-[0_8px_8px_0] border-l-[3px] px-3 py-2"
			style={{ background: bg, borderLeftColor: border }}
		>
			<div className="text-[10px] font-semibold" style={{ color: tagColor }}>
				{moment.timestamp} · {moment.level.toUpperCase()}
			</div>
			<div className="mt-0.5 text-[12px] leading-[1.55] text-[#374151]">
				"{moment.quote}"
				{moment.annotation && (
					<i className="ml-1 text-[#9ca3af]">{moment.annotation}</i>
				)}
			</div>
		</div>
	);
}
