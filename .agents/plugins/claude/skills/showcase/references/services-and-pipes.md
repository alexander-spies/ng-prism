# Showcasing services and pipes

How to write `@Showcase` on a service or a pipe (rules 11 and 12 of the skill). Both get a page without a canvas,
drawn by `jsDocPlugin()` from the code and its JSDoc.

## Showcasing a service

````ts
import { computed, Injectable, signal } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { NotificationOptions } from './notification.model';
import { NotificationRef } from './notification-ref';
import { provideNotifications } from './provide-notifications';

/**
 * Shows short messages in an overlay at the edge of the viewport, stacked newest first.
 *
 * @since 1.4.0
 * @example
 * ```ts
 * private readonly notifications = inject(NotificationService);
 * ```
 */
@Showcase({
    title: 'Notification Service',
    category: 'Feedback',
    setup: () => [provideNotifications]
})
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly open = signal<readonly NotificationRef[]>([]);

    /** How many notifications are open right now. */
    readonly count = computed(() => this.open().length);

    /**
     * Opens a notification. It closes by itself after its duration.
     * @param options What the notification shows and how long it stays.
     * @returns A handle to close this notification early.
     */
    show(options: NotificationOptions): NotificationRef {
        /* … */
    }
}
````

```ts
/** App-wide defaults, set once with `provideNotifications()`. */
export interface NotificationConfig {
    /**
     * Where the notifications stack.
     * @default 'bottom-right'
     */
    position?: NotificationPosition;
}
```

- **The JSDoc plugin draws the page.** Without `jsDocPlugin()` in `ng-prism.config.ts` (skill setup) the build only counts
  the services, without reading them, leaves them out of the manifest and logs, once per build or `serve` run, through
  the normal log and not as a warning:
  `ng-prism: <n> service(s) with @Showcase found, but no plugin shows services; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.`
  Add the plugin, or update `@ng-prism/plugin-jsdoc` to 22.7.0 or newer if it is already there; don't touch the
  services. `strictShowcase` doesn't fail over this hint, and since the services aren't read, their `setup` warnings
  only show up once the plugin is there.
- **Fields.** A service takes `title` (required), `description`, `category`, `categoryOrder`, `componentOrder`,
  `section` (default `Services`), `sectionOrder`, `tags`, `status`, `meta` and `setup`. `variants`, `states`,
  `providers`, `bg`, `canvasLayout`, `host`, `imports` and `renderPage` need a canvas. **Until 23.0.0 one of them keeps an
  `@Injectable` class a component** (deprecated since 22.7.0, removed in 23.0.0), with a notice that does not count for `strictShowcase`:
  `<Class> is an @Injectable/@Service with @Showcase and declares <fields>, so it is still treated as a component. From 23.0.0 it will be shown as a service and these fields will be dropped; remove them, or move the page to a componentPage.`
  To make it a service, remove those fields and move the demo to a component page.
- **`setup` lists what configures the service**: provider functions and `InjectionToken` constants, e.g.
  `setup: () => [provideNotifications, NOTIFICATION_CONFIG]`. It is an arrow function on purpose: a direct list would
  read a `const` of a file that imports the service back, and `@Showcase(...)` runs when the class is defined (a
  `ReferenceError` in any library build that isn't stripped). The builder never calls it; it reads the array literal.
  So: an arrow function whose body is an array literal (or a block with one `return`), written in the `@Showcase({ … })`
  object itself, not behind a spread or a constant, without `as const`, a spread, a condition or a call. Each entry is
  a function declaration, a `const` arrow or function, or a `const` of type `InjectionToken`, exported from a scanned
  entry point. Anything else is dropped with a warning that counts for `strictShowcase`, and `setup` on a component
  or directive too.
- **The page is the code plus the JSDoc.** Every public property, getter and method is listed with its type, JSDoc or
  not (a component's API tab skips undocumented methods; a service page doesn't), and so is every constructor
  parameter property (`constructor(readonly id: number)`), described by the constructor's `@param`. Left out:
  `private`, `protected`, `#x`, `_x`, lifecycle hooks, the constructor itself, statics and `@internal`. Write JSDoc
  for what the types can't say: the class description (Markdown), `@since`, `@deprecated`, `@example` (a fenced
  block), `@param name text` on methods and setup functions (shown under each parameter), `@see` (a chip on the class
  and on type cards, a jump to the card of the type it names, as `{@link X}` is) and `@default` on each option of a
  config interface. A `@returns` text isn't shown: the return
  type comes from the code. The default column is filled from `@default` only: prose such as "Defaults to
  `'bottom-right'`." is not read. An override without a doc block takes the one of its base class.
- **Types get a card and a link** when a scanned entry point exports them and they aren't `@internal`. Export the
  config interface, the handle class and the union alias from the entry point, or they stay plain text.
- **Provision is read from the decorator**: `@Service()` and `providedIn: 'root' | 'platform' | 'any'` are automatic,
  `@Injectable()`, `autoProvided: false` and anything it can't read are by hand (no warning). The usage snippet adds
  `providers: [X]` for a by-hand service without `setup` only.
- **Not recognised as a service:** a `@Service` from another DI library, a class that isn't exported from an entry
  point, and a class that also has `@Pipe` (that is a pipe). Angular's decorator imported under another name
  (`import { Injectable as Service }`) or through a namespace import (`@ng.Injectable()`) is recognised.
- **Overloads get one row each,** without the implementation signature. An overload without a doc block takes the
  implementation's, then the description and `@param` texts of the first documented overload (not its tags), then the
  base class's, so documenting the implementation or the first overload is enough.
- **Known limits, don't work around them:** a `@returns` text isn't shown; a type imported or re-exported under
  another name appears under its declared name and may stay unlinked; a setup function or token exported under another
  name (`export { impl as provideToast }`) gets its declared name in the usage snippet's import; a token whose type
  argument is a class gets no option table; generics and statics aren't listed; a panel of
  your own with `appliesTo: ['service']` needs `placement: 'view'`, since a service page has no addon area. The
  extracted API is experimental until 23.0.0.

## Showcasing a pipe

````ts
import { inject, Pipe, PipeTransform } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { provideTimeAgo, TIME_AGO_OPTIONS } from './provide-time-ago';
import { TimeAgoOptions } from './time-ago.model';

/**
 * Writes a point in time relative to now: `3 hours ago`, or `in 2 days` for a time ahead.
 *
 * @since 1.5.0
 * @example
 * ```html
 * <span>{{ comment.createdAt | timeAgo: { style: 'short' } }}</span>
 * ```
 */
@Showcase({
    title: 'Time Ago',
    category: 'Formatting',
    setup: () => [provideTimeAgo]
})
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
    private readonly defaults = inject(TIME_AGO_OPTIONS, { optional: true });

    /**
     * Writes the time relative to now, in the app-wide style.
     * @param value The point in time: a `Date`, a timestamp in milliseconds or a date string.
     */
    transform(value: Date | number | string): string;
    /**
     * Writes the time relative to now, in the style given for this call.
     * @param value The point in time: a `Date`, a timestamp in milliseconds or a date string.
     * @param options Overrides the app-wide options for this call.
     */
    transform(value: Date | number | string, options: Partial<TimeAgoOptions>): string;
    transform(value: Date | number | string, options: Partial<TimeAgoOptions> = {}): string {
        /* … */
    }
}
````

A pipe works like a service, so the rules of "Showcasing a service" above apply: the same `setup`, the same JSDoc tags, the
same type cards and the same page without a canvas. What differs:

- **The JSDoc plugin draws the page.** Without `jsDocPlugin()` in `ng-prism.config.ts` the build only counts the pipes,
  without reading them, leaves them out of the manifest and logs, once per build or `serve` run, through the normal log
  and not as a warning:
  `ng-prism: <n> pipe(s) with @Showcase found, but no plugin shows pipes; add jsDocPlugin() from @ng-prism/plugin-jsdoc 22.7.0 or newer to ng-prism.config.ts to list them.`
  Add the plugin, or update `@ng-prism/plugin-jsdoc` to 22.7.0 or newer if it is already there; don't touch the
  pipes. `strictShowcase` doesn't fail over this hint, and the pipes' own warnings only show up once the plugin is
  there.
- **Standalone and a readable name, or the pipe is dropped.** The name comes from `@Pipe({ name })`, a string
  literal or a `const`. Both cases are warnings that count for `strictShowcase`:
  `<Class> › @Pipe name (<file>:<line>:<col>) cannot be evaluated statically, so the pipe was dropped.` and
  `<Class> › @Pipe (<file>:<line>:<col>) is declared with standalone: false; ng-prism shows standalone pipes only, so it was dropped.`
  For the second, make the pipe standalone: the usage snippet puts it into a component's `imports`, which an NgModule
  pipe can't be. `pure` defaults to `true`; one the builder can't read only removes the Pure / Impure chip.
- **Fields.** The same as for a service, with `section` defaulting to `Pipes`. `variants`, `states`, `providers`,
  `bg`, `canvasLayout`, `host`, `imports` and `renderPage` need a canvas, and **until 23.0.0 one of them keeps a `@Pipe` class a
  component** (deprecated since 22.7.0, removed in 23.0.0), with a notice that does not count for `strictShowcase`:
  `<Class> is a @Pipe with @Showcase and declares <fields>, so it is still treated as a component. From 23.0.0 it will be shown as a pipe and these fields will be dropped; remove them, or move the page to a componentPage.`
  For a pipe with `standalone: false` the notice ends differently, because such a pipe is gone in 23.0.0:
  `… From 23.0.0 it will be dropped, because ng-prism shows standalone pipes only; make the pipe standalone and remove the fields, or move the page to a componentPage.`
  This rule comes before the two warnings above: a NgModule pipe or a pipe with an unreadable name that has
  `renderPage` keeps its page in 22.x. To make it a pipe, remove those fields and move the demo to a component page.
- **The page is `transform()`.** Every overload signature gets its own row, with its parameters, `@param` texts and
  return type, and the implementation signature is left out when there are overloads. No other member of the class is
  listed. An overload without a doc block takes the implementation's, then the first documented overload's (only its
  description and `@param` texts, not its tags, so `@deprecated` stays on the overload it is written on), then the
  one of the nearest base class that has one, so documenting the implementation or the first overload is enough. A
  pipe without a `transform()` of its own takes it from its base class, `class LocalDatePipe extends DatePipe {}`
  from `@angular/common` included. Without type annotations the page shows the types the compiler infers.
- **The usage snippet** has the imports, the `providers` entries of `setup`, the component's `imports` entry and a
  template line from the first signature that isn't `@deprecated` (the first one when all are): each required
  parameter after the value becomes `: name`, up to the last required one (`{{ value | sgDate: pattern }}`); optional
  and rest parameters after that are left out.
- **A panel of your own** with `appliesTo: ['pipe']` needs `placement: 'view'`, like one for services. The extracted
  API (`PipeApi`) is experimental until 23.0.0.
