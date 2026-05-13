import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";

import { ErrorPanel } from "../components/ErrorPanel";
import { PillButton } from "../components/PillButton";
import { SeverityBadge } from "../components/SeverityBadge";
import { TopNav } from "../components/TopNav";
import { TopicChips } from "../components/TopicChips";
import { usePrepData } from "../hooks/use-prep-state";
import { type GapSeverity } from "../mocks/data";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

interface Props {
	applicationId: string;
}

const COUNT_CARD_STYLES: Record<GapSeverity, { bg: string; fg: string }> = {
	high: { bg: "#fef2f2", fg: "#dc2626" },
	medium: { bg: "#fffbeb", fg: "#d97706" },
	covered: { bg: "#f0fdf4", fg: "#16a34a" },
};

export function GapReportPage({ applicationId }: Props): ReactElement {
	const navigate = useNavigate();
	const demoState = usePrepDemoStore((s) => s.state);
	const [filter, setFilter] = useState<GapSeverity | null>(null);
	const s = strings.gapReport;
	const prep = usePrepData(applicationId);
	const gap = prep.data?.gap ?? null;

	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });
	const goMock = () =>
		navigate({ to: "/prep/$applicationId/mock/launch", params: { applicationId } });
	const goStudy = () =>
		navigate({ to: "/prep/$applicationId/study-plan", params: { applicationId } });

	if (demoState === "error" || !gap) {
		return (
			<div className="bg-white">
				<TopNav applicationId={applicationId} />
				<div className="mx-auto max-w-3xl px-4 py-10">
					<button
						type="button"
						onClick={backToHub}
						className="mb-3 text-[12px] text-[#1877f2] hover:underline"
					>
						{strings.common.back}
					</button>
					<h1 className="mb-5 text-[18px] font-semibold text-[#080809]">
						Gap report
					</h1>
					<ErrorPanel
						tone="red"
						icon="⚠"
						title={strings.errors.gapReport.title}
						body={strings.errors.gapReport.body}
						actions={[
							{
								label: strings.errors.gapReport.retry,
								onClick: () => usePrepDemoStore.getState().setState("populated"),
								variant: "primary",
							},
							{
								label: strings.errors.backToHub,
								onClick: backToHub,
								variant: "secondary",
							},
						]}
						referenceCode="req-7f3a2b9c"
						referenceSuffix={strings.errors.referenceSupport}
					/>
				</div>
			</div>
		);
	}

	if (demoState === "loading") {
		return (
			<div className="bg-white">
				<TopNav applicationId={applicationId} />
				<div className="mx-auto max-w-4xl px-4 py-10 text-center">
					<div className="mb-3 text-[14px] font-semibold text-[#080809]">
						Analyzing your profile against the role...
					</div>
					<div className="text-[12px] text-[#65676b]">
						Usually takes &lt;30 seconds.
					</div>
				</div>
			</div>
		);
	}

	const counts = gap.counts;
	const filtered = filter
		? gap.dimensions.filter((d) => d.severity === filter)
		: gap.dimensions;

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-4xl px-4 py-8 sm:px-12 sm:py-10">
				<button
					type="button"
					onClick={backToHub}
					className="mb-2 text-[12px] text-[#1877f2] hover:underline"
				>
					{strings.common.backToHubLink}
				</button>
				<h1 className="text-[24px] font-semibold tracking-[-0.4px] text-[#080809]">
					{s.title}
				</h1>
				<p className="mt-1.5 max-w-[680px] text-[13px] text-[#65676b]">
					{s.subtitle}
				</p>

				{/* Severity counts */}
				<div className="mt-6 grid grid-cols-3 gap-3">
					{(["high", "medium", "covered"] as const).map((sev) => {
						const css = COUNT_CARD_STYLES[sev];
						const count = counts[sev];
						const active = filter === sev;
						return (
							<button
								key={sev}
								type="button"
								onClick={() => setFilter(active ? null : sev)}
								className={`rounded-xl px-4 py-3.5 text-center transition focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:outline-none ${active ? "ring-2 ring-[#1877f2]" : "hover:opacity-90"}`}
								style={{ background: css.bg }}
								aria-pressed={active}
							>
								<div
									className="text-[24px] font-extrabold"
									style={{ color: css.fg }}
								>
									{count}
								</div>
								<div
									className="text-[10.5px] font-semibold uppercase"
									style={{ color: css.fg }}
								>
									{s.severity[sev]}
								</div>
							</button>
						);
					})}
				</div>

				{filter && (
					<div className="mt-3 flex items-center justify-between text-[12px] text-[#65676b]">
						<span>
							Showing {filtered.length} {s.severity[filter].toLowerCase()}{" "}
							{filtered.length === 1 ? "gap" : "gaps"}
						</span>
						<button
							type="button"
							onClick={() => setFilter(null)}
							className="font-semibold text-[#1877f2] hover:underline"
						>
							Clear filter
						</button>
					</div>
				)}

				{/* Topic clusters */}
				<div className="mt-7 mb-2 text-[10.5px] font-bold tracking-wider text-[#1f3a68]">
					{s.topicsHeading.toUpperCase()}
				</div>
				<div className="space-y-2.5">
					{filtered.map((d) => {
						const bg =
							d.severity === "high"
								? "#fef2f2"
								: d.severity === "medium"
									? "#fffbeb"
									: "#f0fdf4";
						const fg =
							d.severity === "high"
								? "#dc2626"
								: d.severity === "medium"
									? "#d97706"
									: "#16a34a";
						return (
							<section
								key={d.id}
								className="rounded-xl px-4 py-3.5"
								style={{ background: bg }}
							>
								<div className="mb-1.5 flex items-center justify-between">
									<div className="text-[13px] font-bold" style={{ color: fg }}>
										{d.name}
									</div>
									<SeverityBadge severity={d.severity} />
								</div>
								<p className="mb-2.5 text-[11.5px] leading-[1.5] text-[#65676b]">
									{d.rationale}
								</p>
								{d.studyTopics.length > 0 && (
									<TopicChips chips={d.studyTopics} severity={d.severity} />
								)}
							</section>
						);
					})}
				</div>

				<p className="mt-4 text-[11.5px] italic text-[#8a8d91]">
					{s.topicHint}
				</p>

				<div className="mt-6 flex flex-wrap gap-3">
					<PillButton size="lg" variant="primary" onClick={goMock}>
						{s.ctas.mock}
					</PillButton>
					<PillButton size="lg" variant="secondary" onClick={goStudy}>
						{s.ctas.study}
					</PillButton>
				</div>
			</div>
		</div>
	);
}
