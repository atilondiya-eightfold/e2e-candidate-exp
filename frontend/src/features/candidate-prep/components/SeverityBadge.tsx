import type { ReactElement } from "react";

import type { GapSeverity } from "../mocks/data";

const STYLES: Record<GapSeverity, { bg: string; fg: string }> = {
	high: { bg: "#fde2e2", fg: "#c0392b" },
	medium: { bg: "#fef0d4", fg: "#b7791f" },
	covered: { bg: "#dcfce7", fg: "#16a34a" },
};

const LABELS: Record<GapSeverity, string> = {
	high: "HIGH",
	medium: "MEDIUM",
	covered: "COVERED",
};

export function SeverityBadge({
	severity,
}: {
	severity: GapSeverity;
}): ReactElement {
	const s = STYLES[severity];
	return (
		<span
			className="inline-block rounded-xl px-2 py-0.5 text-[10px] font-bold"
			style={{ background: s.bg, color: s.fg }}
		>
			{LABELS[severity]}
		</span>
	);
}
