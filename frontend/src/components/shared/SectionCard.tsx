import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
	title?: ReactNode;
	subtitle?: ReactNode;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
	headerClassName?: string;
	as?: "section" | "article" | "div";
}

/** Surface card used across all feature screens. */
export function SectionCard({
	title,
	subtitle,
	action,
	children,
	className,
	contentClassName,
	headerClassName,
	as: Component = "section",
}: SectionCardProps): ReactElement {
	return (
		<Component
			className={cn(
				"flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm",
				className,
			)}
		>
			{(title || action) ? (
				<header
					className={cn(
						"flex items-start justify-between gap-4",
						headerClassName,
					)}
				>
					<div className="flex flex-col gap-1">
						{title ? (
							<h2 className="text-lg font-semibold text-foreground">{title}</h2>
						) : null}
						{subtitle ? (
							<div className="text-sm text-muted-foreground">{subtitle}</div>
						) : null}
					</div>
					{action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
				</header>
			) : null}
			<div className={cn("flex flex-col gap-4", contentClassName)}>{children}</div>
		</Component>
	);
}
