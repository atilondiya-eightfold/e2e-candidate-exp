import type { CSSProperties, ReactElement } from "react";

import { cn } from "@/lib/utils";

interface SkeletonProps {
	className?: string;
	width?: string;
	height?: string;
	rounded?: "sm" | "md" | "lg" | "full";
}

const ROUND_CLASS: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
	sm: "rounded",
	md: "rounded-md",
	lg: "rounded-lg",
	full: "rounded-full",
};

/**
 * Skeleton rect with animated pulse. Width/height come from CSS custom
 * properties so sizing is data-driven per skeleton instance.
 */
export function Skeleton({
	className,
	width,
	height,
	rounded = "md",
}: SkeletonProps): ReactElement {
	const sizeVariables: CSSProperties = {
		...(width ? { width } : {}),
		...(height ? { height } : {}),
	};
	return (
		<span
			aria-hidden="true"
			style={sizeVariables}
			className={cn(
				"block animate-pulse bg-muted",
				ROUND_CLASS[rounded],
				!width && "w-full",
				!height && "h-4",
				className,
			)}
		/>
	);
}

interface SkeletonRowProps {
	lines?: number;
	className?: string;
}

export function SkeletonRows({ lines = 3, className }: SkeletonRowProps): ReactElement {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{Array.from({ length: lines }).map((_, index) => (
				<Skeleton
					key={index}
					height={index === 0 ? "1.25rem" : "0.875rem"}
					width={index === 0 ? "50%" : index === lines - 1 ? "70%" : "100%"}
				/>
			))}
		</div>
	);
}
