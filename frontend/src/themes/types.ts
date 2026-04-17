/** The minimal set of colors a user provides to define a theme. */
export interface ThemeSeed {
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

/** A fully resolved theme, ready to be applied or displayed in the picker. */
export interface PostierTheme extends ThemeSeed {
  /** Stable identifier. Built-ins use a kebab-case slug; user themes use "user-<name>". */
  id: string
  /** True for themes bundled with the app; false for themes loaded from the themes folder. */
  builtin: boolean
}
