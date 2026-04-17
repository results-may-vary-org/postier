import type { PostierTheme } from '../types';

/** Sentinel theme — removes all custom CSS vars and lets Radix + next-themes handle colors. */
export const defaultTheme: PostierTheme = {
  id: 'default',
  name: 'Default',
  builtin: true,
  appearance: 'dark',
  accent: '',
  background: '',
  gray: '',
};
