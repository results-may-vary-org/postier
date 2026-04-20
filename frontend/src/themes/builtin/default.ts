import type { PostierTheme } from '../types';

/** Sentinel theme — removes all custom CSS vars and lets Radix + next-themes handle colors. */
export const defaultTheme: PostierTheme = {
  id: 'radix',
  name: 'Radix',
  builtin: true,
  appearance: 'dark',
  accent: '',
  background: '',
  gray: '',
};
