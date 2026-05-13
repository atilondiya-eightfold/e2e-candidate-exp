/**
 * Locale-aware formatting helpers.
 *
 * Always import format helpers from this module instead of calling
 * `toLocale*` / `Intl.*` directly. This keeps locale handling consistent
 * across the app — the active i18next language drives all formatters,
 * so a locale change in the UI propagates to dates, numbers, and currency.
 *
 * See `.claude/skills/react-ux-designer/localization.md` for the rationale.
 */

import i18n from "./i18n";

function locale(): string {
	return (
		i18n.language ||
		(typeof navigator !== "undefined" ? navigator.language : "en")
	);
}

/**
 * Format an ISO date string for display.
 *
 * @param isoDate ISO 8601 date string, or undefined → returns "—"
 * @param options.relative when true, dates within 30 days render as
 *   "yesterday" / "in 5 days" / "3 days ago" via Intl.RelativeTimeFormat
 */
export function formatDate(
	isoDate: string | undefined,
	options?: { relative?: boolean },
): string {
	if (!isoDate) return "—";
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return "—";

	if (options?.relative) {
		const diffDays = Math.floor((date.getTime() - Date.now()) / 86_400_000);
		if (Math.abs(diffDays) < 30) {
			return new Intl.RelativeTimeFormat(locale(), {
				numeric: "auto",
			}).format(diffDays, "day");
		}
	}

	return date.toLocaleDateString(locale(), {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/** Format an ISO date string with both date and time for display. */
export function formatDateTime(isoDate: string | undefined): string {
	if (!isoDate) return "—";
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString(locale(), {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Format a currency amount.
 *
 * @param amount   Numeric amount in major units (e.g. dollars, not cents)
 * @param currency ISO 4217 code (default "USD"). For tenant-aware screens,
 *                 pass the tenant's currency rather than relying on the default.
 */
export function formatCurrency(amount: number, currency = "USD"): string {
	return new Intl.NumberFormat(locale(), {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(amount);
}

/** Format an arbitrary number with locale-aware grouping/decimal separators. */
export function formatNumber(
	value: number,
	options?: Intl.NumberFormatOptions,
): string {
	return new Intl.NumberFormat(locale(), options).format(value);
}

/** Format a byte count as B / KB / MB. */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${formatNumber(bytes)} B`;
	if (bytes < 1024 * 1024) {
		return `${formatNumber(bytes / 1024, { maximumFractionDigits: 1 })} KB`;
	}
	return `${formatNumber(bytes / (1024 * 1024), { maximumFractionDigits: 1 })} MB`;
}
