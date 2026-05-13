import { useState, useEffect } from "react";

/** Breakpoint threshold for mobile detection (px). */
export const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the viewport is mobile-sized.
 * Returns false during initial render to prevent hydration mismatches.
 */
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const mql = window.matchMedia(
			`(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`,
		);
		const handleChange = (): void => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", handleChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return (): void => {
			mql.removeEventListener("change", handleChange);
		};
	}, []);

	return isMobile;
}
