import type { PostierTheme } from '../types';
import { defaultTheme } from './default';
import { catppuccinMocha } from './catppuccin-mocha';
import { catppuccinMacchiato } from './catppuccin-macchiato';
import { catppuccinFrappe } from './catppuccin-frappe';
import { catppuccinLatte } from './catppuccin-latte';
import { rosePine } from './rose-pine';
import { rosePineMoon } from './rose-pine-moon';
import { rosePineDawn } from './rose-pine-dawn';

export { defaultTheme };

/** All themes bundled with the app, in display order. */
export const BUILTIN_THEMES: PostierTheme[] = [
  defaultTheme,
  catppuccinMocha,
  catppuccinMacchiato,
  catppuccinFrappe,
  catppuccinLatte,
  rosePine,
  rosePineMoon,
  rosePineDawn,
];
