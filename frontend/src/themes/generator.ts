import { oklch, formatHex } from 'culori';
import type { SimpleThemeSeed } from './types';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Parse a hex color into [R, G, B] components in the range 0–255. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/**
 * Generates a 12-step perceptually-uniform solid color scale in OKLCH.
 * Step 9 is anchored to the seed hex.
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
 * Generates a 12-step alpha (transparent) scale for a color.
 *
 * Steps 1–8 are rgba values at increasing opacity using the seed hue —
 * this is the approximation Radix components rely on for soft/ghost backgrounds
 * and subtle borders. Steps 9–12 reuse the corresponding solid scale entries
 * so fully-opaque fills remain correct.
 */
export function generateAlphaScale(hex: string, solidScale: string[], appearance: 'light' | 'dark'): string[] {
  const [r, g, b] = hexToRgb(hex);
  const alphas = appearance === 'dark'
    ? [0.05, 0.10, 0.16, 0.22, 0.30, 0.40, 0.54, 0.70]
    : [0.04, 0.07, 0.12, 0.17, 0.22, 0.30, 0.44, 0.60];
  return [
    ...alphas.map(a => `rgba(${r},${g},${b},${a.toFixed(2)})`),
    solidScale[8],
    solidScale[9],
    solidScale[10],
    solidScale[11],
  ];
}

/**
 * Converts a SimpleThemeSeed into a complete flat map of CSS variable overrides
 * for Radix UI Themes (.radix-themes), including solid and alpha scales.
 *
 * Surface and panel colors are derived from the background hex so they are
 * always a visible elevation above the page — never pure black or white.
 */
export function generateCSSVars(
  seed: Pick<SimpleThemeSeed, 'appearance' | 'accent' | 'background' | 'gray'>
): Record<string, string> {
  const accentScale = generateScale(seed.accent, seed.appearance);
  const grayScale   = generateScale(seed.gray,   seed.appearance);
  const accentAlpha = generateAlphaScale(seed.accent, accentScale, seed.appearance);
  const grayAlpha   = generateAlphaScale(seed.gray,   grayScale,   seed.appearance);
  const vars: Record<string, string> = {};

  accentScale.forEach((v, i) => { vars[`--accent-${i + 1}`]   = v; });
  grayScale.forEach  ((v, i) => { vars[`--gray-${i + 1}`]     = v; });
  accentAlpha.forEach((v, i) => { vars[`--accent-a${i + 1}`]  = v; });
  grayAlpha.forEach  ((v, i) => { vars[`--gray-a${i + 1}`]    = v; });

  vars['--color-background'] = seed.background;

  // Accent functional tokens
  const accentSeed = oklch(seed.accent);
  const accentL = accentSeed?.l ?? 0.5;
  vars['--accent-surface']   = accentAlpha[1];  // tinted surface inside accented elements
  vars['--accent-indicator'] = seed.accent;
  vars['--accent-track']     = seed.accent;
  vars['--accent-contrast']  = accentL > 0.65 ? '#1a1a1a' : '#ffffff';

  // Gray functional tokens
  vars['--gray-surface']   = grayAlpha[1];
  vars['--gray-indicator'] = grayScale[8];
  vars['--gray-track']     = grayScale[8];
  vars['--gray-contrast']  = seed.appearance === 'dark' ? '#ffffff' : '#000000';

  // Surface and panel — derive from the actual background so inputs, dropdowns,
  // context menus and popovers are always elevated above the page.
  const bg = oklch(seed.background);
  if (bg) {
    const bgH = bg.h ?? 0;
    const lift = (lDelta: number, chromaFactor = 0.3) =>
      formatHex({ mode: 'oklch', l: clamp(bg.l + lDelta, 0, 0.9999), c: bg.c * chromaFactor, h: bgH });

    if (seed.appearance === 'dark') {
      vars['--color-surface']           = lift(0.05);
      vars['--color-panel-solid']       = lift(0.03);
      vars['--color-panel-translucent'] = lift(0.03);
    } else {
      vars['--color-surface']           = lift(-0.02);
      vars['--color-panel-solid']       = lift(-0.01);
      vars['--color-panel-translucent'] = lift(-0.01);
    }
  } else {
    vars['--color-surface']           = grayScale[2];
    vars['--color-panel-solid']       = grayScale[1];
    vars['--color-panel-translucent'] = grayScale[1];
  }

  return vars;
}
