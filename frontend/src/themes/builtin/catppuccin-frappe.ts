import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

const accent = '#ca9ee6'; // Mauve
const scale = generateScale(accent, 'dark');

const grayColors: string[] = [
  '#232634', // Crust
  '#292c3c', // Mantle
  '#303446', // Base
  '#414559', // Surface 0
  '#51576d', // Surface 1
  '#626880', // Surface 2
  '#737994', // Overlay 0
  '#838ba7', // Overlay 1
  '#949cbb', // Overlay 2
  '#a5adce', // Subtext 0
  '#b5bfe2', // Subtext 1
  '#c6d0f5', // Text
];
const accentAlpha = generateAlphaScale(accent, scale, 'dark');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'dark');

export const catppuccinFrappe: PostierTheme = {
  id: 'catppuccin-frappe',
  name: 'Catppuccin Frappé',
  builtin: true,
  appearance: 'dark',
  vars: {
    '--gray-1':  '#232634', // Crust
    '--gray-2':  '#292c3c', // Mantle
    '--gray-3':  '#303446', // Base
    '--gray-4':  '#414559', // Surface 0
    '--gray-5':  '#51576d', // Surface 1
    '--gray-6':  '#626880', // Surface 2
    '--gray-7':  '#737994', // Overlay 0
    '--gray-8':  '#838ba7', // Overlay 1
    '--gray-9':  '#949cbb', // Overlay 2
    '--gray-10': '#a5adce', // Subtext 0
    '--gray-11': '#b5bfe2', // Subtext 1
    '--gray-12': '#c6d0f5', // Text
    '--gray-surface':   '#414559',
    '--gray-indicator': '#838ba7',
    '--gray-track':     '#838ba7',
    '--gray-contrast':  '#ffffff',

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
    '--accent-contrast':  '#303446',

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

    '--color-background':        '#303446',
    '--color-surface':           '#414559',
    '--color-panel-solid':       '#292c3c',
    '--color-panel-translucent': '#292c3c',
    '--color-overlay':           'rgba(0,0,0,0.5)',
  },
};
