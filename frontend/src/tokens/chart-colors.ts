/**
 * Octuple-aligned chart color palette.
 * Use with Recharts, Nivo, or any charting library.
 *
 * Colors are ordered for maximum contrast between adjacent values.
 * Each color maps to an Octuple palette token.
 *
 * Usage:
 *   import { CHART_PALETTE, CHART_SEMANTIC } from '@/tokens/chart-colors'
 *   <Bar fill={CHART_PALETTE[0]} />
 *   <Line stroke={CHART_SEMANTIC.success} />
 */

/** Primary chart palette — 8 distinct colors for data series */
export const CHART_PALETTE = [
	"#054D7B", // blue-80
	"#1999AC", // blue-green-60
	"#2B715F", // green-70
	"#9D6309", // orange-70
	"#993838", // red-70
	"#975590", // violet-60
	"#2C8CC9", // blue-60
	"#51AB93", // green-50
] as const;

/** Extended palette — 12 colors for charts with more categories */
export const CHART_PALETTE_EXTENDED = [
	...CHART_PALETTE,
	"#5962B7", // blue-violet-60
	"#C97E19", // orange-60
	"#E46F6F", // red-50
	"#AE72A8", // violet-50
] as const;

/** Semantic chart colors — for status/outcome charts */
export const CHART_SEMANTIC = {
	success: "#2B715F", // green-70
	warning: "#9D6309", // orange-70
	error: "#993838", // red-70
	info: "#054D7B", // blue-80
	neutral: "#69717F", // grey-60
	accent: "#1999AC", // blue-green-60
} as const;

/** Background fills for chart areas (lighter variants) */
export const CHART_AREA_FILLS = {
	blue: "#EBF7FF", // blue-10
	green: "#F0FEFA", // green-10
	red: "#FFEFEF", // red-10
	orange: "#FFF8EB", // orange-10
	violet: "#FBF6FB", // violet-10
	teal: "#EBFDFF", // blue-green-10
} as const;

export type ChartPaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
