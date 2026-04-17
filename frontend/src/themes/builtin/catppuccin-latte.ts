import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

const accent = '#8839ef'; // Mauve
const scale = generateScale(accent, 'light');

const grayColors: string[] = [
  '#eff1f5', // Base
  '#e6e9ef', // Mantle
  '#dce0e8', // Crust
  '#ccd0da', // Surface 0
  '#bcc0cc', // Surface 1
  '#acb0be', // Surface 2
  '#9ca0b0', // Overlay 0
  '#8c8fa1', // Overlay 1
  '#7c7f93', // Overlay 2
  '#6c6f85', // Subtext 0
  '#5c5f77', // Subtext 1
  '#4c4f69', // Text
];
const accentAlpha = generateAlphaScale(accent, scale, 'light');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'light');

export const catppuccinLatte: PostierTheme = {
  id: 'catppuccin-latte',
  name: 'Catppuccin Latte',
  builtin: true,
  appearance: 'light',
  vars: {
    // Gray scale — Latte palette, lightest → darkest (Radix light convention)
    '--gray-1':  '#eff1f5', // Base
    '--gray-2':  '#e6e9ef', // Mantle
    '--gray-3':  '#dce0e8', // Crust
    '--gray-4':  '#ccd0da', // Surface 0
    '--gray-5':  '#bcc0cc', // Surface 1
    '--gray-6':  '#acb0be', // Surface 2
    '--gray-7':  '#9ca0b0', // Overlay 0
    '--gray-8':  '#8c8fa1', // Overlay 1
    '--gray-9':  '#7c7f93', // Overlay 2
    '--gray-10': '#6c6f85', // Subtext 0
    '--gray-11': '#5c5f77', // Subtext 1
    '--gray-12': '#4c4f69', // Text
    '--gray-surface':   '#e6e9ef',
    '--gray-indicator': '#8c8fa1',
    '--gray-track':     '#8c8fa1',
    '--gray-contrast':  '#000000',

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
    '--accent-surface':   scale[0],
    '--accent-indicator': accent,
    '--accent-track':     accent,
    '--accent-contrast':  '#ffffff', // white text on dark Mauve

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

    '--color-background':        '#eff1f5',
    '--color-surface':           '#e6e9ef', // Mantle — recessed inputs
    '--color-panel-solid':       '#eff1f5', // Base — panels float at page level
    '--color-panel-translucent': '#eff1f5',
    '--color-overlay':           'rgba(0,0,0,0.3)',
  },
};
