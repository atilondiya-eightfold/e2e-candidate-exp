/**
 * Resolve a CSS custom property to its current `#rrggbb` form.
 *
 * The browser is the only reliable parser for every CSS color format the app
 * may use (oklch, hsl, named, hex, nested var() chains), so we append a
 * throwaway probe to read the computed color, then normalise to 8-bit RGB via
 * a canvas 2D context. Returns `#000000` when DOM is unavailable (SSR).
 */
export function cssVarToHex(cssVariable: string): string {
	if (typeof document === "undefined") return "#000000";

	const probe = document.createElement("div");
	probe.style.color = `var(${cssVariable})`;
	document.body.append(probe);
	const resolved = globalThis.getComputedStyle(probe).color;
	probe.remove();

	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const ctx = canvas.getContext("2d");
	if (!ctx) return "#000000";
	ctx.fillStyle = "#000000";
	ctx.fillStyle = resolved;
	ctx.fillRect(0, 0, 1, 1);
	const pixel = ctx.getImageData(0, 0, 1, 1).data;
	const toHex = (n: number): string => n.toString(16).padStart(2, "0");
	return `#${toHex(pixel[0]!)}${toHex(pixel[1]!)}${toHex(pixel[2]!)}`;
}
