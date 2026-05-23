// PoroBook design tokens — brand identity system
export const colors = {
  ember:     '#C8722A',
  emberDeep: '#9A4E18',
  emberGlow: '#E8943A',
  gold:      '#D4A84B',
  goldLight: '#F0C96A',
  bark:      '#2C1A0E',
  barkMid:   '#4A2E18',
  barkLight: '#7A5535',
  charcoal:  '#1C1410',
  cream:     '#F7F0E6',
  linen:     '#EDE4D6',
  warmGray:  '#9A8878',
  white:     '#FDFAF6',
} as const

export const fonts = {
  display: 'PlayfairDisplay_900Black',
  displayItalic: 'PlayfairDisplay_700BoldItalic',
  sans: 'DMSans_400Regular',
  sansLight: 'DMSans_300Light',
  sansMedium: 'DMSans_500Medium',
  label: 'JosefinSans_300Light',
  labelBold: 'JosefinSans_600SemiBold',
  accent: 'CormorantGaramond_400Regular_Italic',
} as const

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64,
} as const

export const radius = {
  sm: 4, md: 8, lg: 16, xl: 24, full: 9999,
} as const

export type Colors = typeof colors
export type Fonts = typeof fonts
