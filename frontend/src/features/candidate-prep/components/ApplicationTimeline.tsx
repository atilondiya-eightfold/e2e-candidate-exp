import type { ReactElement } from "react";

import type { TimelineStage } from "../mocks/data";

interface Props {
	stages: TimelineStage[];
}

export function ApplicationTimeline({ stages }: Props): ReactElement {
	const completeOrCurrentCount = stages.filter(
		(s) => s.status === "complete" || s.status === "current",
	).length;
	const progressPct =
		stages.length > 1
			? ((completeOrCurrentCount - 1) / (stages.length - 1)) * 100
			: 0;

	return (
		<div className="relative mt-2 mb-3">
			<div className="absolute top-[5px] right-[6%] left-[6%] z-0 h-[2px] bg-[#e4e6eb]">
				<div
					className="h-full bg-[#1877f2]"
					style={{ width: `${progressPct}%` }}
				/>
			</div>
			<ol className="relative z-10 flex items-start justify-between">
				{stages.map((stage) => {
					const isCurrent = stage.status === "current";
					const isComplete = stage.status === "complete";
					const dotClass = isCurrent
						? "h-[13px] w-[13px] bg-[#1877f2] border-2 border-[#1877f2]"
						: isComplete
							? "h-[11px] w-[11px] bg-[#1877f2] border-2 border-[#1877f2]"
							: "h-[11px] w-[11px] bg-white border-2 border-[#ccd0d5]";
					const labelClass = isCurrent
						? "text-[12.5px] font-semibold text-[#1877f2]"
						: "text-[12px] text-[#65676b]";
					return (
						<li
							key={stage.label}
							className="flex flex-col items-center gap-[10px] text-center"
						>
							<span className={`rounded-full ${dotClass}`} aria-hidden />
							<span className={labelClass}>{stage.label}</span>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
