import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

const accent = '#907aa9'; // Iris
const scale = generateScale(accent, 'light');

const grayColors: string[] = [
  '#fffaf3', // Surface (elevated)
  '#faf4ed', // Base
  '#f4ede8', // Highlight Low
  '#f2e9e1', // Overlay
  '#dfdad9', // Highlight Med
  '#cecacd', // Highlight High
  '#9893a5', // Muted
  '#8b8798',
  '#797593', // Subtle
  '#686481',
  '#575279', // Text
  '#403d5e',
];
const accentAlpha = generateAlphaScale(accent, scale, 'light');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'light');

export const rosePineDawn: PostierTheme = {
  id: 'rose-pine-dawn',
  name: 'Rosé Pine Dawn',
  builtin: true,
  appearance: 'light',
  vars: {
    // Gray scale — Dawn palette (lightest → darkest)
    '--gray-1':  '#fffaf3', // Surface (elevated, lighter than Base)
    '--gray-2':  '#faf4ed', // Base
    '--gray-3':  '#f4ede8', // Highlight Low
    '--gray-4':  '#f2e9e1', // Overlay
    '--gray-5':  '#dfdad9', // Highlight Med
    '--gray-6':  '#cecacd', // Highlight High
    '--gray-7':  '#9893a5', // Muted
    '--gray-8':  '#8b8798',
    '--gray-9':  '#797593', // Subtle
    '--gray-10': '#686481',
    '--gray-11': '#575279', // Text
    '--gray-12': '#403d5e',
    '--gray-surface':   '#f4ede8',
    '--gray-indicator': '#9893a5',
    '--gray-track':     '#9893a5',
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
    '--accent-contrast':  '#ffffff',

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

    '--color-background':        '#faf4ed',
    '--color-surface':           '#f2e9e1', // Overlay — recessed inputs
    '--color-panel-solid':       '#fffaf3', // Surface — panels float lighter
    '--color-panel-translucent': '#fffaf3',
    '--color-overlay':           'rgba(87,82,121,0.3)',
  },
};
