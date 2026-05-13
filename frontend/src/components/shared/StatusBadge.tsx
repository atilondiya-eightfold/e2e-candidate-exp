import type { ReactElement, ReactNode } from "react";

import { Badge } from "@/components/ef-design-system";
import { cn } from "@/lib/utils";

/** Stage status pill for TF-02a / TF-02b journey stages. */
export type StageKind = "COMPLETED" | "IN_PROGRESS" | "UPCOMING";

interface StageBadgeProps {
	kind: StageKind;
	className?: string;
	children?: ReactNode;
}

const STAGE_LABEL: Record<StageKind, string> = {
	COMPLETED: "Completed",
	IN_PROGRESS: "In Progress",
	UPCOMING: "Upcoming",
};

/**
 * Visual mapping by semantic meaning:
 *   - Completed → success
 *   - In Progress → primary (current/active)
 *   - Upcoming → outline (neutral / deferred)
 */
export function StageBadge({ kind, className, children }: StageBadgeProps): ReactElement {
	const label = children ?? STAGE_LABEL[kind];
	if (kind === "COMPLETED") {
		return (
			<Badge
				className={cn("border-success bg-success/15 text-success", className)}
				variant="outline"
			>
				{label}
			</Badge>
		);
	}
	if (kind === "IN_PROGRESS") {
		return (
			<Badge
				className={cn("border-primary bg-primary/15 text-primary", className)}
				variant="outline"
			>
				{label}
			</Badge>
		);
	}
	return (
		<Badge className={cn("text-muted-foreground", className)} variant="outline">
			{label}
		</Badge>
	);
}

/** Generic status badge with semantic token tones. */
export type GenericTone = "success" | "warning" | "destructive" | "info" | "primary" | "neutral";

interface GenericStatusBadgeProps {
	tone: GenericTone;
	children: ReactNode;
	className?: string;
}

export function GenericStatusBadge({
	tone,
	children,
	className,
}: GenericStatusBadgeProps): ReactElement {
	const toneClass: Record<GenericTone, string> = {
		success: "border-success bg-success/15 text-success",
		warning: "border-warning bg-warning/20 text-warning",
		destructive: "border-destructive bg-destructive/15 text-destructive",
		info: "border-info bg-info/15 text-info",
		primary: "border-primary bg-primary/15 text-primary",
		neutral: "text-muted-foreground",
	};
	return (
		<Badge className={cn(toneClass[tone], className)} variant="outline">
			{children}
		</Badge>
	);
}
