import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
	const now = new Date("2026-04-30T12:00:00Z");
	const epochSeconds = (iso: string): number =>
		Math.floor(new Date(iso).getTime() / 1000);

	it("returns 'Just now' for under 60s", () => {
		const ts = epochSeconds("2026-04-30T11:59:30Z");
		expect(formatRelativeTime(ts, now)).toBe("Just now");
	});

	it("returns minutes for 1–59 minutes", () => {
		const ts = epochSeconds("2026-04-30T11:55:00Z");
		expect(formatRelativeTime(ts, now)).toBe("5 minutes ago");
	});

	it("returns singular minute for 1 minute", () => {
		const ts = epochSeconds("2026-04-30T11:59:00Z");
		expect(formatRelativeTime(ts, now)).toBe("1 minute ago");
	});

	it("returns hours for 1–23 hours", () => {
		const ts = epochSeconds("2026-04-30T09:00:00Z");
		expect(formatRelativeTime(ts, now)).toBe("3 hours ago");
	});

	it("returns days for 1–29 days", () => {
		const ts = epochSeconds("2026-04-28T12:00:00Z");
		expect(formatRelativeTime(ts, now)).toBe("2 days ago");
	});

	it("returns months beyond 30 days", () => {
		const ts = epochSeconds("2026-02-15T12:00:00Z");
		expect(formatRelativeTime(ts, now)).toBe("2 months ago");
	});

	it("returns '—' for null/undefined", () => {
		expect(formatRelativeTime(null, now)).toBe("—");
		expect(formatRelativeTime(undefined, now)).toBe("—");
	});
});
