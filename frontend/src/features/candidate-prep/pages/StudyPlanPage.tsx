import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";

import { TopNav } from "../components/TopNav";
import { TopicChips } from "../components/TopicChips";
import {
	useApplication,
} from "../hooks";
import {
	useCompleteStudyItem,
	useUncompleteStudyItem,
} from "../hooks";
import { usePrepData } from "../hooks/use-prep-state";
import {
	populatedState,
	TYPE_ICONS,
	type StudyResource,
	type StudySection,
} from "../mocks/data";
import { usePrepDemoStore } from "../store";
import { strings } from "../strings";

interface Props {
	applicationId: string;
}

export function StudyPlanPage({ applicationId }: Props): ReactElement {
	const navigate = useNavigate();
	const s = strings.studyPlan;
	const demoState = usePrepDemoStore((s) => s.state);
	const prep = usePrepData(applicationId);
	const appQ = useApplication(
		demoState === "populated" ? applicationId : undefined,
	);
	const prepSessionId = appQ.data?.prep_session_id;
	const completeMut = useCompleteStudyItem();
	const uncompleteMut = useUncompleteStudyItem();

	const initial = prep.data?.studyPlan ?? populatedState.studyPlan!;

	// Local optimistic state. When the API is wired (prepSessionId set), the
	// mutation also seeds the server-returned plan into the cache and the
	// selector re-flows it down.
	const [doneIds, setDoneIds] = useState<Set<string>>(() => {
		const set = new Set<string>();
		for (const sec of initial.sections) {
			for (const r of sec.resources) if (r.done) set.add(r.id);
		}
		return set;
	});

	const toggleDone = (id: string) => {
		setDoneIds((prev) => {
			const next = new Set(prev);
			const willBeDone = !next.has(id);
			if (willBeDone) next.add(id);
			else next.delete(id);
			if (prepSessionId) {
				const args = { itemId: id, prepSessionId };
				if (willBeDone) completeMut.mutate(args);
				else uncompleteMut.mutate(args);
			}
			return next;
		});
	};

	const sections = useMemo(
		() =>
			initial.sections.map((sec) => ({
				...sec,
				completedCount: sec.resources.filter((r) => doneIds.has(r.id)).length,
				completed: sec.resources.every((r) => doneIds.has(r.id)),
			})),
		[initial.sections, doneIds],
	);

	const completedCount = useMemo(
		() =>
			sections.reduce(
				(acc, sec) => acc + sec.resources.filter((r) => doneIds.has(r.id)).length,
				0,
			),
		[sections, doneIds],
	);
	const totalCount = sections.reduce((acc, sec) => acc + sec.resources.length, 0);
	const remainingMin = sections.reduce(
		(acc, sec) =>
			acc +
			sec.resources.filter((r) => !doneIds.has(r.id)).reduce((a, r) => a + r.durationMin, 0),
		0,
	);
	const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

	const upNext = useMemo(() => {
		for (const sec of sections) {
			if (sec.completed) continue;
			const next = sec.resources.find((r) => !doneIds.has(r.id));
			if (next) return { section: sec, resource: next };
		}
		return null;
	}, [sections, doneIds]);

	const goMock = () =>
		navigate({ to: "/prep/$applicationId/mock/launch", params: { applicationId } });
	const backToHub = () =>
		navigate({ to: "/prep/$applicationId", params: { applicationId } });

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="mx-auto max-w-4xl px-4 py-8 sm:px-12 sm:py-10">
				<button
					type="button"
					onClick={backToHub}
					className="mb-2.5 text-[12px] text-[#1877f2] hover:underline"
				>
					{strings.common.backToHubLink}
				</button>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-[22px] font-bold text-[#080809]">{s.title}</h1>
						<p className="mt-1 text-[12.5px] text-[#65676b]">
							{Math.round(remainingMin / 60)}h {remainingMin % 60}m{" "}
							{s.subtitleSuffix} · {completedCount} of {totalCount} done
						</p>
					</div>
					<div className="text-right">
						<div className="flex gap-1">
							{Array.from({ length: totalCount }).map((_, i) => (
								<div
									key={i}
									className="h-1.5 w-7 rounded-sm"
									style={{
										background: i < completedCount ? "#16a34a" : "#e5e7eb",
									}}
								/>
							))}
						</div>
						<div className="mt-1 text-[10.5px] text-[#65676b]">
							{pct}% {s.progressLabel}
						</div>
					</div>
				</div>

				{/* Up next hero */}
				{upNext && (
					<section className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#1877f2] bg-[#eef6ff] px-5 py-4">
						<div className="min-w-0 flex-1">
							<div className="text-[10px] font-bold tracking-wider text-[#1877f2]">
								{s.upNextEyebrow}
							</div>
							<div className="mt-1 text-[14px] font-bold text-[#111]">
								{upNext.resource.title}
							</div>
							<div className="mt-0.5 text-[11px] text-[#65676b]">
								{TYPE_ICONS[upNext.resource.type]} {upNext.resource.type} ·{" "}
								{upNext.resource.durationMin} min · {upNext.section.name} ·{" "}
								{upNext.resource.publisher}
							</div>
						</div>
						<a
							href={upNext.resource.url}
							target="_blank"
							rel="noreferrer noopener"
							className="inline-flex items-center gap-1.5 rounded-full bg-[#1877f2] px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#166fe5]"
						>
							{s.resume}
						</a>
					</section>
				)}

				<div className="space-y-3">
					{sections.map((sec) => (
						<SectionCard
							key={sec.dimensionId}
							section={sec}
							doneIds={doneIds}
							onToggle={toggleDone}
							onMockThis={goMock}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function SectionCard({
	section,
	doneIds,
	onToggle,
	onMockThis,
}: {
	section: StudySection;
	doneIds: Set<string>;
	onToggle: (id: string) => void;
	onMockThis: () => void;
}): ReactElement {
	const [expanded, setExpanded] = useState(!section.completed);

	if (section.completed && !expanded) {
		return (
			<section className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f0fdf4] px-4 py-3">
				<div>
					<div className="text-[12.5px] font-bold text-[#111]">
						✓ {section.name}
					</div>
					<div className="text-[10.5px] font-semibold text-[#16a34a]">
						{section.completedCount} of {section.totalCount}{" "}
						{strings.studyPlan.sectionMetaSuffix}
					</div>
				</div>
				<button
					type="button"
					onClick={() => setExpanded(true)}
					className="text-[10.5px] text-[#65676b] hover:text-[#080809]"
				>
					{strings.studyPlan.collapsedNote}
				</button>
			</section>
		);
	}

	const bg =
		section.severity === "high"
			? "#fef2f2"
			: section.severity === "medium"
				? "#fffbeb"
				: "#f0fdf4";
	const sevColor =
		section.severity === "high"
			? "#dc2626"
			: section.severity === "medium"
				? "#d97706"
				: "#16a34a";

	return (
		<section className="rounded-xl px-4 py-3.5" style={{ background: bg }}>
			<div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
				<div>
					<div className="text-[13px] font-bold text-[#111]">{section.name}</div>
					<div
						className="text-[10.5px] font-semibold"
						style={{ color: sevColor }}
					>
						{section.severity.toUpperCase()} · {section.completedCount} of{" "}
						{section.totalCount} {strings.studyPlan.sectionMetaSuffix} ·{" "}
						{Math.round(section.totalMin / 60)}h{" "}
						{section.totalMin % 60 > 0 ? `${section.totalMin % 60}m` : ""}
					</div>
				</div>
				<button
					type="button"
					onClick={onMockThis}
					className="text-[10.5px] font-semibold text-[#1877f2] hover:underline"
				>
					{strings.studyPlan.mockThis}
				</button>
			</div>
			{section.studyTopics.length > 0 && (
				<div className="mb-2.5">
					<TopicChips chips={section.studyTopics} severity={section.severity} />
				</div>
			)}
			<div className="rounded-lg border border-white/60 bg-white">
				{section.resources.map((r, i) => (
					<ResourceRow
						key={r.id}
						resource={r}
						isLast={i === section.resources.length - 1}
						done={doneIds.has(r.id)}
						onToggle={() => onToggle(r.id)}
					/>
				))}
			</div>
			{section.completed && expanded && (
				<button
					type="button"
					onClick={() => setExpanded(false)}
					className="mt-2 text-[10.5px] text-[#65676b] hover:text-[#080809]"
				>
					{strings.studyPlan.expandedNote}
				</button>
			)}
		</section>
	);
}

function ResourceRow({
	resource,
	done,
	onToggle,
	isLast,
}: {
	resource: StudyResource;
	done: boolean;
	onToggle: () => void;
	isLast: boolean;
}): ReactElement {
	return (
		<div
			className={`flex items-center gap-3 px-3 py-2.5 ${isLast ? "" : "border-b border-[#f3f4f6]"}`}
		>
			<button
				type="button"
				onClick={onToggle}
				aria-pressed={done}
				className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
					done
						? "border-[#16a34a] bg-[#16a34a] text-white"
						: "border-[#d1d5db] bg-white hover:border-[#1877f2]"
				}`}
			>
				{done ? "✓" : ""}
			</button>
			<a
				href={resource.url}
				target="_blank"
				rel="noreferrer noopener"
				className={`flex-1 text-[12px] hover:underline ${done ? "text-[#65676b] line-through" : "text-[#111]"}`}
			>
				{resource.title}{" "}
				<span className="text-[#65676b]">↗</span>
			</a>
			<span className="text-[10.5px] text-[#65676b]">
				{TYPE_ICONS[resource.type]} {resource.durationMin}m
			</span>
		</div>
	);
}
