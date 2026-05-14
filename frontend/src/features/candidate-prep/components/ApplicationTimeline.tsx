import type { ReactElement } from "react";

import type { TimelineStage } from "../mocks/data";

interface Props {
	stages: TimelineStage[];
	selectedId?: string | null;
	onSelect?: (stageId: string) => void;
}

export function ApplicationTimeline({
	stages,
	selectedId,
	onSelect,
}: Props): ReactElement {
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
					const isSelected = stage.id != null && stage.id === selectedId;
					const dotClass = isCurrent
						? "h-[13px] w-[13px] bg-[#1877f2] border-2 border-[#1877f2]"
						: isComplete
							? "h-[11px] w-[11px] bg-[#1877f2] border-2 border-[#1877f2]"
							: "h-[11px] w-[11px] bg-white border-2 border-[#ccd0d5]";
					const labelClass = isCurrent
						? "text-[12.5px] font-semibold text-[#1877f2]"
						: "text-[12px] text-[#65676b]";
					const handleClick =
						onSelect && stage.id ? () => onSelect(stage.id!) : undefined;
					const interactive = handleClick != null;
					const Wrapper = interactive ? "button" : "div";
					return (
						<li
							key={stage.id ?? stage.label}
							className="flex flex-col items-center gap-[10px] text-center"
						>
							<Wrapper
								{...(interactive
									? {
											type: "button" as const,
											onClick: handleClick,
											"aria-pressed": isSelected,
										}
									: {})}
								className={`flex flex-col items-center gap-[10px] bg-transparent ${
									interactive
										? "cursor-pointer rounded-md px-1 py-0.5 focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:outline-none"
										: ""
								}`}
							>
								<span className="relative inline-flex items-center justify-center">
									<span
										className={`rounded-full ${dotClass}`}
										aria-hidden
									/>
									{isSelected && (
										<span
											aria-hidden
											className="pointer-events-none absolute h-[22px] w-[22px] rounded-full border-2 border-[#1877f2]"
										/>
									)}
								</span>
								<span className={labelClass}>{stage.label}</span>
							</Wrapper>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
