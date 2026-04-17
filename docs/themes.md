# Themes

Postier ships with a set of built-in themes and supports fully custom themes loaded from a local folder. Themes control the entire color palette — backgrounds, surfaces, text, buttons, borders, and interactive states.

## Built-in themes

| Name | Appearance |
|---|---|
| Default | system (follows OS) |
| Catppuccin Mocha | dark |
| Catppuccin Macchiato | dark |
| Catppuccin Frappé | dark |
| Catppuccin Latte | light |
| Rosé Pine | dark |
| Rosé Pine Moon | dark |
| Rosé Pine Dawn | light |

Select a theme via **Settings → Theme**.

## User themes folder

Custom themes are `.json` files placed in a platform-specific directory:

| OS | Path |
|---|---|
| Linux | `~/.config/postier/themes/` |
| macOS | `~/Library/Application Support/postier/themes/` |
| Windows | `%AppData%\postier\themes\` |

Click **Open folder** in the theme picker to open this directory in your file manager. Click **Reload** after adding or editing files to pick up changes without restarting the app.

On first launch Postier seeds two example files there — `agrume.json` (complete format) and `neovim-dark.json` (simple format) — which you can use as starting points.

## Theme formats

There are two formats. Both are plain JSON files with a `.json` extension.

### Simple theme

Provide three seed colors. Postier derives the full 12-step color scale and all interactive-state variants automatically using perceptually-uniform OKLCH math.

```json
{
  "name": "My Theme",
  "appearance": "dark",
  "accent": "#61ff00",
  "background": "#0b151b",
  "gray": "#5a8a9a"
}
```

| Field | Description |
|---|---|
| `name` | Display name shown in the picker |
| `appearance` | `"light"` or `"dark"` — sets the Radix color mode |
| `accent` | Primary action color (buttons, links, highlights) — any hex color |
| `background` | Page background color |
| `gray` | A mid-tone neutral that anchors the gray scale (borders, muted text, subtle fills) |

Choose `gray` as a color from the middle of your desired neutral range — not the darkest or lightest shade. For a cool-toned dark theme, a desaturated blue-gray works well; for a warm theme, an amber mid-tone.

### Complete theme

Provide the full set of [Radix UI Themes](https://www.radix-ui.com/themes/docs/theme/color) CSS variables directly. Use this when you need precise control over every step, or when the auto-generated scale doesn't match your source palette.

```json
{
  "name": "My Theme",
  "appearance": "light",
  "vars": {
    "--color-background":        "#fdf8f0",
    "--color-surface":           "#f8eccc",
    "--color-panel-solid":       "#fffcf7",
    "--color-panel-translucent": "#fffcf7",
    "--color-overlay":           "rgba(120,70,10,0.3)",

    "--gray-1":  "#fffcf7",
    "--gray-2":  "#fdf8f0",
    "--gray-3":  "#f8eccc",
    "--gray-4":  "#f0d88a",
    "--gray-5":  "#e0b850",
    "--gray-6":  "#c89030",
    "--gray-7":  "#a87020",
    "--gray-8":  "#8a5418",
    "--gray-9":  "#6e3e10",
    "--gray-10": "#522e0c",
    "--gray-11": "#3a2008",
    "--gray-12": "#241408",
    "--gray-surface":   "#f8eccc",
    "--gray-indicator": "#8a5418",
    "--gray-track":     "#8a5418",
    "--gray-contrast":  "#241408",

    "--gray-a1":  "rgba(138,84,24,0.04)",
    "--gray-a2":  "rgba(138,84,24,0.07)",
    "--gray-a3":  "rgba(138,84,24,0.12)",
    "--gray-a4":  "rgba(138,84,24,0.17)",
    "--gray-a5":  "rgba(138,84,24,0.22)",
    "--gray-a6":  "rgba(138,84,24,0.30)",
    "--gray-a7":  "rgba(138,84,24,0.44)",
    "--gray-a8":  "rgba(138,84,24,0.60)",
    "--gray-a9":  "#6e3e10",
    "--gray-a10": "#522e0c",
    "--gray-a11": "#3a2008",
    "--gray-a12": "#241408",

    "--accent-1":  "#fff4ec",
    "--accent-2":  "#ffe8d4",
    "--accent-3":  "#ffd4b0",
    "--accent-4":  "#ffbc88",
    "--accent-5":  "#f9a060",
    "--accent-6":  "#f07838",
    "--accent-7":  "#e05c1e",
    "--accent-8":  "#c84810",
    "--accent-9":  "#e85a10",
    "--accent-10": "#d04a08",
    "--accent-11": "#a83808",
    "--accent-12": "#5c1c00",
    "--accent-surface":   "#ffe8d4",
    "--accent-indicator": "#e85a10",
    "--accent-track":     "#e85a10",
    "--accent-contrast":  "#ffffff",

    "--accent-a1":  "rgba(232,90,16,0.04)",
    "--accent-a2":  "rgba(232,90,16,0.07)",
    "--accent-a3":  "rgba(232,90,16,0.12)",
    "--accent-a4":  "rgba(232,90,16,0.17)",
    "--accent-a5":  "rgba(232,90,16,0.22)",
    "--accent-a6":  "rgba(232,90,16,0.30)",
    "--accent-a7":  "rgba(232,90,16,0.44)",
    "--accent-a8":  "rgba(232,90,16,0.60)",
    "--accent-a9":  "#e85a10",
    "--accent-a10": "#d04a08",
    "--accent-a11": "#a83808",
    "--accent-a12": "#5c1c00"
  }
}
```

#### Variable reference

**Structural colors**

| Variable | Used for |
|---|---|
| `--color-background` | Page background |
| `--color-surface` | Recessed surfaces — input fields, code blocks |
| `--color-panel-solid` | Elevated panels — dropdowns, popovers, dialogs |
| `--color-panel-translucent` | Same as panel-solid but for translucent variants |
| `--color-overlay` | Modal backdrop (use `rgba`) |

**Gray scale** (`--gray-1` … `--gray-12`)

Step 1 is the lightest (near background), step 12 is the darkest (primary text). Include the four functional tokens too:

| Variable | Used for |
|---|---|
| `--gray-surface` | Subtle fill inside gray-accented components |
| `--gray-indicator` | Progress bars, sliders on gray elements |
| `--gray-track` | Track behind gray indicators |
| `--gray-contrast` | Text on top of solid gray fills |

**Gray alpha scale** (`--gray-a1` … `--gray-a12`)

Transparent versions of the gray scale. Steps 1–8 are typically `rgba(r,g,b,alpha)` using a mid-tone gray at increasing opacity. Steps 9–12 are usually the same hex as the corresponding solid steps. Used by ghost buttons, subtle hovers, and soft badge backgrounds.

**Accent scale** (`--accent-1` … `--accent-12`) and alpha scale (`--accent-a1` … `--accent-a12`)

Same structure as the gray scale but for your brand/action color. Step 9 is the primary solid fill (e.g. button background). The alpha scale is critical — omitting it causes `variant="soft"` and `variant="ghost"` buttons to fall back to the default color.

| Variable | Used for |
|---|---|
| `--accent-surface` | Tinted fill inside accented components |
| `--accent-indicator` | Progress bars, checkboxes |
| `--accent-track` | Slider/progress track |
| `--accent-contrast` | Text rendered on top of `--accent-9` — use `#ffffff` or a dark color depending on your accent brightness |

## Tips

- **Test contrast** — step 11 (`--gray-11`, `--accent-11`) is used for inline text; ensure it meets at least 4.5:1 against the background.
- **Alpha scale matters** — if soft/ghost buttons look wrong, the alpha scale is likely missing or using incorrect RGB values.
- **`--accent-contrast`** — for bright accents (e.g. lime green or yellow) set this to a dark color; for dark accents set it to `#ffffff`.
- **Reload without restart** — drop a file in the themes folder and click Reload; no restart needed.
