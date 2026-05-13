/**
 * Runtime resolver for the --chart-* theme tokens.
 *
 * Use this in chart configs (Nivo, Recharts) so series colors follow the
 * active theme instead of a hardcoded palette.
 */

import { cssVarToHex as cssVariableToHex } from "./cssVarToHex";

const CHART_TOKENS = [
	"--chart-1",
	"--chart-2",
	"--chart-3",
	"--chart-4",
	"--chart-5",
	"--chart-6",
] as const;

/**
 * Returns the current resolved hex values for --chart-1 through --chart-6.
 * Call inside a chart config; re-evaluates on each render so theme overrides
 * propagate without re-mounting the chart.
 */
export function getChartColors(): Array<string> {
	return CHART_TOKENS.map(cssVariableToHex);
}
