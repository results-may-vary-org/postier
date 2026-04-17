import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

const accent = '#c4a7e7'; // Iris (same hue as Rose Pine)
const scale = generateScale(accent, 'dark');

const grayColors: string[] = [
  '#14131f',
  '#1a1930',
  '#232136', // Base
  '#2a273f', // Surface
  '#393552', // Overlay
  '#44415a', // Highlight Med
  '#56526e', // Highlight High
  '#6e6a86', // Muted
  '#7f7b98',
  '#908caa', // Subtle
  '#cac7e0',
  '#e0def4', // Text
];
const accentAlpha = generateAlphaScale(accent, scale, 'dark');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'dark');

export const rosePineMoon: PostierTheme = {
  id: 'rose-pine-moon',
  name: 'Rosé Pine Moon',
  builtin: true,
  appearance: 'dark',
  vars: {
    '--gray-1':  '#14131f',
    '--gray-2':  '#1a1930',
    '--gray-3':  '#232136', // Base
    '--gray-4':  '#2a273f', // Surface
    '--gray-5':  '#393552', // Overlay
    '--gray-6':  '#44415a', // Highlight Med
    '--gray-7':  '#56526e', // Highlight High
    '--gray-8':  '#6e6a86', // Muted
    '--gray-9':  '#7f7b98',
    '--gray-10': '#908caa', // Subtle
    '--gray-11': '#cac7e0',
    '--gray-12': '#e0def4', // Text
    '--gray-surface':   '#2a273f',
    '--gray-indicator': '#6e6a86',
    '--gray-track':     '#6e6a86',
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
    '--accent-contrast':  '#232136',

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

    '--color-background':        '#232136',
    '--color-surface':           '#393552',
    '--color-panel-solid':       '#2a273f',
    '--color-panel-translucent': '#2a273f',
    '--color-overlay':           'rgba(0,0,0,0.5)',
  },
};
