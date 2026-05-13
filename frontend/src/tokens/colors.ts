/**
 * Octuple DS Theme 2 – Color palette (Figma node 11686:119298).
 * Use in JS/TS for charts, inline styles, or docs. For CSS, use var(--color-{family}-{step}) from colors.css.
 */

const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const
export type ColorStep = (typeof steps)[number]

/** Palette: family -> step -> hex */
export const COLOR_PALETTE = {
  grey: {
    100: '#05070A',
    90: '#1A212E',
    80: '#343C4C',
    70: '#4F5666',
    60: '#69717F',
    50: '#858B98',
    40: '#A1A6B1',
    30: '#BDC1C9',
    20: '#D9DCE1',
    10: '#F6F7F8',
    0: '#FFFFFF',
  },
  blue: {
    100: '#00060A',
    90: '#002A47',
    80: '#054D7B',
    70: '#146DA6',
    60: '#2C8CC9',
    50: '#47A4DF',
    40: '#68BAEF',
    30: '#8ED0FA',
    20: '#BCE4FF',
    10: '#EBF7FF',
  },
  'blue-green': {
    100: '#00090A',
    90: '#00333B',
    80: '#025966',
    70: '#0B7B8B',
    60: '#1999AC',
    50: '#2DB3C7',
    40: '#50CEE1',
    30: '#7BE4F4',
    20: '#B0F3FE',
    10: '#EBFDFF',
  },
  'blue-violet': {
    100: '#090B1F',
    90: '#191D4A',
    80: '#2B3271',
    70: '#414996',
    60: '#5962B7',
    50: '#757ED6',
    40: '#8C95E8',
    30: '#A9B0F5',
    20: '#CACFFC',
    10: '#F1F2FF',
  },
  violet: {
    100: '#060106',
    90: '#350E31',
    80: '#5D2156',
    70: '#7E3A77',
    60: '#975590',
    50: '#AE72A8',
    40: '#C491BF',
    30: '#D8B1D4',
    20: '#EAD3E8',
    10: '#FBF6FB',
  },
  'violet-red': {
    100: '#1F0816',
    90: '#491635',
    80: '#702853',
    70: '#943D71',
    60: '#B5548E',
    50: '#D36FAB',
    40: '#E688C0',
    30: '#F3A5D4',
    20: '#FCC8E7',
    10: '#FFF0F9',
  },
  red: {
    100: '#0A0202',
    90: '#3B1010',
    80: '#6C2222',
    70: '#993838',
    60: '#C15151',
    50: '#E46F6F',
    40: '#F48686',
    30: '#FFA3A3',
    20: '#FFC6C6',
    10: '#FFEFEF',
  },
  'red-orange': {
    100: '#1F0C03',
    90: '#4C1F0C',
    80: '#78351A',
    70: '#A54D2C',
    60: '#D26743',
    50: '#F8845F',
    40: '#FF9977',
    30: '#FFB396',
    20: '#FFD1BD',
    10: '#FFF2ED',
  },
  orange: {
    100: '#0A0700',
    90: '#3B2600',
    80: '#6C4500',
    70: '#9D6309',
    60: '#C97E19',
    50: '#F29D31',
    40: '#FFB650',
    30: '#FFCD78',
    20: '#FFE3B0',
    10: '#FFF8EB',
  },
  yellow: {
    100: '#332200',
    90: '#333100',
    80: '#5C5500',
    70: '#857600',
    60: '#A88F00',
    50: '#D6AD00',
    40: '#F1C40F',
    30: '#FFE44E',
    20: '#FFF89C',
    10: '#FFFFEB',
  },
  'yellow-green': {
    100: '#131300',
    90: '#343500',
    80: '#525400',
    70: '#6D6F00',
    60: '#858707',
    50: '#ABAE1F',
    40: '#CACD46',
    30: '#E2E575',
    20: '#F3F5B0',
    10: '#FDFEEB',
  },
  green: {
    100: '#030A08',
    90: '#0E2E26',
    80: '#1B5143',
    70: '#2B715F',
    60: '#3D8F79',
    50: '#51AB93',
    40: '#67C5AC',
    30: '#8CE1CA',
    20: '#B9F4E4',
    10: '#F0FEFA',
  },
} as const

export type ColorFamily = keyof typeof COLOR_PALETTE

/** CSS variable name for a palette color (e.g. --color-grey-80) */
export function colorVar(family: ColorFamily, step: ColorStep): string {
  return `var(--color-${family}-${step})`
}

/**
 * Semantic / UI color token names (from semantic-colors.css).
 * Use in JS when you need the CSS variable name, e.g. style={{ borderColor: `var(${SEMANTIC_COLOR_VARS.borderDefault})` }}
 */
export const SEMANTIC_COLOR_VARS = {
  borderDefault: '--color-border-default',
  inputInk: '--color-input-ink',
  bgDefault: '--color-bg-default',
  textDefault: '--text-color-default',
  primaryBlue: '--color-primary-blue',
  primaryBlueGreen: '--color-primary-blue-green',
  primaryRed: '--color-primary-red',
  primaryGrey: '--color-primary-grey',
  tertiaryBlue: '--color-tertiary-blue',
  background1Grey: '--color-background1-grey',
  background2Grey: '--color-background2-grey',
  background3Grey: '--color-background3-grey',
  // Button (canonical)
  buttonPrimaryBg: '--color-button-primary-bg',
  buttonPrimaryText: '--color-button-primary-text',
  buttonSecondaryBg: '--color-button-secondary-bg',
  buttonOutlineHoverBg: '--color-button-outline-hover-bg',
} as const
