import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
	icon?: ReactNode;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
	compact?: boolean;
}

export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
	compact,
}: EmptyStateProps): ReactElement {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center text-center",
				compact ? "gap-2 p-6" : "gap-3 p-10",
				className,
			)}
		>
			{icon ? (
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
					{icon}
				</div>
			) : null}
			<div className="text-base font-semibold text-foreground">{title}</div>
			{description ? (
				<div className="max-w-md text-sm text-muted-foreground">{description}</div>
			) : null}
			{action ? <div className="pt-2">{action}</div> : null}
		</div>
	);
}
