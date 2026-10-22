# Theming

ng-prism uses CSS custom properties for all visual styling. Override any property via `defineConfig({ theme })` or a custom stylesheet.

## Quick Override

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
    theme: {
        '--prism-primary': '#0ea5e9',
        '--prism-bg': '#0f172a',
        '--prism-font-sans': '"Inter", system-ui, sans-serif'
    }
});
```

Values in `theme` are merged on top of the built-in defaults. You only need to specify the properties you want to change.

Overriding `--prism-primary` alone also recolours fills (primary buttons, active toggles, checkboxes): `--prism-primary-fill` and `--prism-primary-fill-hover` follow it unless you set them yourself. Text on those fills stays `--prism-on-primary` (white); with a light primary of your own, set `--prism-on-primary` too so the label keeps 4.5:1.

## Theme-Specific Overrides

Use `darkTheme` and `lightTheme` to set values that only apply in one mode:

```typescript
export default defineConfig({
    theme: {
        '--prism-primary': '#0056CE',
        '--prism-font-sans': "'Inter', system-ui, sans-serif"
    },
    darkTheme: {
        '--prism-bg': '#0a1628',
        '--prism-bg-surface': '#112240'
    },
    lightTheme: {
        '--prism-bg': '#f1f5f9',
        '--prism-bg-surface': '#ffffff'
    }
});
```

**Merge order:** `built-in defaults → darkTheme/lightTheme → theme`. The `theme` property always wins when the same key appears in both.

**The header uses the dark set in both themes.** Since 22.7 the header is a navy brand band, also while the app runs light. It renders with the dark tokens, including your `darkTheme` overrides, so a header widget from any plugin reads colours that fit the band without code of its own. Menus that open out of the header follow the active theme again.

## Custom Stylesheet

> **Deprecated since 22.6.0, removed in 23.0.0.** `themeStylesheet` was meant to load a stylesheet of your own into the styleguide app. Nothing has ever loaded it, so setting it never had an effect, and the build prints a notice while it is set. Colours, fonts and density go through the tokens above.

## Brand

| Property                                             | Default (dark)                                                               | Default (light)                                                              | Description                                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prism-brand-gradient`                             | `linear-gradient(90deg, #00CFEA 0%, #078BFA 38%, #244BFF 68%, #A20CF0 100%)` | same                                                                         | The logo gradient: the wordmark and the header's top edge. Identical in both themes.                                                                    |
| `--prism-brand-ink`                                  | `var(--prism-brand-gradient)`                                                | `linear-gradient(90deg, #0891b2 0%, #2563eb 38%, #6d28d9 68%, #a20cf0 100%)` | The gradient as a stroke on the current surface: tab indicators, the active sidebar entry, the active view segment. Every stop holds 3:1 on the chrome. |
| `--prism-brand-glow`                                 | three soft radial gradients in cyan, blue and magenta                        | the same, a little fainter                                                   | The refracted light behind the logo and the empty state                                                                                                 |
| `--prism-facet-cyan`, `-blue`, `-violet`, `-magenta` | `#22d3ee`, `#60a5fa`, `#a78bfa`, `#e879f9`                                   | `#0891b2`, `#2563eb`, `#7c3aed`, `#c026d3`                                   | The logo's facet colours for icons (sidebar sections). Each holds 3:1 on every surface.                                                                 |

## Color Properties

| Property                                 | Default (dark)                                              | Default (light)                                | Description                                                                |
| ---------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| `--prism-primary`                        | `#60a5fa`                                                   | `#1d4ed8`                                      | Text and indicator role: links, active tabs, active icons, selection tints |
| `--prism-primary-fill`                   | `#2563eb`                                                   | `#2563eb`                                      | Fill role: primary buttons, active toggles, checked checkboxes             |
| `--prism-primary-fill-hover`             | `#1d4ed8`                                                   | `#1d4ed8`                                      | Hover state of the fill                                                    |
| `--prism-on-primary`                     | `#ffffff`                                                   | `#ffffff`                                      | Text and knobs on the fill (5.2:1)                                         |
| `--prism-link`                           | `var(--prism-primary)`                                      | same                                           | Links in the chrome                                                        |
| `--prism-primary-bg`                     | `color-mix(in srgb, var(--prism-primary) 16%, transparent)` | `color-mix(in srgb, #2563eb 10%, transparent)` | Selection and active-state tint                                            |
| `--prism-accent`                         | `#a78bfa`                                                   | `#7c3aed`                                      | Secondary accent                                                           |
| `--prism-bg`                             | `#080d19`                                                   | `#f1f5f9`                                      | Chrome: header, sidebar, component head, variant ribbon, panel tab bar     |
| `--prism-bg-surface`                     | `#111827`                                                   | `#ffffff`                                      | Content: addon panel, cards, canvas surround                               |
| `--prism-bg-elevated`                    | `#1a2335`                                                   | `#ffffff`                                      | Popovers, the tool rail (with `--prism-shadow-md`)                         |
| `--prism-void`                           | `#050911`                                                   | `#eef2f7`                                      | Deepest background behind everything                                       |
| `--prism-shadow-sm`, `--prism-shadow-md` | dark, strong                                                | slate-tinted, soft                             | Elevation of segments and popovers                                         |

Why two primaries: the brand blue `#2563eb` reaches only 3–3.9:1 as text on the dark surfaces, but 5.2:1 under white text as a fill in both themes. So fills keep the brand blue, and text and indicators take a shade that holds 4.5:1 on every surface, including the tints.

> **Deprecated since 22.7.0, removed in 23.0.0:** `--prism-primary-from` and `--prism-primary-to` (core no longer paints gradients from them) and `--prism-spectrum` (now an alias of `--prism-brand-gradient`).

## Text Properties

| Property             | Default (dark) | Default (light) | Description                                                                        |
| -------------------- | -------------- | --------------- | ---------------------------------------------------------------------------------- |
| `--prism-text`       | `#f1f5f9`      | `#0f172a`       | Primary text                                                                       |
| `--prism-text-2`     | `#cbd5e1`      | `#334155`       | Secondary text                                                                     |
| `--prism-text-muted` | `#94a3b8`      | `#5b6b80`       | Muted text, labels, metadata. Holds 4.5:1 on every surface.                        |
| `--prism-text-ghost` | `#64748b`      | `#94a3b8`       | Decoration and placeholders only; never for text someone has to read (under 4.5:1) |

## Status Colors

| Property                                                     | Default (dark)                                        | Default (light)                                      | Description                                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prism-success`                                            | `#0ae2cb`                                             | `#06776a`                                            | Within its threshold                                                                                                                                                                     |
| `--prism-warn`                                               | `#ffb984`                                             | `#a05602`                                            | Past its warning threshold                                                                                                                                                               |
| `--prism-danger`                                             | `#fe6ba6`                                             | `#8e024d`                                            | Past its critical threshold                                                                                                                                                              |
| `--prism-success-bg`, `--prism-warn-bg`, `--prism-danger-bg` | `color-mix(in srgb, var(--prism-x) 16%, transparent)` | `color-mix(in srgb, <vivid shade> 14%, transparent)` | Soft badge surfaces. In the light theme the tint comes from a vivid shade of the hue (`#0edbc5`, `#ffa65f`, `#ff7cad`), because a tint of the dark text colour reads olive and wine-red. |

Every status colour holds 4.5:1 on every surface and on its own `-bg` tint. Warning and danger stay at least ΔE 45 and ΔL\* 14 apart, so they remain tellable apart for a reader with deuteranopia.

> **Deprecated since 22.7.0, removed in 23.0.0:** `--prism-mark-nominal`, `--prism-mark-attention` and `--prism-mark-critical`. They are aliases of `--prism-success`, `--prism-warn` and `--prism-danger`. An override of a mark is carried over to its successor (with a console warning), so an existing theme keeps working; move it to the new name.

## Code Syntax Colors

| Property            | Default (dark) | Default (light) | Description                |
| ------------------- | -------------- | --------------- | -------------------------- |
| `--prism-code-tag`  | `#e879f9`      | `#a21caf`       | HTML/XML tag names         |
| `--prism-code-attr` | `#67e8f9`      | `#0e7490`       | Attribute names, JSON keys |
| `--prism-code-str`  | `#86efac`      | `#127a3a`       | String values              |
| `--prism-code-com`  | `#7c8ba1`      | `#5b6b80`       | Comments                   |

## Border & Glow Properties

| Property                | Default (dark)             | Default (light)          | Description                                                        |
| ----------------------- | -------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `--prism-border`        | `#1f2b3e`                  | `#e2e8f0`                | Dividers and decorative outlines                                   |
| `--prism-border-strong` | `#64748b`                  | `#7b8aa0`                | Contours of controls (toggles, checkboxes, inputs); 3:1 everywhere |
| `--prism-glow`          | `rgba(37, 99, 235, .18)`   | `rgba(37, 99, 235, .12)` | Subtle glow for interactive focus                                  |
| `--prism-glow-strong`   | `rgba(37, 99, 235, .35)`   | `rgba(37, 99, 235, .25)` | Stronger glow                                                      |
| `--prism-input-bg`      | `rgba(148, 163, 184, .08)` | `rgba(15, 23, 42, .04)`  | Background for form inputs in the Controls panel                   |
| `--prism-dot`           | `rgba(96, 165, 250, .16)`  | `rgba(37, 99, 235, .14)` | Canvas dot-grid color                                              |

## Base Tokens (theme-independent)

These tokens are set once and do not change between dark/light mode.

| Property                | Default              | Description                                                                                                                                                      |
| ----------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prism-void-light`    | `#f7f5fc`            | Fixed light canvas background (for explicit `light` canvas mode). Part of every VRT baseline taken on `bg: 'light'`, so it did not change with the 22.7 palette. |
| `--prism-void-dark`     | `#07050f`            | Fixed dark canvas background (for explicit `dark` canvas mode). Unchanged for the same reason.                                                                   |
| `--prism-text-light`    | `#f1f5f9`            | Light text for overlays on dark backgrounds                                                                                                                      |
| `--prism-header-height` | `var(--band-header)` | Alias kept for backward compatibility; see [Band Heights](#band-heights-and-density) below                                                                       |

## Measurement and Stage Tokens

| Property                | Default (dark)                    | Default (light)                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--prism-measure`       | `#f632ff`                         | `#ca00c1`                         | The role for measurements, as opposed to status. Core paints the canvas viewport constraint with it (the edge grips, their guide lines and the dimension line), and the measuring tool uses it for every mark it draws: the measurement line, its end ticks, the dotted snap echo, the floating value label and the pin row's chips below the canvas. Plugins drawing measurement or dimension UI should reach for it rather than picking their own. Note that `.prism-canvas-stage` re-points this token on the two absolute backgrounds (`bg: 'light'` and `bg: 'dark'`), because those grounds do not follow the theme; an override set here still applies everywhere else. |
| `--prism-measure-plate` | _(falls back to `--prism-stage`)_ | _(falls back to `--prism-stage`)_ | The surface the measuring tool's value label paints itself on, so the number reads as a gap in the measurement line rather than a badge on top of it. Unset by default and resolved through `var(--prism-measure-plate, var(--prism-stage))`, because on the four theme-following backgrounds the stage _is_ the ground. `.prism-canvas-stage` re-points it on `bg: 'light'` and `bg: 'dark'` alongside `--prism-measure`. Override it only together with `--prism-measure`; the two are a foreground/background pair, and `semantic-colours.spec.ts` holds them to 4.5:1.                                                                                                     |
| `--prism-stage`         | `#0e1524`                         | `#fafbfd`                         | Background colour of `.prism-canvas-stage`, independent of the variant's `bg` (`dots`/`plain`/`light`/`dark`/etc. paint on top of it). Kept distinct from `--prism-bg-surface`, which surrounds it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `--prism-stage-edge`    | `rgba(255,255,255,0.08)`          | `rgba(15,23,42,0.10)`             | The stage's boundary colour. Applied via `outline` + `box-shadow`, never `border`. A border would shrink the content box by its width and shift where `.demo-wrap` centres, moving every visual-regression baseline the day someone reached for the more obvious property.                                                                                                                                                                                                                                                                                                                                                                                                     |

> **Writing your own colours?** `semantic-colours.spec.ts` holds the defaults to these floors, and a custom theme should match them: every text role 4.5:1 on every surface (`--prism-void`, `--prism-bg`, `--prism-bg-surface`, `--prism-bg-elevated`, `--prism-stage`); status colours 4.5:1 on their own `-bg` tint too; control contours, fills and facet colours 3:1; warning and danger at least ΔE 45 and ΔL\* 14 apart. The lightness gap is the part that is easy to lose: these colours appear at 5–11px, where lightness carries far more of the distinction than hue, and for a reader with deuteranopia it is all that is left.

## Spacing Scale

A 7-step scale used throughout the chrome's own padding, gaps and margins. It applies only to ng-prism's own surfaces, not to your rendered component.

| Property | Value |
| -------- | ----- |
| `--sp-1` | 2px   |
| `--sp-2` | 4px   |
| `--sp-3` | 8px   |
| `--sp-4` | 12px  |
| `--sp-5` | 16px  |
| `--sp-6` | 24px  |
| `--sp-7` | 40px  |

## Band Heights and Density

Four chrome regions size themselves off one shared scalar, `--density`, rather than off individual fixed pixel values:

| Property        | Formula                       | Height at `--density: 1` | Region                                         |
| --------------- | ----------------------------- | ------------------------ | ---------------------------------------------- |
| `--band-header` | `calc(40px * var(--density))` | 40px                     | The top app header                             |
| `--band-head`   | `calc(36px * var(--density))` | 36px                     | The component head (title, status chip, gauge) |
| `--band-rail`   | `calc(28px * var(--density))` | 28px                     | The variant ribbon                             |
| `--band-tabs`   | `calc(34px * var(--density))` | 34px                     | The addon panel's tab bar                      |

### Density

Every band height is expressed as `calc(<px> * var(--density))`. Setting that one custom property rescales the whole chrome. There is no menu behind it; set it through `theme`:

```typescript
export default defineConfig({
    theme: {
        '--density': '0.8' // compact; '1.25' for spacious
    }
});
```

The theme service sets every token, `--density` and the band heights included, as an inline style on `<html>`. A custom property that uses `var()` is resolved on the element that declares it, so the band heights are computed on `<html>`, and only a `--density` on `<html>` changes them. A rule such as `prism-shell { --density: 0.8 }` has no effect, and a stylesheet rule on `html` loses against the inline style.

`--density` defaults to `1` and is set on `PRISM_BASE_TOKENS`, so it is the same in both dark and light theme and is not something `darkTheme`/`lightTheme` need to repeat.

## Typography

| Property            | Default                                     | Description                                       |
| ------------------- | ------------------------------------------- | ------------------------------------------------- |
| `--font-sans`       | `'Inter', system-ui, sans-serif`            | Base sans-serif font stack                        |
| `--font-mono`       | `'JetBrains Mono', ui-monospace, monospace` | Base monospace font stack                         |
| `--prism-font-sans` | `var(--font-sans)`                          | Sans-serif font stack (UI chrome)                 |
| `--prism-font-mono` | `var(--font-mono)`                          | Monospace font stack (code snippets, JSON editor) |

## Font Sizes

| Property   | Size   |
| ---------- | ------ |
| `--fs-xs`  | 10px   |
| `--fs-sm`  | 11.5px |
| `--fs-md`  | 12.5px |
| `--fs-lg`  | 13.5px |
| `--fs-xl`  | 15px   |
| `--fs-2xl` | 22px   |

## Border Radius

| Property      | Size |
| ------------- | ---- |
| `--radius-xs` | 3px  |
| `--radius-sm` | 5px  |
| `--radius-md` | 7px  |
| `--radius-lg` | 10px |

## Timing

| Property         | Value                          |
| ---------------- | ------------------------------ |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--dur-fast`     | 0.12s                          |
| `--dur-base`     | 0.2s                           |
| `--dur-slow`     | 0.3s                           |

## Dark and Light Themes

ng-prism ships with a dark theme by default. A light theme variant is also available through the theme toggle button in the header toolbar. The header itself stays a navy band in both (see [Theme-Specific Overrides](#theme-specific-overrides)). The choice is stored in `localStorage` (`ng-prism-theme`) and set as `data-theme` on `<html>`.

The light theme maps the same custom properties to lighter values. Your `theme` overrides apply to both; use `darkTheme` or `lightTheme` for overrides that apply to one of them only.

## Scoping

Because the showcase renders without an iframe, your library's styles and ng-prism's chrome share one document. The chrome's component styles use Angular's default emulated encapsulation, so their selectors do not match elements of your component.

The theme tokens are not scoped. The theme service sets them as inline custom properties on `<html>`, next to the `data-theme` attribute, so every element in the document inherits them, your rendered component included. That only matters where your styles read a custom property of the same name. Most tokens carry the `--prism-` prefix, but the base tokens `--font-sans`, `--font-mono`, `--fs-*`, `--sp-*`, `--radius-*`, `--ease-default`, `--dur-*`, `--density` and `--band-*` do not. If your library declares one of these names on `:root` or `html`, ng-prism's inline value wins inside the styleguide; declared on your component's host or below it, yours wins.
