import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

export type ReadinessLevel = "green" | "amber" | "grey";

interface ReadinessDotProps {
	level: ReadinessLevel;
	label: string;
	className?: string;
}

const LEVEL_CLASS: Record<ReadinessLevel, string> = {
	green: "bg-success",
	amber: "bg-warning",
	grey: "bg-muted-foreground/40",
};

/** Small 10px dot used in TF-02b team rows and TF-14 readiness checklist. */
export function ReadinessDot({ level, label, className }: ReadinessDotProps): ReactElement {
	return (
		<span
			aria-label={`${label}: ${level}`}
			title={`${label}: ${level}`}
			className={cn(
				"inline-block h-2.5 w-2.5 rounded-full",
				LEVEL_CLASS[level],
				className,
			)}
		/>
	);
}
