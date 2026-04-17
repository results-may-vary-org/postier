declare module 'culori' {
  interface OklchColor {
    mode: 'oklch';
    l: number;
    c: number;
    h: number | undefined;
    alpha?: number;
  }

  /** Parse any CSS color string into OKLCH. Returns undefined for invalid input. */
  export function oklch(color: string): OklchColor | undefined;

  /** Serialize any color object to a lowercase hex string (e.g. "#cba6f7"). */
  export function formatHex(color: OklchColor): string;
}
