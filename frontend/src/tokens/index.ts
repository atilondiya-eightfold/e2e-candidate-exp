/**
 * Octuple DS Theme 2 token definitions (Figma node 11686:120880).
 * Use CSS vars in styles: var(--spacing-*), var(--radius-*).
 * Import styles: @tonyh-2-eightfold/ef-design-system/styles
 */

/** Spacing scale (px). CSS: --spacing-{key} */
export const SPACING_TOKENS = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  10: 20,
  12: 24,
  16: 32,
  20: 40,
  24: 48,
  32: 64,
} as const

/** Corner radius scale (px). CSS: --radius-{key}. Use --radius-full for pills/circles. */
export const CORNER_RADIUS_TOKENS = {
  0: 0,
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 16,
  7: 20,
  8: 24,
  full: 9999,
} as const

export type SpacingKey = keyof typeof SPACING_TOKENS
export type CornerRadiusKey = keyof typeof CORNER_RADIUS_TOKENS

/** CSS variable names for spacing (e.g. --spacing-4) */
export const spacingVar = (key: SpacingKey) => `var(--spacing-${key})` as const

/** CSS variable names for corner radius (e.g. --radius-5) */
export const radiusVar = (key: CornerRadiusKey) => `var(--radius-${key})` as const

// Color tokens (palette + semantic var names)
export {
  COLOR_PALETTE,
  colorVar,
  SEMANTIC_COLOR_VARS,
  type ColorFamily,
  type ColorStep,
} from './colors'

// Chart color presets (Octuple-aligned)
export {
  CHART_PALETTE,
  CHART_PALETTE_EXTENDED,
  CHART_SEMANTIC,
  CHART_AREA_FILLS,
  type ChartPaletteIndex,
} from './chart-colors'
