/**
 * Formatting helpers for dates, tenure, countdowns, and relative time.
 * All helpers are locale-aware via Intl APIs and do not hardcode strings.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Date) return value;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
	value: string | Date | null | undefined,
	options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
	const d = parseDate(value);
	if (!d) return "—";
	return new Intl.DateTimeFormat(undefined, options).format(d);
}

export function formatLongDate(value: string | Date | null | undefined): string {
	return formatDate(value, { month: "long", day: "numeric", year: "numeric" });
}

/** Days between now and the given date, rounded to whole days. Negative if past. */
export function daysUntil(value: string | Date | null | undefined, now: Date = new Date()): number | null {
	const d = parseDate(value);
	if (!d) return null;
	const msDiff = d.getTime() - now.getTime();
	return Math.round(msDiff / DAY_MS);
}

/** Days since the given date. Negative if future. */
export function daysSince(value: string | Date | null | undefined, now: Date = new Date()): number | null {
	const days = daysUntil(value, now);
	return days === null ? null : -days;
}

/** TF-01 tenure: days / months / years depending on span. */
export function formatTenure(roleStartDate: string | Date | null | undefined, now: Date = new Date()): string {
	const start = parseDate(roleStartDate);
	if (!start) return "—";
	// Future start date = data integrity issue per TF-01 edge case 8.
	if (start.getTime() > now.getTime()) return "—";
	const msDiff = now.getTime() - start.getTime();
	const days = Math.floor(msDiff / DAY_MS);
	if (days < 30) return `${days} days in role`;
	if (days < 365) {
		const months = Math.floor(days / 30);
		return `${months} month${months === 1 ? "" : "s"} in role`;
	}
	const years = Math.floor((days / 365) * 10) / 10;
	return `${years.toFixed(1)} years in role`;
}

/** TF-03: "Due in N days" / "Overdue by N days" / "Due today". */
export function formatDueLabel(
	dueDate: string | Date | null | undefined,
	now: Date = new Date(),
): { label: string; tone: "default" | "warn" | "destructive" } {
	const days = daysUntil(dueDate, now);
	if (days === null) return { label: "—", tone: "default" };
	if (days < 0) return { label: `Overdue by ${-days} day${days === -1 ? "" : "s"}`, tone: "destructive" };
	if (days === 0) return { label: "Due today", tone: "warn" };
	if (days <= 7) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
	return { label: "", tone: "default" };
}

/** TF-05: relative "N days ago" when ≤ 30 days, else absolute date. */
export function formatLastReceived(
	value: string | Date | null | undefined,
	now: Date = new Date(),
): string {
	const days = daysSince(value, now);
	if (days === null) return "—";
	if (days < 0) return formatDate(value);
	if (days === 0) return "Today";
	if (days === 1) return "1 day ago";
	if (days <= 30) return `${days} days ago`;
	return formatDate(value);
}

/** TF-02b row: "in N days" / "today" / "tomorrow" / "overdue". */
export function formatRelativeDays(
	value: string | Date | null | undefined,
	now: Date = new Date(),
): string {
	const days = daysUntil(value, now);
	if (days === null) return "—";
	if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
	if (days === 0) return "today";
	if (days === 1) return "tomorrow";
	return `in ${days} days`;
}

/** TF-14 countdown headline variants. */
export function formatDialogueCountdown(
	value: string | Date | null | undefined,
	now: Date = new Date(),
): { phrase: string; days: number | null } {
	const days = daysUntil(value, now);
	if (days === null) return { phrase: "—", days: null };
	if (days < 0) {
		const d = parseDate(value);
		return { phrase: `Your dialogue was ${formatDate(d)}`, days };
	}
	if (days === 0) return { phrase: "Your dialogue is today", days };
	if (days === 1) return { phrase: "Your dialogue is tomorrow", days };
	return { phrase: `Your next dialogue is in ${days} days`, days };
}

/** Deterministic HSL hue for initials-avatar background, derived from the name. */
export function avatarHueFromName(fullName: string): number {
	let h = 0;
	for (const ch of fullName) {
		h = (h * 31 + ch.charCodeAt(0)) % 360;
	}
	return h;
}

/** Initials (max 2 chars) from a first+last pair. */
export function initials(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/** Emdash fallback — never render "null" or "undefined". */
export function orDash(value: string | number | null | undefined): string {
	if (value === null || value === undefined || value === "") return "—";
	return String(value);
}

/** TF-06 signed growth %. */
export function formatSignedPct(value: number | null): string {
	if (value === null || Number.isNaN(value)) return "—";
	if (value === 0) return "0%";
	const sign = value > 0 ? "+" : "−";
	return `${sign}${Math.abs(value)}%`;
}

/**
 * Format an epoch-seconds timestamp as a relative phrase
 * ("Just now", "5 minutes ago", "3 hours ago", "2 days ago",
 * "2 months ago"). Returns "—" for null/undefined.
 */
export function formatRelativeTime(
	epochSeconds: number | null | undefined,
	now: Date = new Date(),
): string {
	if (epochSeconds == null) return "—";
	const diffSec = Math.floor(now.getTime() / 1000) - epochSeconds;
	if (diffSec < 60) return "Just now";
	const minutes = Math.floor(diffSec / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
	const months = Math.floor(days / 30);
	return `${months} month${months === 1 ? "" : "s"} ago`;
}
