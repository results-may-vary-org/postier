import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

const accent = '#cba6f7'; // Mauve
const scale = generateScale(accent, 'dark');

const grayColors: string[] = [
  '#11111b', // Crust
  '#181825', // Mantle
  '#1e1e2e', // Base
  '#313244', // Surface 0
  '#45475a', // Surface 1
  '#585b70', // Surface 2
  '#6c7086', // Overlay 0
  '#7f849c', // Overlay 1
  '#9399b2', // Overlay 2
  '#a6adc8', // Subtext 0
  '#bac2de', // Subtext 1
  '#cdd6f4', // Text
];
const accentAlpha = generateAlphaScale(accent, scale, 'dark');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'dark');

export const catppuccinMocha: PostierTheme = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  builtin: true,
  appearance: 'dark',
  vars: {
    // Gray scale — exact Catppuccin Mocha palette (darkest → lightest)
    '--gray-1':  '#11111b', // Crust
    '--gray-2':  '#181825', // Mantle
    '--gray-3':  '#1e1e2e', // Base
    '--gray-4':  '#313244', // Surface 0
    '--gray-5':  '#45475a', // Surface 1
    '--gray-6':  '#585b70', // Surface 2
    '--gray-7':  '#6c7086', // Overlay 0
    '--gray-8':  '#7f849c', // Overlay 1
    '--gray-9':  '#9399b2', // Overlay 2
    '--gray-10': '#a6adc8', // Subtext 0
    '--gray-11': '#bac2de', // Subtext 1
    '--gray-12': '#cdd6f4', // Text
    '--gray-surface':   '#313244',
    '--gray-indicator': '#7f849c',
    '--gray-track':     '#7f849c',
    '--gray-contrast':  '#ffffff',

    // Accent scale — Mauve, generated via OKLCH
    '--accent-1':  scale[0],
    '--accent-2':  scale[1],
    '--accent-3':  scale[2],
    '--accent-4':  scale[3],
    '--accent-5':  scale[4],
    '--accent-6':  scale[5],
    '--accent-7':  scale[6],
    '--accent-8':  scale[7],
    '--accent-9':  accent,
    '--accent-10': scale[9],
    '--accent-11': scale[10],
    '--accent-12': scale[11],
    '--accent-surface':   scale[1],
    '--accent-indicator': accent,
    '--accent-track':     accent,
    '--accent-contrast':  '#1e1e2e', // dark text on bright Mauve

    // Accent alpha scale
    '--accent-a1':  accentAlpha[0],
    '--accent-a2':  accentAlpha[1],
    '--accent-a3':  accentAlpha[2],
    '--accent-a4':  accentAlpha[3],
    '--accent-a5':  accentAlpha[4],
    '--accent-a6':  accentAlpha[5],
    '--accent-a7':  accentAlpha[6],
    '--accent-a8':  accentAlpha[7],
    '--accent-a9':  accentAlpha[8],
    '--accent-a10': accentAlpha[9],
    '--accent-a11': accentAlpha[10],
    '--accent-a12': accentAlpha[11],

    // Gray alpha scale
    '--gray-a1':  grayAlpha[0],
    '--gray-a2':  grayAlpha[1],
    '--gray-a3':  grayAlpha[2],
    '--gray-a4':  grayAlpha[3],
    '--gray-a5':  grayAlpha[4],
    '--gray-a6':  grayAlpha[5],
    '--gray-a7':  grayAlpha[6],
    '--gray-a8':  grayAlpha[7],
    '--gray-a9':  grayAlpha[8],
    '--gray-a10': grayAlpha[9],
    '--gray-a11': grayAlpha[10],
    '--gray-a12': grayAlpha[11],

    // Structural
    '--color-background':        '#1e1e2e', // Base
    '--color-surface':           '#313244', // Surface 0 — input backgrounds
    '--color-panel-solid':       '#181825', // Mantle — dropdown / popover
    '--color-panel-translucent': '#181825',
    '--color-overlay':           'rgba(0,0,0,0.5)',
  },
};
