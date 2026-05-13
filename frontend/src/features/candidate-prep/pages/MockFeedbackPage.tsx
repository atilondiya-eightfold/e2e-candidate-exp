import { useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";

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

				{/* Header strip */}
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

				{/* Mira summary */}
				<section
					className="mb-4 rounded-xl p-5"
					style={{
						background:
							"linear-gradient(135deg,#faf5ff,#eef2ff)",
					}}
				>
					<div className="mb-3 flex items-center gap-2.5">
						<div
							className="h-9 w-9 rounded-full"
							style={{
								background:
									"linear-gradient(135deg,#7c3aed,#3b82f6)",
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

				{/* Dimension cards */}
				<div className="mb-2 text-[10.5px] font-semibold tracking-wider text-[#65676b]">
					{s.dimensionsEyebrow}
				</div>
				<div className="mb-5 space-y-2">
					{fb.dimensions.map((d) => (
						<DimensionCard key={d.dimensionId} d={d} onChipClick={goStudy} />
					))}
				</div>

				{/* Moments */}
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
				<span
					className="text-[11px] font-bold"
					style={{ color: css.fg }}
				>
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
