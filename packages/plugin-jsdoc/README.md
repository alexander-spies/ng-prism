# @ng-prism/plugin-jsdoc

API documentation plugin for [@ng-prism/core](https://github.com/ng-prism/ng-prism). Extracts JSDoc comments from component source code at build time and renders an interactive API panel.

> **Full documentation:** [ng-prism Docs: JSDoc Plugin](https://ng-prism.github.io/ng-prism/#/plugins/jsdoc)

## Installation

```bash
npm install @ng-prism/plugin-jsdoc
```

### Peer Dependencies

| Package                      | Version               |
| ---------------------------- | --------------------- |
| `@ng-prism/core`             | `^<plugin version>-0` |
| `@angular/common`            | `>=20.0.0`            |
| `@angular/core`              | `>=20.0.0`            |
| `@angular/platform-browser`  | `>=20.0.0`            |
| `@angular-devkit/schematics` | `>=20.0.0`            |
| `typescript`                 | `>=5.5.0`             |
| `highlight.js`               | `>=11.0.0`            |
| `ngx-highlightjs`            | `>=14.0.0`            |

Each release requires the `@ng-prism/core` of its own version (`^22.7.0-0` for 22.7.0), so keep the core and the plugin on the same version.

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
- Draws the API page of every component and directive with `@Showcase`, the same page a service or a pipe gets (since 22.7.0): a generated usage snippet, the examples, the inputs with their types linked to type cards, the outputs with their payload, the documented methods, the types they reach and an "On this page" list. `{@link}` and `@see` jump to a type card, and `@deprecated`, `@since` and `@example` are supported, see [Components and Directives](https://ng-prism.github.io/ng-prism/#/plugins/jsdoc?id=components-and-directives)
- Draws the API page of every service with `@Showcase` (since 22.7.0): its properties, methods and setup, a generated usage snippet and the types it reaches, see [Services](https://ng-prism.github.io/ng-prism/#/plugins/jsdoc?id=services)
- Draws the API page of every pipe with `@Showcase` (since 22.7.0): the template name, purity, every `transform()` signature and setup, a generated usage snippet and the types it reaches, see [Pipes](https://ng-prism.github.io/ng-prism/#/plugins/jsdoc?id=pipes)

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

The API tab shows the class description, a usage snippet, the inputs with their types, defaults and JSDoc, and all supported tags.

## How It Works

**Build time:** The plugin sets `componentApi: true`, which has the core scanner read `ScannedComponent.api` for every component; a config without a plugin that sets it skips that work. The `onComponentScanned` hook uses `ts.createSourceFile` with `setParentNodes: true` and `ts.getJSDocTags()` to extract JSDoc data, keeping each parsed file while its mtime and size stay the same, so a rebuild of `serve` only parses the files that changed. The extracted data is injected into `showcaseConfig.meta.jsdoc`.

**Runtime:** The `JsDocPanelComponent` is lazy-loaded via `loadComponent`. It builds the API page from `ScannedComponent.api`, which the core scanner fills with the types, payloads, methods and links, and from the JSDoc data in `showcaseConfig.meta.jsdoc`, and renders it. Services and pipes get the same page from their own scanned data.

## License

MIT
