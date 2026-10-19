# Custom UI Sections

> **Deprecated since 22.6.0, removed in 23.0.0.** `ui`, `appComponent` and `headless` on `NgPrismConfig` were meant to replace regions of the styleguide, replace its whole shell, or strip it down to the canvas. Nothing has ever read them, so setting them never had an effect. While one is set, the build prints a notice; remove them.

What works instead:

- **Branding and colours:** `title`, `subtitle`, `logo` and `buildInfo` for the header, the theme tokens through `theme`, `darkTheme` and `lightTheme`. See [Configuration](guide/configuration.md) and [Theming](guide/theming.md).
- **Your own content inside the styleguide:** a [component page](guide/component-pages.md) renders your Angular components with the services ng-prism provides.
- **More panels, header widgets, input controls or sidebar markers:** a [plugin](plugins/writing-plugins.md).
- **The component without the styleguide around it**, for screenshots: [capture isolation mode](guide/external-tooling.md#capture-isolation-mode).
