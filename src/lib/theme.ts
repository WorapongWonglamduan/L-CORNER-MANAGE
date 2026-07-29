export const theme = {
  colors: {
    primary: {
      main: 'var(--primary)',
      light: 'var(--primary-light)',
      dark: 'var(--primary-dark)',
    },
    secondary: {
      blue: '#3b82f6',
      green: '#10b981',
      orange: '#f59e0b',
      purple: '#8b5cf6',
      red: '#ef4444',
    },
    background: {
      main: 'from-slate-50 via-blue-50 to-slate-100',
      light: 'from-blue-50 to-slate-50',
      dark: 'from-primary to-primary-light',
    },
    text: {
      primary: 'var(--primary)',
      secondary: '#64748b',
      light: '#94a3b8',
      white: '#ffffff',
    },
  },
  gradients: {
    primary: 'bg-gradient-to-r from-primary to-primary-light',
    primaryBr: 'bg-gradient-to-br from-primary to-primary-light',
    background: 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100',
    backgroundLight: 'bg-gradient-to-r from-blue-50 to-slate-50',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    primary: 'shadow-lg shadow-primary/30',
    primaryHover: 'shadow-xl shadow-primary/40',
  },
  rounded: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    full: 'rounded-full',
  },
  borders: {
    light: 'border border-gray-100 dark:border-gray-700',
    medium: 'border border-gray-200 dark:border-gray-600',
    primary: 'border border-primary',
  },
  buttons: {
    primary: 'bg-gradient-to-r from-primary to-primary-light text-white hover:scale-105 active:scale-95 transition-all duration-200',
    secondary: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
    ghost: 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-200 border border-white/20',
  },
  cards: {
    default: 'bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-200',
    flat: 'bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700',
  },
  inputs: {
    default: 'block w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:border-primary focus:outline-none focus:ring-0',
  },
}

// Helper function to get theme values
export const getTheme = () => theme

// Color utilities
export const colors = {
  primary: 'var(--primary)',
  primaryLight: 'var(--primary-light)',
  primaryDark: 'var(--primary-dark)',
  blue: '#3b82f6',
  green: '#10b981',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',
}
