# @ng-prism/plugin-jsdoc

API documentation plugin for [@ng-prism/core](https://github.com/alexander-spies/ng-prism). Extracts JSDoc comments from component source code at build time and renders an interactive API panel.

> **Full documentation:** [ng-prism Docs: JSDoc Plugin](https://alexander-spies.github.io/ng-prism/#/plugins/jsdoc)

## Installation

```bash
npm install @ng-prism/plugin-jsdoc
```

### Peer Dependencies

| Package           | Version    |
| ----------------- | ---------- |
| `@ng-prism/core`  | `>=21.0.0` |
| `@angular/core`   | `>=20.0.0` |
| `typescript`      | `>=5.5.0`  |
| `highlight.js`    | `>=11.0.0` |
| `ngx-highlightjs` | `>=14.0.0` |

## Setup

```typescript
// ng-prism.config.ts
import { defineConfig } from '@ng-prism/core/config';
import { jsDocPlugin } from '@ng-prism/plugin-jsdoc';

export default defineConfig({
    plugins: [jsDocPlugin()]
});
```

## What It Does

- Extracts class-level JSDoc description
- Extracts per-input and per-output JSDoc comments
- Renders an **API** panel with:
    - Component description
    - Inputs table (name, type, default, description)
    - Outputs table (name, description)
    - Supported tags: `@deprecated`, `@since`, `@see`, `@example`

## Markdown Support

JSDoc descriptions are rendered as Markdown:

- Headings (`#`, `##`, `###`)
- Lists (ordered/unordered) and inline code (`` `code` ``)
- Bold (`**text**`), italic (`*text*`), and links (`[text](url)`)
- Fenced code blocks with a language hint (` ```html `, ` ```scss `, ...)

Class descriptions are rendered as block Markdown; input/output/method descriptions are
rendered inline (no wrapping `<p>`). Existing plain-text descriptions keep working
unchanged, since plain text is valid Markdown.

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
 * <sgui-loading size="small" color="light" />
 * ```
 */
````

`@example` blocks accept a fenced code block with a language hint. The language is
passed through to `ngx-highlightjs` (`html`, `scss`, `typescript`, ...). Examples without
fences fall back to `typescript` for backwards compatibility. Make sure the languages
you reference are registered with `highlight.js` in your app. `highlight.js`'s core
language set is loaded by default, but additional languages must be registered
explicitly by the consumer.

## Example

```typescript
/**
 * A configurable button for primary user actions.
 *
 * @since 2.0.0
 * @see https://design-system.example.com/button
 */
@Showcase({ title: 'Button', category: 'Atoms' })
@Component({ selector: 'my-button', ... })
export class ButtonComponent {
  /** Visual style variant of the button. */
  variant = input<'primary' | 'secondary'>('primary');

  /** Emitted when the button is clicked. */
  clicked = output<void>();
}
```

The API panel shows the class description, a table of inputs with their types and JSDoc, and all supported tags.

## How It Works

**Build time:** The `onComponentScanned` hook uses `ts.createSourceFile` with `setParentNodes: true` and `ts.getJSDocTags()` to extract JSDoc data. The extracted data is injected into `showcaseConfig.meta.jsdoc`.

**Runtime:** The `JsDocPanelComponent` reads the metadata and renders the documentation. The component is lazy-loaded via `loadComponent`.

## License

MIT
