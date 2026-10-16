# JSDoc Plugin

`@ng-prism/plugin-jsdoc` extracts JSDoc comments from your component source files at build time and renders them as an API documentation panel in the showcase.

## What It Does

- Reads the JSDoc block above the component class and displays the class description
- Extracts `@deprecated`, `@since`, `@see`, and `@example` tags
- Renders tables for `@Input` / `@Output` documentation pulled from individual property JSDoc
- Renders descriptions and examples as **Markdown** (since `21.13.0`)
- Works purely at build time, with no runtime parsing of TypeScript source

## Install

```bash
ng add @ng-prism/plugin-jsdoc
```

This installs the package and registers `jsDocPlugin()` in your `ng-prism.config.ts` automatically. To install manually: `npm install @ng-prism/plugin-jsdoc` and add it to your config as shown below.

## Configuration

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
    plugins: [jsDocPlugin()]
});
```

The plugin adds a **Docs** tab to the addon panel for every component that has JSDoc comments.

## Supported Tags

| Tag                               | Rendering                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `@description` (or block comment) | Rendered as block Markdown above the API table                                    |
| `@deprecated`                     | Shown as a warning banner with the deprecation message                            |
| `@since`                          | Displayed as a version badge                                                      |
| `@see`                            | Rendered as a link list                                                           |
| `@example`                        | Code block with syntax highlighting (language detected from the fence, see below) |

## Component-Level JSDoc

```typescript
/**
 * The primary action button. Supports primary, secondary, and danger variants.
 *
 * @since 1.0.0
 * @deprecated Use `IconButtonComponent` for icon-only actions.
 * @see https://design.example.com/buttons
 * @example
 * <lib-button label="Save" variant="primary" />
 */
@Showcase({ title: 'Button' })
@Component({ ... })
export class ButtonComponent { ... }
```

## Input/Output Documentation

JSDoc on individual `input()` and `output()` signal declarations is extracted into the Inputs and Outputs tables:

```typescript
export class ButtonComponent {
    /** Text displayed inside the button. */
    label = input.required<string>();

    /** Visual style variant. */
    variant = input<'primary' | 'secondary' | 'danger'>('primary');

    /** Emitted when the button is clicked. */
    clicked = output<MouseEvent>();
}
```

The panel renders two tables (one for inputs, one for outputs) with columns for name, type, default value, and description.

Inputs, outputs and methods a component inherits from a base class are documented the same way. The plugin reads their JSDoc from the base classes the scanner found, so `@deprecated` and `@since` on an inherited input show up in the table as well. A member the component redeclares with a JSDoc comment of its own takes its tags from that comment, even if it has none; a redeclaration or override without JSDoc keeps the documentation of the base class, as it does in TypeScript.

## Class Description

The text before any tags in the JSDoc block is shown as the class description and rendered as Markdown.

```typescript
/**
 * Renders a status badge with configurable color and label.
 *
 * Use inside list items, table cells, and card headers.
 * Avoid using in body text; prefer inline `<strong>` elements.
 */
```

## Markdown Support

Class descriptions are rendered as block Markdown; input/output/method descriptions
are rendered inline (no wrapping `<p>`). Plain-text descriptions keep working unchanged, since
plain text is valid Markdown.

Supported syntax:

- Headings (`#`, `##`, `###`)
- Ordered and unordered lists
- Inline code (`` `code` ``), bold (`**text**`), italic (`*text*`)
- Links (`[text](url)`)
- Fenced code blocks with a language hint (` ```html `, ` ```scss `, ...)

````typescript
/**
 * Loading spinner component.
 *
 * ## Size
 *
 * - `small` (4px): inline indicators
 * - `large` (9px, default): section-level loading
 *
 * @example
 * ```html
 * <lib-loading size="small" color="light" />
 * ```
 */
````

### Code Fences in `@example`

`@example` blocks may start and end with a fenced code block. The language tag after the
opening backticks (e.g. ` ```html `) is passed to `ngx-highlightjs`. Examples without a
fence fall back to `typescript` for backwards compatibility:

````typescript
/**
 * @example
 * ```html
 * <lib-button label="Save" variant="filled" />
 * ```
 * @example
 * <lib-button label="Save" />  // no fence, highlighted as typescript
 */
````

Make sure the languages you reference are registered with `highlight.js` in your
application. Core languages ship by default; additional languages must be registered
explicitly in your consumer setup.

> **Security:** descriptions are bypassed past Angular's sanitizer because the source is
> component-author JSDoc compiled at build time, not user input. Do not put untrusted
> content into JSDoc comments.
