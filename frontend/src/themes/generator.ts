import { oklch, formatHex } from 'culori';
import type { ThemeSeed } from './types';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Generates a 12-step perceptually-uniform color scale in OKLCH.
 *
 * Step 9 is anchored to the seed hex (the "main" solid color).
 * Steps 1–8 progress from near-background tints toward the seed.
 * Steps 10–12 cover hover-solid and text variants.
 */
export function generateScale(hex: string, appearance: 'light' | 'dark'): string[] {
  const color = oklch(hex);
  if (!color || color.h === undefined) return Array(12).fill(hex);
  const { l, c: chroma, h } = color;

  if (appearance === 'dark') {
    return [
      formatHex({ mode: 'oklch', l: 0.11, c: chroma * 0.05, h }),
      formatHex({ mode: 'oklch', l: 0.14, c: chroma * 0.08, h }),
      formatHex({ mode: 'oklch', l: 0.18, c: chroma * 0.13, h }),
      formatHex({ mode: 'oklch', l: 0.22, c: chroma * 0.18, h }),
      formatHex({ mode: 'oklch', l: 0.26, c: chroma * 0.23, h }),
      formatHex({ mode: 'oklch', l: 0.31, c: chroma * 0.32, h }),
      formatHex({ mode: 'oklch', l: 0.39, c: chroma * 0.46, h }),
      formatHex({ mode: 'oklch', l: 0.50, c: chroma * 0.65, h }),
      hex,
      formatHex({ mode: 'oklch', l: clamp(l + 0.06, 0, 0.99), c: chroma, h }),
      formatHex({ mode: 'oklch', l: 0.78, c: chroma * 0.65, h }),
      formatHex({ mode: 'oklch', l: 0.93, c: chroma * 0.25, h }),
    ];
  }

  return [
    formatHex({ mode: 'oklch', l: 0.99, c: chroma * 0.02, h }),
    formatHex({ mode: 'oklch', l: 0.97, c: chroma * 0.05, h }),
    formatHex({ mode: 'oklch', l: 0.94, c: chroma * 0.09, h }),
    formatHex({ mode: 'oklch', l: 0.91, c: chroma * 0.14, h }),
    formatHex({ mode: 'oklch', l: 0.87, c: chroma * 0.19, h }),
    formatHex({ mode: 'oklch', l: 0.82, c: chroma * 0.28, h }),
    formatHex({ mode: 'oklch', l: 0.74, c: chroma * 0.43, h }),
    formatHex({ mode: 'oklch', l: 0.63, c: chroma * 0.62, h }),
    hex,
    formatHex({ mode: 'oklch', l: clamp(l - 0.06, 0.01, 1), c: chroma, h }),
    formatHex({ mode: 'oklch', l: 0.38, c: chroma * 0.65, h }),
    formatHex({ mode: 'oklch', l: 0.18, c: chroma * 0.28, h }),
  ];
}

/**
 * Converts a ThemeSeed into a flat map of CSS variable overrides compatible
 * with Radix UI Themes (.radix-themes).
 */
export function generateCSSVars(seed: Pick<ThemeSeed, 'appearance' | 'accent' | 'background' | 'gray'>): Record<string, string> {
  const accentScale = generateScale(seed.accent, seed.appearance);
  const grayScale   = generateScale(seed.gray,   seed.appearance);
  const vars: Record<string, string> = {};

  accentScale.forEach((v, i) => { vars[`--accent-${i + 1}`] = v; });
  grayScale.forEach  ((v, i) => { vars[`--gray-${i + 1}`]   = v; });

  vars['--color-background']        = seed.background;
  vars['--color-panel-solid']       = grayScale[1];
  vars['--color-panel-translucent'] = grayScale[0];
  vars['--color-surface']           = grayScale[0];

  return vars;
}
