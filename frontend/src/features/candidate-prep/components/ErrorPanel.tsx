import type { ReactElement, ReactNode } from "react";

import { PillButton } from "./PillButton";

type Tone = "red" | "amber";

interface Action {
	label: string;
	onClick: () => void;
	variant?: "primary" | "secondary";
}

interface Props {
	tone?: Tone;
	icon: string;
	title: string;
	body: ReactNode;
	actions: Action[];
	footer?: ReactNode;
	referenceCode?: string;
	referenceSuffix?: string;
	referenceLabel?: string;
}

const TONES: Record<Tone, { bg: string; border: string; iconBg: string; iconFg: string }> = {
	red: {
		bg: "#fef8f8",
		border: "#fde2e2",
		iconBg: "#fde2e2",
		iconFg: "#c0392b",
	},
	amber: {
		bg: "#fffaf0",
		border: "#fef0d4",
		iconBg: "#fef0d4",
		iconFg: "#b7791f",
	},
};

export function ErrorPanel({
	tone = "red",
	icon,
	title,
	body,
	actions,
	footer,
	referenceCode,
	referenceSuffix,
	referenceLabel = "Reference:",
}: Props): ReactElement {
	const t = TONES[tone];
	return (
		<section
			className="rounded-xl border p-6"
			style={{ background: t.bg, borderColor: t.border }}
		>
			<div className="flex items-start gap-3.5">
				<div
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
					style={{ background: t.iconBg, color: t.iconFg }}
					aria-hidden
				>
					{icon}
				</div>
				<div className="flex-1">
					<h2 className="mb-1 text-[14px] font-semibold text-[#080809]">
						{title}
					</h2>
					<div className="text-[12.5px] leading-[1.55] text-[#65676b]">
						{body}
					</div>
					<div className="mt-3.5 flex flex-wrap gap-2.5">
						{actions.map((a) => (
							<PillButton
								key={a.label}
								variant={a.variant ?? "primary"}
								onClick={a.onClick}
							>
								{a.label}
							</PillButton>
						))}
					</div>
					{(footer || referenceCode) && (
						<div className="mt-3.5 border-t border-dashed border-[#e4e6eb] pt-3 text-[11px] text-[#8a8d91]">
							{footer && <div>{footer}</div>}
							{referenceCode && (
								<div>
									{referenceLabel}{" "}
									<code className="font-mono">{referenceCode}</code>
									{referenceSuffix ? " " + referenceSuffix : ""}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
