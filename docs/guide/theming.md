# Theming

ng-prism uses CSS custom properties for all visual styling. Override any property via `defineConfig({ theme })` or a custom stylesheet.

## Quick Override

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';

export default defineConfig({
    theme: {
        '--prism-primary': '#0ea5e9',
        '--prism-primary-from': '#0ea5e9',
        '--prism-primary-to': '#6366f1',
        '--prism-bg': '#0f172a',
        '--prism-font-sans': '"Inter", system-ui, sans-serif'
    }
});
```

Values in `theme` are merged on top of the built-in defaults. You only need to specify the properties you want to change.

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
        '--prism-bg': '#ffffff',
        '--prism-bg-surface': '#f5f6f7'
    }
});
```

**Merge order:** `built-in defaults → darkTheme/lightTheme → theme`. The `theme` property always wins when the same key appears in both.

## Custom Stylesheet

> **Deprecated since 22.6.0, removed in 23.0.0.** `themeStylesheet` was meant to load a stylesheet of your own into the styleguide app. Nothing has ever loaded it, so setting it never had an effect, and the build prints a notice while it is set. Colours, fonts and density go through the tokens above.

## Color Properties

| Property               | Default (dark) | Default (light) | Description                                    |
| ---------------------- | -------------- | --------------- | ---------------------------------------------- |
| `--prism-primary`      | `#a78bfa`      | `#7c3aed`       | Accent color for interactive elements          |
| `--prism-primary-from` | `#7c3aed`      | `#7c3aed`       | Gradient start for primary UI elements         |
| `--prism-primary-to`   | `#3b82f6`      | `#3b82f6`       | Gradient end for primary UI elements           |
| `--prism-accent`       | `#ec4899`      | `#db2777`       | Secondary accent / highlights                  |
| `--prism-bg`           | `#0d0b1c`      | `#ffffff`       | Main background                                |
| `--prism-bg-surface`   | `#131022`      | `#faf9fd`       | Elevated surface (panels, cards)               |
| `--prism-bg-elevated`  | `#1a1535`      | `#ffffff`       | Further elevated surface (dropdowns, tooltips) |
| `--prism-void`         | `#07050f`      | `#f7f5fc`       | Deepest background (canvas backdrop)           |

## Text Properties

| Property             | Default (dark) | Default (light) | Description              |
| -------------------- | -------------- | --------------- | ------------------------ |
| `--prism-text`       | `#ede9f8`      | `#1c1530`       | Primary text             |
| `--prism-text-2`     | `#b0a6c8`      | `#4d4266`       | Secondary text           |
| `--prism-text-muted` | `#8476a2`      | `#6b5e80`       | Muted / placeholder text |
| `--prism-text-ghost` | `#6a5d87`      | `#b0a6c8`       | Disabled / ghost text    |

## Status Colors

| Property          | Default (dark) | Default (light) | Description          |
| ----------------- | -------------- | --------------- | -------------------- |
| `--prism-success` | `#34d399`      | `#047857`       | Success state        |
| `--prism-warn`    | `#fbbf24`      | `#8f6b00`       | Warning state        |
| `--prism-danger`  | `#f87171`      | `#951226`       | Danger / error state |

## Code Syntax Colors

| Property            | Default (dark) | Default (light) | Description                |
| ------------------- | -------------- | --------------- | -------------------------- |
| `--prism-code-tag`  | `#f472b6`      | `#be185d`       | HTML/XML tag names         |
| `--prism-code-attr` | `#60a5fa`      | `#1d4ed8`       | Attribute names, JSON keys |
| `--prism-code-str`  | `#86efac`      | `#047857`       | String values              |
| `--prism-code-com`  | `#6a5d87`      | `#6b5e80`       | Comments                   |

## Border & Glow Properties

| Property                | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `--prism-border`        | Default border color                             |
| `--prism-border-strong` | Emphasized border (focus rings, active state)    |
| `--prism-glow`          | Subtle glow for interactive focus                |
| `--prism-glow-strong`   | Stronger glow for primary focus rings            |
| `--prism-input-bg`      | Background for form inputs in the Controls panel |
| `--prism-dot`           | Canvas dot-grid color                            |

## Base Tokens (theme-independent)

These tokens are set once and do not change between dark/light mode.

| Property                | Default              | Description                                                                                |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `--prism-void-light`    | `#f7f5fc`            | Fixed light canvas background (for explicit `light` canvas mode)                           |
| `--prism-void-dark`     | `#07050f`            | Fixed dark canvas background (for explicit `dark` canvas mode)                             |
| `--prism-text-light`    | `#ede9f8`            | Light text for overlays on dark backgrounds                                                |
| `--prism-header-height` | `var(--band-header)` | Alias kept for backward compatibility; see [Band Heights](#band-heights-and-density) below |

## Marks, Measurement and Stage Tokens

Introduced alongside the panel-tab and canvas-tool redesign. These are additive, not replacements for anything above.

| Property                 | Default (dark)                                                                               | Default (light)                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prism-mark-nominal`   | `#34d399`                                                                                    | `#047857`                         | Green role for a value inside its thresholds. Same consumers as `--prism-mark-attention`, `ok` variant. Used where the element renders anyway (status chip, header badge, gauge chip, readout row), never to add an element that would otherwise not be there.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `--prism-mark-attention` | `#e8a33d`                                                                                    | `#8f6b00`                         | Amber role for a value past its warning threshold. Used by the sidebar's health dot, `PrismMetricBadgeComponent`'s `warn` variant, the component head's status chip, the head gauge, and `PrismStatComponent`'s `warn` dot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `--prism-mark-critical`  | `#e5484d`                                                                                    | `#951226`                         | Red role for a value past its critical threshold. Same consumers as `--prism-mark-attention`, `danger`/`critical` variant.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `--prism-measure`        | `#f632ff`                                                                                    | `#ca00c1`                         | The role for measurements, as opposed to status. Core paints the canvas viewport constraint with it (the edge grips, their guide lines, the dimension line and the rail's width readout), and the measuring tool uses it for every mark it draws: the measurement line, its end ticks, the dotted snap echo, the floating value label and the pin row's chips below the canvas. Plugins drawing measurement or dimension UI should reach for it rather than picking their own. Note that `.prism-canvas-stage` re-points this token on the two absolute backgrounds (`bg: 'light'` and `bg: 'dark'`), because those grounds do not follow the theme; an override set here still applies everywhere else. |
| `--prism-measure-plate`  | _(falls back to `--prism-stage`)_                                                            | _(falls back to `--prism-stage`)_ | The surface the measuring tool's value label paints itself on, so the number reads as a gap in the measurement line rather than a badge on top of it. Unset by default and resolved through `var(--prism-measure-plate, var(--prism-stage))`, because on the four theme-following backgrounds the stage _is_ the ground. `.prism-canvas-stage` re-points it on `bg: 'light'` and `bg: 'dark'` alongside `--prism-measure`: those grounds are absolute and `--prism-stage` is not, so the pair would otherwise fall to roughly 2:1 on both. Override it only together with `--prism-measure`; the two are a foreground/background pair, and `semantic-colours.spec.ts` holds them to 4.5:1.               |
| `--prism-stage`          | `#16122b`                                                                                    | `#ffffff`                         | Background colour of `.prism-canvas-stage`, independent of the variant's `bg` (`dots`/`plain`/`light`/`dark`/etc. paint on top of it).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--prism-stage-edge`     | `rgba(255,255,255,0.10)`                                                                     | `rgba(28,21,48,0.14)`             | The stage's boundary colour. Applied via `outline` + `box-shadow`, never `border`. A border would shrink the content box by its width and shift where `.demo-wrap` centres, moving every visual-regression baseline the day someone reached for the more obvious property.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `--prism-spectrum`       | `linear-gradient(90deg, var(--prism-accent), var(--prism-primary), var(--prism-primary-to))` | same shape, light-theme colours   | The gradient the variant ribbon reads a per-tab slice from (via `--i`/`--n` custom properties on each tab) so each variant's underline shows _where it sits in the sequence_ rather than an arbitrary per-index hue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

> **Writing your own semantic colours?** Two floors are enforced by
> `semantic-colours.spec.ts` and worth matching in a custom theme: each colour
> needs at least **4.5:1** against `--prism-bg`, and the warning/error pair needs
> at least **ΔE 45** and **ΔL\* 14** between them. The lightness gap is the part
> that is easy to lose: these colours appear at 5–11px, where lightness carries
> far more of the distinction than hue, and for a reader with deuteranopia it is
> all that is left. The light theme originally shipped a pair only ΔL\* 3 apart
> and they read as one colour.

Why `--prism-mark-*` and not the older `--prism-success`/`--prism-warn`/`--prism-danger`: the two families are not redundant. `--prism-success`/`--prism-warn`/`--prism-danger` remain in use for surfaces that need a positive "all clear" colour (green). `--prism-mark-*` originally had no nominal-good colour at all, so that chrome reporting _deviation_ drew nothing when there was none. That now holds only where an element would otherwise not exist: the sidebar still renders no mark for a clean component, because `decorateItem` returns `null` and green rows for every healthy component are the same wallpaper problem in another hue. Where the element renders regardless (the status chip, the header badges, the gauge chip and its readout rows), `ok` is drawn in `--prism-mark-nominal`, so success, warning and error form one explicit three-step coding instead of leaving "fine" indistinguishable from "not measured".

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

ng-prism ships with a dark theme by default. A light theme variant is also available through the theme toggle button in the header toolbar. The choice is stored in `localStorage` (`ng-prism-theme`) and set as `data-theme` on `<html>`.

The light theme maps the same custom properties to lighter values. Your `theme` overrides apply to both; use `darkTheme` or `lightTheme` for overrides that apply to one of them only.

## Scoping

Because the showcase renders without an iframe, your library's styles and ng-prism's chrome share one document. The chrome's component styles use Angular's default emulated encapsulation, so their selectors do not match elements of your component.

The theme tokens are not scoped. The theme service sets them as inline custom properties on `<html>`, next to the `data-theme` attribute, so every element in the document inherits them, your rendered component included. That only matters where your styles read a custom property of the same name. Most tokens carry the `--prism-` prefix, but the base tokens `--font-sans`, `--font-mono`, `--fs-*`, `--sp-*`, `--radius-*`, `--ease-default`, `--dur-*`, `--density` and `--band-*` do not. If your library declares one of these names on `:root` or `html`, ng-prism's inline value wins inside the styleguide; declared on your component's host or below it, yours wins.
