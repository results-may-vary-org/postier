import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

// Amber as the accent — warm vintage glow on a dark background
const accent = '#D95525';
const scale = generateScale(accent, 'dark');

// Gray scale — warm brown spectrum, darkest → lightest (Radix dark convention)
const grayColors: string[] = [
  '#100e0a', //                 deeper than base
  '#1a1610', // --bg            warm near-black
  '#221e17', //                 surface lift
  '#2a251d', //
  '#342e24', //
  '#44392c', //
  '#5c4e3a', //
  '#7a6f5e', // --text-dim      between muted and dim
  '#9e9580', // --border-hi
  '#b3ac92', // --border
  '#c9c1b6', // --surface-2
  '#ede8de', // --surface       near-white warm (used for text)
];
const accentAlpha = generateAlphaScale(accent, scale, 'dark');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'dark');

export const postierDark: PostierTheme = {
  id: 'postier-dark',
  name: 'Postier Dark',
  builtin: true,
  appearance: 'dark',
  vars: {
    // Gray scale — warm brown, darkest → lightest
    '--gray-1':  '#100e0a',
    '--gray-2':  '#1a1610', // bg
    '--gray-3':  '#221e17',
    '--gray-4':  '#2a251d',
    '--gray-5':  '#342e24',
    '--gray-6':  '#44392c',
    '--gray-7':  '#5c4e3a',
    '--gray-8':  '#7a6f5e', // text-dim
    '--gray-9':  '#9e9580', // border-hi
    '--gray-10': '#b3ac92', // border
    '--gray-11': '#c9c1b6', // surface-2 / muted text
    '--gray-12': '#ede8de', // surface / primary text
    '--gray-surface':   '#2a251d',
    '--gray-indicator': '#9e9580',
    '--gray-track':     '#9e9580',
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
    '--accent-contrast':  '#1a1610', // dark text on warm amber

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

    '--color-background':        '#1a1610', // --bg
    '--color-surface':           '#2a251d', // recessed inputs
    '--color-panel-solid':       '#221e17', // panels slightly above bg
    '--color-panel-translucent': '#221e17',
    '--color-overlay':           'rgba(0,0,0,0.6)',
  },
};
