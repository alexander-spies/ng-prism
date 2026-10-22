import path from 'node:path';
import type { ScannedComponent } from '@ng-prism/core/plugin';
import { jsDocPlugin as browserJsDocPlugin } from './jsdoc-plugin.browser.js';
import { jsDocPlugin } from './jsdoc-plugin.js';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/documented-button.ts');

function makeComponent(overrides?: Partial<ScannedComponent>): ScannedComponent {
    return {
        className: 'DocumentedButtonComponent',
        filePath: FIXTURE_PATH,
        showcaseConfig: { title: 'Button' },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'doc-button', standalone: true, isDirective: false },
        ...overrides
    };
}

describe('jsDocPlugin', () => {
    it('should return a plugin with the correct name', () => {
        const plugin = jsDocPlugin();

        expect(plugin.name).toBe('@ng-prism/plugin-jsdoc');
    });

    it('should register a single panel', () => {
        const plugin = jsDocPlugin();

        expect(plugin.panels).toHaveLength(1);
    });

    it('should define the API panel with correct properties', () => {
        const plugin = jsDocPlugin();
        const panel = plugin.panels![0];

        expect(panel.id).toBe('jsdoc');
        expect(panel.label).toBe('API');
        expect(panel.position).toBeUndefined();
        expect(panel.loadComponent).toBeDefined();
        expect(panel.component).toBeUndefined();
    });

    it('registers the API panel for components, services and pipes', () => {
        expect(jsDocPlugin().panels![0].appliesTo).toEqual(['component', 'service', 'pipe']);
        expect(browserJsDocPlugin().panels![0].appliesTo).toEqual(['component', 'service', 'pipe']);
    });

    // The build only keeps services and pipes when a view panel applies to them, and it reads the Node half.
    it('registers the API panel as a view on both halves', () => {
        expect(jsDocPlugin().panels![0].placement).toBe('view');
        expect(browserJsDocPlugin().panels![0].placement).toBe('view');
    });

    // The scan only reads ScannedComponent.api for a plugin that asks for it, and the build reads the Node half.
    it('asks the build for the API of the components', () => {
        expect(jsDocPlugin().componentApi).toBe(true);
    });

    it('should lazy-load the panel component', async () => {
        const plugin = jsDocPlugin();
        const panel = plugin.panels![0];
        const Component = await panel.loadComponent!();

        expect(Component).toBeDefined();
        expect(Component.name).toBe('JsDocPanelComponent');
    });

    it('should define onComponentScanned hook', () => {
        const plugin = jsDocPlugin();

        expect(plugin.onComponentScanned).toBeDefined();
    });

    it('should not define onPageScanned or onManifestReady hooks', () => {
        const plugin = jsDocPlugin();

        expect(plugin.onPageScanned).toBeUndefined();
        expect(plugin.onManifestReady).toBeUndefined();
    });

    describe('onComponentScanned', () => {
        it('should inject jsdoc data into showcaseConfig.meta for a documented component', async () => {
            const plugin = jsDocPlugin();
            const component = makeComponent();
            const result = await plugin.onComponentScanned!(component);

            expect(result).toBeDefined();
            const meta = (result as ScannedComponent).showcaseConfig.meta;

            expect(meta?.['jsdoc']).toBeDefined();
            const jsdoc = meta?.['jsdoc'] as any;

            expect(jsdoc.classDescription).toBe('Primary action button component.');
            expect(jsdoc.classTags.since).toBe('1.0.0');
            expect(jsdoc.classTags.deprecated).toBeTruthy();
        });

        it('should preserve existing showcaseConfig.meta properties', async () => {
            const plugin = jsDocPlugin();
            const component = makeComponent({
                showcaseConfig: { title: 'Button', meta: { figma: 'https://figma.com/foo' } }
            });
            const result = await plugin.onComponentScanned!(component);

            const meta = (result as ScannedComponent).showcaseConfig.meta;

            expect(meta?.['figma']).toBe('https://figma.com/foo');
            expect(meta?.['jsdoc']).toBeDefined();
        });

        it('should return undefined for a component without matching class', async () => {
            const plugin = jsDocPlugin();
            const component = makeComponent({ className: 'NonExistentComponent' });
            const result = await plugin.onComponentScanned!(component);

            expect(result).toBeUndefined();
        });

        it('should extract member tags into memberTags', async () => {
            const plugin = jsDocPlugin();
            const component = makeComponent();
            const result = await plugin.onComponentScanned!(component);

            const jsdoc = (result as ScannedComponent).showcaseConfig.meta?.['jsdoc'] as any;

            expect(jsdoc.memberTags['variant']).toBeDefined();
            expect(jsdoc.memberTags['variant'].deprecated).toBeTruthy();
        });

        it('should read member tags from the base classes of the component', async () => {
            const plugin = jsDocPlugin();
            const component = makeComponent({
                className: 'DocumentedInputComponent',
                filePath: path.join(__dirname, '__fixtures__/documented-input.ts'),
                baseClasses: [{ className: 'DocumentedField', filePath: path.join(__dirname, '__fixtures__/documented-field.ts') }]
            });
            const result = await plugin.onComponentScanned!(component);

            const jsdoc = (result as ScannedComponent).showcaseConfig.meta?.['jsdoc'] as any;

            expect(jsdoc.memberTags['placeholder'].since).toBe('2.0.0');
        });
    });
});
