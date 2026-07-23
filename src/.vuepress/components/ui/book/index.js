export const BOOK_RADIUS_MAP = {
  sm: 'book-radius-sm',
  md: 'book-radius-md',
  lg: 'book-radius-lg',
  xl: 'book-radius-xl',
}

export const BOOK_SIZE_MAP = {
  sm: { width: '180px', spineTranslation: '152px' },
  md: { width: '220px', spineTranslation: '192px' },
  lg: { width: '260px', spineTranslation: '232px' },
  xl: { width: '300px', spineTranslation: '272px' },
}

export const BOOK_SHADOW_SIZE_MAP = {
  sm: '-5px 0 15px 5px var(--shadowColor)',
  md: '-7px 0 25px 7px var(--shadowColor)',
  lg: '-10px 0 35px 10px var(--shadowColor)',
  xl: '-12px 0 45px 12px var(--shadowColor)',
}

export const BOOK_COLOR_MAP = {
  slate: { from: '#0f172a', to: '#334155' },
  gray: { from: '#111827', to: '#374151' },
  zinc: { from: '#18181b', to: '#3f3f46' },
  neutral: { from: '#171717', to: '#404040' },
  stone: { from: '#1c1917', to: '#44403c' },
  red: { from: '#7f1d1d', to: '#b91c1c' },
  orange: { from: '#7c2d12', to: '#c2410c' },
  amber: { from: '#78350f', to: '#b45309' },
  yellow: { from: '#713f12', to: '#a16207' },
  lime: { from: '#365314', to: '#4d7c0f' },
  green: { from: '#14532d', to: '#15803d' },
  emerald: { from: '#064e3b', to: '#047857' },
  teal: { from: '#134e4a', to: '#0f766e' },
  cyan: { from: '#164e63', to: '#0e7490' },
  sky: { from: '#0c4a6e', to: '#0369a1' },
  blue: { from: '#1e3a8a', to: '#1d4ed8' },
  indigo: { from: '#312e81', to: '#4338ca' },
  violet: { from: '#4c1d95', to: '#6d28d9' },
  purple: { from: '#581c87', to: '#7e22ce' },
  fuchsia: { from: '#701a75', to: '#a21caf' },
  pink: { from: '#831843', to: '#be185d' },
  rose: { from: '#881337', to: '#be123c' },
}

export { default as Book } from './Book.vue'
export { default as BookDescription } from './BookDescription.vue'
export { default as BookHeader } from './BookHeader.vue'
export { default as BookTitle } from './BookTitle.vue'
