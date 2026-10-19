import path from 'node:path';
import type { PrismManifest, ScannedComponent } from '@ng-prism/core/plugin';
import { coveragePlugin as coveragePluginBrowser } from './coverage-plugin.browser.js';
import { coveragePlugin, resolveCoverageThresholds } from './coverage-plugin.js';
import { clearCoverageCache } from './coverage-reader.js';
import type { CoverageManifestMeta } from './coverage.types.js';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/coverage-summary.json');

function makeComponent(overrides?: Partial<ScannedComponent>): ScannedComponent {
    return {
        className: 'ButtonComponent',
        filePath: '/workspace/src/app/button/button.component.ts',
        showcaseConfig: { title: 'Button' },
        inputs: [],
        outputs: [],
        componentMeta: {
            selector: 'app-button',
            standalone: true,
            isDirective: false
        },
        ...overrides
    };
}

describe('coveragePlugin', () => {
    afterEach(() => {
        clearCoverageCache();
    });

    it('should return a plugin with the correct name', () => {
        const plugin = coveragePlugin();

        expect(plugin.name).toBe('@ng-prism/plugin-coverage');
    });

    it('should register a single panel', () => {
        const plugin = coveragePlugin();

        expect(plugin.panels).toHaveLength(1);
    });

    it('should define the Coverage panel with correct properties', () => {
        const plugin = coveragePlugin();
        const panel = plugin.panels![0];

        expect(panel.id).toBe('coverage');
        expect(panel.label).toBe('Coverage');
        expect(panel.position).toBeUndefined();
        expect(panel.loadComponent).toBeDefined();
        expect(panel.component).toBeUndefined();
    });

    it('should lazy-load the panel component', async () => {
        const plugin = coveragePlugin();
        const panel = plugin.panels![0];
        const Component = await panel.loadComponent!();

        expect(Component).toBeDefined();
        expect(Component.name).toBe('CoveragePanelComponent');
    });

    it('should define onComponentScanned hook', () => {
        const plugin = coveragePlugin();

        expect(plugin.onComponentScanned).toBeDefined();
    });

    describe('onComponentScanned', () => {
        it('should inject coverage data into showcaseConfig.meta', async () => {
            const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
            const component = makeComponent();
            const result = await plugin.onComponentScanned!(component);

            expect(result).toBeDefined();
            const meta = (result as ScannedComponent).showcaseConfig.meta;

            expect(meta?.['coverage']).toBeDefined();
            const coverage = meta?.['coverage'] as any;

            expect(coverage.found).toBe(true);
            expect(coverage.score).toBe(Math.round((80 + 75 + 100 + 90) / 4));
        });

        it('should preserve existing showcaseConfig.meta properties', async () => {
            const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
            const component = makeComponent({
                showcaseConfig: {
                    title: 'Button',
                    meta: { figma: 'https://figma.com/foo' }
                }
            });
            const result = await plugin.onComponentScanned!(component);

            const meta = (result as ScannedComponent).showcaseConfig.meta;

            expect(meta?.['figma']).toBe('https://figma.com/foo');
            expect(meta?.['coverage']).toBeDefined();
        });

        it('should inject found:false when no coverage data exists for file', async () => {
            const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
            const component = makeComponent({
                filePath: '/workspace/src/app/unknown/unknown.component.ts'
            });
            const result = await plugin.onComponentScanned!(component);

            const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;

            expect(coverage.found).toBe(false);
            expect(coverage.score).toBe(0);
        });

        it('should inject found:false when coverage file does not exist', async () => {
            const plugin = coveragePlugin({
                coveragePath: '/nonexistent/coverage-summary.json'
            });
            const component = makeComponent();
            const result = await plugin.onComponentScanned!(component);

            const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;

            expect(coverage.found).toBe(false);
        });

        it('should inject default thresholds (80) when none configured', async () => {
            const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
            const result = await plugin.onComponentScanned!(makeComponent());

            const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;

            expect(coverage.thresholds).toEqual({
                lines: 80,
                branches: 80,
                functions: 80,
                statements: 80
            });
        });

        it('should accept a numeric threshold shorthand applied to all metrics', async () => {
            const plugin = coveragePlugin({
                coveragePath: FIXTURE_PATH,
                thresholds: 90
            });
            const result = await plugin.onComponentScanned!(makeComponent());

            const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;

            expect(coverage.thresholds).toEqual({
                lines: 90,
                branches: 90,
                functions: 90,
                statements: 90
            });
        });

        it('should accept partial per-metric thresholds and fall back to defaults', async () => {
            const plugin = coveragePlugin({
                coveragePath: FIXTURE_PATH,
                thresholds: { lines: 95, branches: 70 }
            });
            const result = await plugin.onComponentScanned!(makeComponent());

            const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;

            expect(coverage.thresholds).toEqual({
                lines: 95,
                branches: 70,
                functions: 80,
                statements: 80
            });
        });

        it('should inject thresholds even when no coverage data is found for the file', async () => {
            const plugin = coveragePlugin({
                coveragePath: '/nonexistent/coverage-summary.json',
                thresholds: 95
            });
            const result = await plugin.onComponentScanned!(makeComponent());

            const coverage = (result as ScannedComponent).showcaseConfig.meta?.['coverage'] as any;

            expect(coverage.found).toBe(false);
            expect(coverage.thresholds).toEqual({
                lines: 95,
                branches: 95,
                functions: 95,
                statements: 95
            });
        });
    });

    describe('onManifestReady', () => {
        it('should add manifest-level coverage meta with library total', async () => {
            const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
            const manifest: PrismManifest = { components: [] };
            const result = await plugin.onManifestReady!(manifest);

            const meta = (result as PrismManifest).meta?.['coverage'] as CoverageManifestMeta;

            expect(meta.total.found).toBe(true);
            expect(meta.total.score).toBe(Math.round((80 + 70 + 90 + 80) / 4));
            expect(meta.thresholds).toEqual({
                lines: 80,
                branches: 80,
                functions: 80,
                statements: 80
            });
        });

        it('should preserve existing manifest meta properties', async () => {
            const plugin = coveragePlugin({ coveragePath: FIXTURE_PATH });
            const manifest: PrismManifest = {
                components: [],
                meta: { foo: 'bar' }
            };
            const result = await plugin.onManifestReady!(manifest);

            expect((result as PrismManifest).meta?.['foo']).toBe('bar');
            expect((result as PrismManifest).meta?.['coverage']).toBeDefined();
        });

        it('should set found:false when coverage file is missing', async () => {
            const plugin = coveragePlugin({ coveragePath: '/nonexistent.json' });
            const result = await plugin.onManifestReady!({ components: [] });

            const meta = (result as PrismManifest).meta?.['coverage'] as CoverageManifestMeta;

            expect(meta.total.found).toBe(false);
        });
    });

    describe('headerWidgets', () => {
        it('should register a coverage-total header widget', () => {
            const plugin = coveragePlugin();

            expect(plugin.headerWidgets).toHaveLength(1);
            const widget = plugin.headerWidgets![0];

            expect(widget.id).toBe('coverage-total');
            expect(widget.placement).toBe('end');
            expect(widget.loadComponent).toBeDefined();
        });

        it('should lazy-load the header badge component', async () => {
            const plugin = coveragePlugin();
            const widget = plugin.headerWidgets![0];
            const Component = await widget.loadComponent!();

            expect(Component).toBeDefined();
            expect(Component.name).toBe('CoverageHeaderBadgeComponent');
        });
    });

    describe('navigation decoration', () => {
        it('registers the coverage source', () => {
            const ids = (coveragePlugin().navigationDecorations ?? []).map((d) => d.id);

            expect(ids).toEqual(['coverage']);
        });
    });

    describe('resolveCoverageThresholds', () => {
        it('returns defaults when input is undefined', () => {
            expect(resolveCoverageThresholds()).toEqual({
                lines: 80,
                branches: 80,
                functions: 80,
                statements: 80
            });
        });

        it('expands a number shorthand to all metrics', () => {
            expect(resolveCoverageThresholds(70)).toEqual({
                lines: 70,
                branches: 70,
                functions: 70,
                statements: 70
            });
        });

        it('merges partial thresholds with defaults', () => {
            expect(resolveCoverageThresholds({ functions: 100 })).toEqual({
                lines: 80,
                branches: 80,
                functions: 100,
                statements: 80
            });
        });
    });
});

/**
 * The Node entry carries the build-time hooks and must never be reachable
 * from a browser bundle (see `coverage-plugin.browser.ts`). A
 * `navigationDecorations` entry added to only one of the two twins would
 * silently drop the marker in the setup that needs it, and no other suite
 * would notice.
 */
describe('entry parity: navigation decorations', () => {
    it('declares the same decoration ids as the browser entry', () => {
        const nodeIds = (coveragePlugin().navigationDecorations ?? []).map((d) => d.id);
        const browserIds = (coveragePluginBrowser().navigationDecorations ?? []).map((d) => d.id);

        expect(nodeIds).toEqual(['coverage']);
        expect(browserIds).toEqual(['coverage']);
    });
});
