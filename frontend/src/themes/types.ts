/** Colors a user provides for a "simple" theme — 3 seed hex values. */
export interface SimpleThemeSeed {
  name: string
  /** Controls which Radix appearance (and next-themes class) is activated. */
  appearance: 'light' | 'dark'
  /** Main accent color — hex, e.g. "#cba6f7". Anchors step 9 of the accent scale. */
  accent: string
  /** Base page background color — hex. */
  background: string
  /** Mid-tone neutral — hex. Anchors the gray scale used for surfaces and borders. */
  gray: string
}

/**
 * A "complete" theme — the user supplies the full set of Radix CSS variables
 * directly (--accent-1 … --accent-12, --gray-*, --color-*, etc.).
 */
export interface CompleteThemeSeed {
  name: string
  appearance: 'light' | 'dark'
  /** Flat map of every Radix CSS variable to override on .radix-themes. */
  vars: Record<string, string>
}

/** Either form of user-provided theme data (JSON on disk). */
export type ThemeSeed = SimpleThemeSeed | CompleteThemeSeed

/** A fully resolved theme, ready to be applied or displayed in the picker. */
export interface PostierTheme {
  id: string
  builtin: boolean
  name: string
  appearance: 'light' | 'dark'
  // Simple theme fields (present on built-ins and simple user themes)
  accent?: string
  background?: string
  gray?: string
  // Complete theme field (present on advanced user themes)
  vars?: Record<string, string>
}
