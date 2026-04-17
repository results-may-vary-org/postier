import type { PostierTheme } from './types';
import { generateCSSVars } from './generator';

export { BUILTIN_THEMES, defaultTheme } from './builtin/index';
export type { PostierTheme, ThemeSeed } from './types';

/**
 * Applies a theme by injecting a <style> element that overrides Radix UI CSS
 * variables on .radix-themes. Calling with the "default" theme removes any
 * previously injected overrides and restores Radix's own color system.
 */
export function applyTheme(theme: PostierTheme): void {
  const existing = document.getElementById('postier-theme-vars');
  if (existing) existing.remove();

  if (theme.id === 'default' || !theme.accent) return;

  const vars = generateCSSVars(theme);
  const declarations = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const style = document.createElement('style');
  style.id = 'postier-theme-vars';
  style.textContent = `.radix-themes {\n${declarations}\n}`;
  document.head.appendChild(style);
}
