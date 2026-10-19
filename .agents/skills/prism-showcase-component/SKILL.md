---
name: prism-showcase-component
description: Annotates an Angular component with the @Showcase decorator for ng-prism discovery. Triggers on "add showcase", "showcase this", "make showcaseable", "annotate component".
---

# @Showcase Decorator — Annotation Guide

Add `@Showcase` to Angular components to make them discoverable by ng-prism.

## Basic Usage

```typescript
import { Showcase } from '@ng-prism/core';

@Showcase({
  title: 'Button',
  category: 'Inputs',
})
@Component({ ... })
export class ButtonComponent { }
```

## Full Configuration

```typescript
@Showcase({
  // Required
  title: 'Button',

  // Optional — grouping in sidebar
  category: 'Inputs',

  // Optional — Markdown supported
  description: 'A versatile button component with multiple variants.',

  // Optional — search/filter tags
  tags: ['form', 'action', 'interactive'],

  // Optional — predefined demo tabs
  variants: [
    {
      name: 'Primary',
      inputs: { variant: 'primary', label: 'Click me' },
      description: 'Default primary button',
    },
    {
      name: 'Danger',
      inputs: { variant: 'danger', label: 'Delete', disabled: false },
    },
  ],

  // Optional — named pseudo states, combined with every variant
  states: [{ name: 'Hover', pseudo: { hover: '.btn' } }],
})
```

## ShowcaseConfig Interface

Source of truth: `packages/ng-prism/src/decorator/showcase.types.ts`. The
interface is generic over the component type, which is what makes `inputs`
type-checked against the component's own signals.

```typescript
interface ShowcaseConfig<T = unknown> {
    title: string; // Required. Display name in the UI
    description?: string; // Markdown supported
    category?: string; // Sidebar grouping
    categoryOrder?: number; // Category position (lower = higher)
    componentOrder?: number; // Position within the category
    section?: string; // Top-level sidebar section. Auto-detected:
    // @Directive -> 'Directives', else 'Components'.
    // Any free-form string creates a new section.
    sectionOrder?: number; // Section position. Defaults: Components 0,
    // Directives 10, everything else 100
    variants?: Variant<T>[]; // Predefined demo tabs
    states?: ShowcaseState[]; // Named pseudo states, combined with every
    // variant. Order = index. Not with renderPage
    tags?: string[]; // Search/filter tags
    providers?: Provider[]; // @deprecated since 22.4.0, dropped by the build
    meta?: Record<string, unknown>; // Arbitrary plugin metadata
    bg?: CanvasBg; // Recommended canvas background
    canvasLayout?: CanvasLayout; // Canvas layout for this component
    host?: string | DirectiveHost; // Host element for directives
    renderPage?: string; // Render a styleguide page instead
    status?: ComponentStatus; // 'stable' | 'beta' | 'wip' | 'deprecated'
}

interface ShowcaseState {
    name: string; // Overview column title, tools menu chip. Unique
    pseudo: ForcedPseudoStates; // Same shape as Variant.pseudo
}

interface Variant<T = unknown> {
    name: string; // Tab label
    inputs?: Partial<InputsOf<T>>; // input() signal values, type-checked
    content?: string | Record<string, string>; // Projected content (ng-content)
    description?: string; // Variant description
    meta?: Record<string, unknown>; // Arbitrary plugin metadata
    bg?: CanvasBg; // Overrides the component's bg
    canvasLayout?: CanvasLayout; // Overrides the component's layout
    pseudo?: ForcedPseudoStates; // Forced states, e.g. { hover: true }
    states?: false; // Keeps the variant out of every component state
}
```

## Rules

- `@Showcase` must come before `@Component` in decorator order
- `title` is the only required field
- `providers` is deprecated (22.4.0, removed in 23.0.0) and never reaches the
  styleguide: the build drops it with a warning. Put providers in
  `defineConfig({ appProviders })`, or for one component in a component page
  (`renderPage`)
- `variants.inputs` keys must match the component's `input()` member names
- A hover, pressed or focus condition that applies to several variants is a `states` entry, not a variant per
  variant. A picture that belongs to one variant (its own inputs plus a forced state) stays `Variant.pseudo`, which
  is not deprecated and has no fit rule. A state is forced only where its targets are reachable: when they are not,
  the combination does not fit and says why (`<target> matches nothing`, `is disabled`, `is inert` or
  `has pointer-events: none`). A state's position in the list is its index in the URL, the render marker, the
  manifest and the VRT report, so append new states at the end
- The component must be exported from the library's entry file to be discovered.
  Which file that is comes from the builder's `entryPoint` option — commonly
  `public-api.ts` or `index.ts`, not a fixed name.

## Scanner Compatibility

The scanner evaluates the config statically via the TypeScript Compiler API:

- Literals, `const` declarations (also imported from other files), enum members,
  arithmetic on them and spreads of such constants are resolved
- Function calls and `let` references cannot be evaluated: the value is dropped
  and the build prints a warning naming the reference and its location.
  `defineConfig({ strictShowcase: true })` turns those warnings into a build error

```typescript
// Resolved — constants and enum members
const MB = 1024 * 1024;
@Showcase({
  title: 'Upload',
  variants: [{ name: 'Large', inputs: { maxFileSize: 5 * MB, size: Size.Medium } }],
})

// Dropped with a warning — a function call
@Showcase({
  title: 'Upload',
  variants: [{ name: 'Large', inputs: { maxFileSize: megabytes(5) } }],
})
```

## Checklist

- [ ] `title` is set
- [ ] `category` groups the component logically
- [ ] `variants` cover the main use cases
- [ ] `variants.inputs` keys match the actual `input()` member names
- [ ] States shared by several variants are in `states`, with unique names and a stable order; `pseudo` stays on a variant only for a one-off picture
- [ ] Config values are statically evaluable (literals, `const`, enum members; no function calls, no `let`)
- [ ] Component is exported from the library's entry file (`entryPoint`)
