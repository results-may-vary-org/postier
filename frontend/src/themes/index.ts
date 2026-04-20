import type { PostierTheme } from './types';
import { generateCSSVars } from './generator';

export { BUILTIN_THEMES, defaultTheme } from './builtin/index';
export type { PostierTheme, ThemeSeed, SimpleThemeSeed, CompleteThemeSeed } from './types';

/**
 * Applies a theme by injecting a <style> element that overrides Radix UI CSS
 * variables on .radix-themes.
 *
 * - "simple" themes: generates a full variable set from 3 seed colors.
 * - "complete" themes: injects the user-supplied variable map as-is.
 * - "default" theme: removes any previous overrides and restores Radix defaults.
 */
export function applyTheme(theme: PostierTheme): void {
  const existing = document.getElementById('postier-theme-vars');
  if (existing) existing.remove();

  if (theme.id === 'radix') return;

  let vars: Record<string, string> | null = null;

  if (theme.vars) {
    // Complete theme — use the variable map verbatim
    vars = theme.vars;
  } else if (theme.accent && theme.background && theme.gray) {
    // Simple theme — generate from 3 seed colors
    vars = generateCSSVars({
      appearance: theme.appearance,
      accent: theme.accent,
      background: theme.background,
      gray: theme.gray,
    });
  }

  if (!vars) return;

  // Radix maps --accent-* to --tomato-* via a [data-accent-color="tomato"] rule
  // which has higher specificity than .radix-themes. Aliasing the tomato palette
  // to our accent values ensures every component picks up the custom color.
  const withTomato = { ...vars };
  for (const [k, v] of Object.entries(vars)) {
    const tomato = k.replace(/^--accent-/, '--tomato-');
    if (tomato !== k) withTomato[tomato] = v;
  }

  const declarations = Object.entries(withTomato).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  const style = document.createElement('style');
  style.id = 'postier-theme-vars';
  style.textContent = `.radix-themes {\n${declarations}\n}`;
  document.head.appendChild(style);
}
