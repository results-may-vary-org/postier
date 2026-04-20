import type { PostierTheme } from '../types';
import { generateScale, generateAlphaScale } from '../generator';

// Amber as the accent — vintage keyboard colorway
const accent = '#D95525';
const scale = generateScale(accent, 'light');

// Gray scale — warm beige spectrum, lightest → darkest (Radix light convention)
const grayColors: string[] = [
  '#f7f2eb', // --bg            warm off-white, like vintage keycap body
  '#ede8de', // --surface       slight surface lift
  '#e3ddd2', //                 between surface and surface-2
  '#d8d0c4', //
  '#c9c1b6', // --surface-2     warm beige, elevated cards
  '#b3ac92', // --border        natural border tone
  '#9e9580', // --border-hi     slightly deeper border
  '#8a7f6c', //                 between border-hi and text-dim
  '#7a6f5e', // --text-dim      dim text, medium warm brown
  '#63584a', //
  '#4f4740', // --sand-dim      muted text, dark warm brown
  '#1e1a15', // --sand          main text, warm near-black
];
const accentAlpha = generateAlphaScale(accent, scale, 'light');
const grayAlpha   = generateAlphaScale(grayColors[7], grayColors, 'light');

export const postierLight: PostierTheme = {
  id: 'postier-light',
  name: 'Postier Light',
  builtin: true,
  appearance: 'light',
  vars: {
    // Gray scale — warm beige, lightest → darkest
    '--gray-1':  '#f7f2eb', // bg
    '--gray-2':  '#ede8de', // surface
    '--gray-3':  '#e3ddd2',
    '--gray-4':  '#d8d0c4',
    '--gray-5':  '#c9c1b6', // surface-2
    '--gray-6':  '#b3ac92', // border
    '--gray-7':  '#9e9580', // border-hi
    '--gray-8':  '#8a7f6c',
    '--gray-9':  '#7a6f5e', // text-dim
    '--gray-10': '#63584a',
    '--gray-11': '#4f4740', // sand-dim
    '--gray-12': '#1e1a15', // sand (main text)
    '--gray-surface':   '#ede8de',
    '--gray-indicator': '#9e9580',
    '--gray-track':     '#9e9580',
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
    '--accent-contrast':  '#ffffff', // white on amber

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

    '--color-background':        '#f7f2eb', // --bg
    '--color-surface':           '#ede8de', // --surface — recessed inputs
    '--color-panel-solid':       '#f7f2eb', // panels float at page level
    '--color-panel-translucent': '#f7f2eb',
    '--color-overlay':           'rgba(30,26,21,0.3)',
  },
};
