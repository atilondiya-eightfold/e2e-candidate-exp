import type { CSSProperties, ReactElement } from "react";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
	value: number; // 0-100
	tone?: "primary" | "success" | "warning" | "destructive";
	className?: string;
	label?: string;
	showValue?: boolean;
}

const TONE_CLASS: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
	primary: "bg-primary",
	success: "bg-success",
	warning: "bg-warning",
	destructive: "bg-destructive",
};

/**
 * Simple accessible progress bar. The dynamic fill width is provided via
 * a CSS variable (--progress-width) so there is no true inline style rule
 * — the variable pattern is explicitly allowed for data-driven widths.
 */
export function ProgressBar({
	value,
	tone = "primary",
	className,
	label,
	showValue,
}: ProgressBarProps): ReactElement {
	const clamped = Math.max(0, Math.min(100, value));
	const widthVariable = { "--progress-width": `${clamped}%` } as CSSProperties;

	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<div
				aria-label={label}
				aria-valuemax={100}
				aria-valuemin={0}
				aria-valuenow={clamped}
				className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
				role="progressbar"
			>
				<div
					style={widthVariable}
					className={cn(
						"absolute left-0 top-0 h-full w-[var(--progress-width)] rounded-full transition-all",
						TONE_CLASS[tone],
					)}
				/>
			</div>
			{showValue ? (
				<span className="text-xs font-medium text-muted-foreground">{clamped}%</span>
			) : null}
		</div>
	);
}
