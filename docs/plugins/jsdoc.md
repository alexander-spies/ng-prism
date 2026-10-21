# JSDoc Plugin

`@ng-prism/plugin-jsdoc` extracts JSDoc comments from your component source files at build time and renders them as an API documentation panel in the showcase.

## What It Does

- Reads the JSDoc block above the component class and displays the class description
- Extracts `@deprecated`, `@since`, `@see`, and `@example` tags
- Renders tables for `@Input` / `@Output` documentation pulled from individual property JSDoc
- Renders descriptions and examples as **Markdown** (since `21.13.0`)
- Draws the page of every [service](guide/showcasing-services.md) and [pipe](guide/showcasing-pipes.md) with `@Showcase`: its API, a generated usage snippet and the types it reaches (since `22.7.0`)
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

The plugin adds an **API** tab to the view tabs of every component that has JSDoc comments, and the same tab is the whole page of a [service](#services) or a [pipe](#pipes).

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

The panel renders two tables (one for inputs, one for outputs) with columns for name, type, default value, and description. An input or output declared with an `alias` is listed under its alias, the name a template uses.

Inputs, outputs and methods a component inherits from a base class are documented the same way. The plugin reads their JSDoc from the base classes the scanner found, so `@deprecated` and `@since` on an inherited input show up in the table as well. A member the component redeclares with a JSDoc comment of its own takes its tags from that comment, even if it has none; a redeclaration or override without JSDoc keeps the documentation of the base class, as it does in TypeScript.

## Services

A class with `@Showcase` and `@Injectable` or `@Service` gets a page of its own under **Services** in the sidebar. The plugin draws it, which is why a service shows up at all only when `jsDocPlugin()` from 22.7.0 or newer is in the config: the page is a view panel of this plugin that applies to services. Without it, the build leaves services out and prints this once:

```
ng-prism: 2 service(s) with @Showcase found, but no plugin shows services; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.
```

The page reads the same JSDoc comments in your source as a component's tab, with these differences:

- **Methods are listed with or without JSDoc.** A component's tab only lists methods that have a doc block. For a service the signature is information on its own, so every public method is there, and so is every public property, typed from the annotation or inferred (`Signal<boolean>`).
- **Signatures come from the code,** not from `@param` and `@returns`. `@param name text` adds the description of a parameter, shown under it, and nothing else is needed for the types. A `@returns` text is not shown. On a constructor, `@param` describes its parameter properties (`constructor(readonly id: number)`), which are listed as properties.
- **`@see` shows as a chip,** a `See:` chip on the class and on each type card that has one.
- **Defaults come from `@default`.** The option tables of setup functions and interfaces show a **Default** column filled from `@default` on each property. Prose such as "Defaults to `'bottom-right'`." is not read.
- **`@internal` hides** a member or a type from the page.
- **Overrides inherit.** An override without a doc block of its own takes description, tags and `@param` texts from the nearest base class member that has them. A line comment between a doc block and the member (`// eslint-disable-next-line`) keeps the block attached.

```typescript
/** App-wide defaults, set once with `provideNotifications()`. */
export interface NotificationConfig {
    /**
     * Where the notifications stack.
     * @default 'bottom-right'
     */
    position?: NotificationPosition;
}
```

The page is made of the sections Usage, Setup, Examples, Properties, Methods and Types, in this order, with an "On this page" list next to it; a section without content is left out. What is read, how `setup` and the usage snippet work and what the page leaves out is in [Showcasing Services](guide/showcasing-services.md).

> The data behind the page (`ScannedService.api`) is experimental until 23.0.0. A plugin that reads it directly should expect it to change in a 22.x minor, see [`ScannedService`](api/types.md#scannedservice).

## Pipes

A class with `@Showcase` and `@Pipe` gets a page of its own under **Pipes** in the sidebar, drawn by the same view panel, which applies to components, services and pipes. As for services, a pipe only shows up when `jsDocPlugin()` from 22.7.0 or newer is in the config. Without it, the build leaves pipes out and prints this once:

```
ng-prism: 2 pipe(s) with @Showcase found, but no plugin shows pipes; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.
```

The page looks like the one of a service and reads the same JSDoc, with these differences:

- **Meta chips:** `Pipe: <name>` (what a template calls it), `Pure` or `Impure` (left out when the purity cannot be read), then `Since` and `Entry point`.
- **Usage** shows the imports, the `providers` entries of its `setup`, the component's `imports` entry and a template line such as `{{ value | timeAgo }}`, with the pipe's required arguments after the value.
- **Transform** replaces Properties and Methods: one row per `transform()` signature, with its parameters, return type and description. Every overload is listed with its own parameters, and the implementation signature is left out when there are overloads. An overload without a doc block takes the one of the implementation, then of the first documented overload (its description and `@param` texts, not its tags), then of a base class.
- **Nothing else of the class** is listed: properties and other methods do not appear, and add no type cards.

The page is made of the sections Usage, Setup, Examples, Transform and Types, in this order, with an "On this page" list; a section without content is left out. See [Showcasing Pipes](guide/showcasing-pipes.md).

> The data behind the page (`ScannedPipe.api`) is experimental until 23.0.0, see [`ScannedPipe`](api/types.md#scannedpipe).

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
