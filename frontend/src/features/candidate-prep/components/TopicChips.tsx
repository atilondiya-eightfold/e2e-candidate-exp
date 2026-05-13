import type { ReactElement } from "react";

import type { GapSeverity, TopicChip } from "../mocks/data";

const STYLES: Record<GapSeverity, { bg: string; border: string; fg: string }> = {
	high: { bg: "#fff", border: "#fca5a5", fg: "#c0392b" },
	medium: { bg: "#fff", border: "#fcd34d", fg: "#b7791f" },
	covered: { bg: "#fff", border: "#86efac", fg: "#16a34a" },
};

interface Props {
	chips: TopicChip[];
	severity: GapSeverity;
	clickable?: boolean;
	onChipClick?: (chip: TopicChip) => void;
}

export function TopicChips({
	chips,
	severity,
	clickable = false,
	onChipClick,
}: Props): ReactElement {
	const s = STYLES[severity];
	return (
		<div className="flex flex-wrap gap-1.5">
			{chips.map((chip) => {
				const className =
					"inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold transition";
				const interactive = clickable
					? " cursor-pointer hover:opacity-80 active:scale-[0.97]"
					: " cursor-default";
				const styles = {
					background: s.bg,
					borderColor: s.border,
					color: s.fg,
				};
				if (clickable) {
					return (
						<button
							key={chip.id}
							type="button"
							className={className + interactive}
							style={styles}
							onClick={() => onChipClick?.(chip)}
						>
							{chip.label}
						</button>
					);
				}
				return (
					<span
						key={chip.id}
						className={className + interactive}
						style={styles}
					>
						{chip.label}
					</span>
				);
			})}
		</div>
	);
}
