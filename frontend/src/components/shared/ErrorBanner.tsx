import { AlertCircle } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ef-design-system";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
	message: string;
	onRetry?: () => void;
	retryLabel?: string;
	className?: string;
	compact?: boolean;
}

export function ErrorBanner({
	message,
	onRetry,
	retryLabel = "Retry",
	className,
	compact,
}: ErrorBannerProps): ReactElement {
	return (
		<div
			role="alert"
			className={cn(
				"flex items-center justify-between gap-3 rounded-lg border border-destructive bg-destructive/10 text-destructive",
				compact ? "px-3 py-2 text-sm" : "p-4",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
				<span className="text-sm font-medium">{message}</span>
			</div>
			{onRetry ? (
				<Button
					className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
					size="xs"
					variant="outline"
					onClick={onRetry}
				>
					{retryLabel}
				</Button>
			) : null}
		</div>
	);
}
