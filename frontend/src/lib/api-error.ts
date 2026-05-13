import { ApiError } from "@/features/eightfold-api";

/**
 * Industry-standard error→view mapping for any TanStack Query error.
 *
 * `isEmpty` distinguishes 404s (no data found, render `EmptyState`) from
 * true failures (render `ErrorBanner`). `canRetry` hides the retry CTA
 * for terminal-class errors (auth, missing) where retrying won't help.
 *
 * Plan §"Industry-standard error UX helper".
 */
export interface ErrorView {
	message: string;
	isEmpty: boolean;
	canRetry: boolean;
}

interface BodyWithMessage {
	message?: unknown;
	detail?: unknown;
	error?: unknown;
}

function readBodyMessage(body: unknown): string | null {
	if (!body || typeof body !== "object") return null;
	const obj = body as BodyWithMessage;
	if (typeof obj.message === "string" && obj.message.length > 0) {
		return obj.message;
	}
	if (typeof obj.detail === "string" && obj.detail.length > 0) {
		return obj.detail;
	}
	if (typeof obj.error === "string" && obj.error.length > 0) {
		return obj.error;
	}
	return null;
}

export function humanizeApiError(err: unknown): ErrorView {
	if (err instanceof ApiError) {
		const status = err.status;
		const bodyMsg = readBodyMessage(err.body);
		if (status === 0) {
			return {
				message: "Can't reach the server. Check your connection.",
				isEmpty: false,
				canRetry: true,
			};
		}
		if (status === 400) {
			return {
				message: bodyMsg ?? "Invalid request.",
				isEmpty: false,
				canRetry: true,
			};
		}
		if (status === 401) {
			return {
				message: "Your session expired. Sign in again.",
				isEmpty: false,
				canRetry: false,
			};
		}
		if (status === 403) {
			return {
				message: "You don't have access to this.",
				isEmpty: false,
				canRetry: false,
			};
		}
		if (status === 404) {
			return {
				message: "Couldn't load — endpoint not available.",
				isEmpty: false,
				canRetry: true,
			};
		}
		if (status === 408 || status === 504) {
			return {
				message: "Request timed out. Retry.",
				isEmpty: false,
				canRetry: true,
			};
		}
		if (status === 429) {
			return {
				message: "Too many requests. Try again shortly.",
				isEmpty: false,
				canRetry: true,
			};
		}
		if (status >= 500) {
			return {
				message: "Service is having issues. Retry.",
				isEmpty: false,
				canRetry: true,
			};
		}
		return {
			message: bodyMsg ?? err.message,
			isEmpty: false,
			canRetry: true,
		};
	}
	if (err instanceof Error) {
		return { message: err.message, isEmpty: false, canRetry: true };
	}
	return { message: "Something went wrong.", isEmpty: false, canRetry: true };
}
