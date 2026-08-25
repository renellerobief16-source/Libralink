// Libralink Design System - Centralized Design Tokens
// Single source of truth for all visual design values

export const colors = {
  // Primary Brand Color
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',

  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',

  // Text Colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
  },

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Semantic Colors
  success: '#16A34A',
  successLight: '#DCFCE7',
  successBg: '#F0FDF4',

  warning: '#D97706',
  warningLight: '#FED7AA',
  warningBg: '#FFFBEB',

  error: '#DC2626',
  errorLight: '#FECACA',
  errorBg: '#FEF2F2',

  info: '#0284C7',
  infoLight: '#BAE6FD',
  infoBg: '#F0F9FF',
};

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
};

export const borderRadius = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem',// 30px
  '4xl': '2.25rem', // 36px
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
};

export const transition = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
};

// Tailwind class mappings for common patterns
export const tailwind = {
  // Button variants
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium h-10 px-4 transition-colors',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium h-10 px-4 transition-colors',
    ghost: 'text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium h-10 px-4 transition-colors',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium h-10 px-4 transition-colors',
  },

  // Card
  card: 'bg-white border border-slate-200 rounded-xl shadow-sm',

  // Input
  input: 'h-10 rounded-lg border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
  inputLabel: 'text-sm font-medium text-slate-700',
  inputHelper: 'text-xs text-slate-500',
  inputError: 'text-xs text-red-600',

  // Table
  table: 'bg-white border border-slate-200 rounded-xl overflow-hidden',
  tableHeader: 'bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider',
  tableRow: 'border-b border-slate-100 hover:bg-slate-50 transition-colors',
  tableCell: 'px-4 py-3 text-sm text-slate-700',

  // Modal
  modal: 'bg-white rounded-xl border border-slate-200 shadow-xl',
  modalHeader: 'px-6 py-4 border-b border-slate-200',
  modalBody: 'px-6 py-4',
  modalFooter: 'px-6 py-4 border-t border-slate-200 flex justify-end gap-3',

  // Badge
  badge: {
    success: 'bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full',
    warning: 'bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full',
    error: 'bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full',
    info: 'bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full',
    neutral: 'bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full',
  },

  // Sidebar
  sidebar: 'bg-white border-r border-slate-200',
  sidebarActive: 'text-blue-600 font-semibold bg-blue-50 border-l-2 border-blue-600',
  sidebarInactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
};

export default {
  colors,
  spacing,
  borderRadius,
  shadows,
  fontSize,
  fontWeight,
  zIndex,
  transition,
  tailwind,
};
