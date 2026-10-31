// Tokens
// PRISM_RENDERER_HOOKS + PrismRendererHooks are exported from the plugin entry point
// (src/plugin/index.ts) since they belong to the plugin API surface.
export { PRISM_CONFIG, PRISM_MANIFEST } from './tokens/prism-tokens.js';

// Theme
export { PRISM_BASE_TOKENS, PRISM_DARK_THEME, PRISM_DEFAULT_THEME, PRISM_LIGHT_THEME } from './theme/prism-default-theme.js';
export { PrismThemeService } from './services/prism-theme.service.js';

// Types
export type { NavigationItem } from './services/navigation-item.types.js';

// Services
export { PrismManifestService } from './services/prism-manifest.service.js';
export { PrismSearchService } from './services/prism-search.service.js';
export { PrismNavigationService } from './services/prism-navigation.service.js';
export { PrismRendererService } from './services/prism-renderer.service.js';
export { type EventLogEntry, PrismEventLogService } from './services/prism-event-log.service.js';
export { PrismPluginService } from './services/prism-plugin.service.js';
export { PrismLayoutService } from './services/prism-layout.service.js';
export { PrismUrlStateService } from './services/prism-url-state.service.js';
export { PrismPersistenceService } from './services/prism-persistence.service.js';

// Shell (root component)
export { PrismShellComponent } from './shell/prism-shell.component.js';

// Page renderers
export { PrismPageRendererComponent } from './page-renderer/prism-page-renderer.component.js';

// Bootstrap helper
export { providePrism } from './provide-prism.js';
export type { ProvidePrismOptions } from './provide-prism.js';

// HMR helper
export { enablePrismHmr } from './hmr.js';

// Shared presentational components for plugin contributions. They live on the
// main entry, not `plugin/index.ts`, because the builder evaluates plugin
// config in Node.js and that barrel excludes decorated declarations.
//
// They still reach Node: `@ng-prism/plugin-coverage` and
// `@ng-prism/plugin-visual-regression` re-export their header badges statically
// from their Node entry, and those import `PrismMetricBadgeComponent` from here;
// since 22.7 `@ng-prism/plugin-perf` does the same with its panel, which is
// built from the UI primitives below.
// Loading a plugin config in `builder/config-loader` therefore pulls this whole
// file, shell included, into Node. That only works because the config loader
// imports `@angular/compiler` first.
//
// Moving those re-exports to the `.browser.ts` entries does not help: "types"
// maps to the one `index.d.ts` built from the Node entry, so the symbols would
// vanish from the public types while still shipping (which
// `entry-parity.spec.ts` forbids). A Node-safe import path for the badges is a
// public API decision.
export { PrismMetricBadgeComponent } from './shared/prism-metric-badge.component.js';
export { PrismIconComponent } from './icons/prism-icon.component.js';
export { PrismBadgeComponent } from './shared/prism-badge.component.js';
export { toneForStatus } from './shared/badge.types.js';
export type { BadgeTone, StatusTone } from './shared/badge.types.js';
export { PrismTabsComponent } from './shared/prism-tabs.component.js';
export type { PrismTabBadge, PrismTabItem } from './shared/prism-tabs.component.js';
export { PrismSegmentedComponent } from './shared/prism-segmented.component.js';
export type { PrismSegmentOption } from './shared/prism-segmented.component.js';
export { PrismPanelToolbarComponent } from './shared/prism-panel-toolbar.component.js';
export { PrismListRowComponent } from './shared/prism-list-row.component.js';
export { PrismIconButtonComponent } from './shared/prism-icon-button.component.js';
export { PrismButtonComponent } from './shared/prism-button.component.js';
export { PrismMetricCardComponent } from './shared/prism-metric-card.component.js';
