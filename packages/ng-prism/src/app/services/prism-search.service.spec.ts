import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimeComponent, RuntimeManifest, RuntimePart } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

function createComponent(overrides: Partial<{ title: string; category: string; tags: string[]; className: string; selector: string }> = {}): RuntimeComponent {
    return {
        type: class {} as any,
        meta: {
            className: overrides.className ?? 'Comp',
            filePath: '/test.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Default',
                category: overrides.category,
                tags: overrides.tags
            },
            inputs: [],
            outputs: [],
            componentMeta: { selector: overrides.selector ?? 'test', standalone: true, isDirective: false }
        }
    };
}

function createPart(overrides: Partial<{ title: string; tags: string[]; className: string; selector: string }> = {}): RuntimePart {
    return {
        meta: {
            className: overrides.className ?? 'OptionComponent',
            filePath: '/option.component.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Choice',
                tags: overrides.tags,
                partOf: 'lib-select'
            },
            inputs: [],
            outputs: [],
            componentMeta: { selector: overrides.selector ?? 'lib-option', standalone: true, isDirective: false }
        }
    };
}

function createService(overrides: Partial<{ title: string; category: string; tags: string[]; className: string }> = {}): RuntimeService {
    return {
        meta: {
            className: overrides.className ?? 'SomeService',
            filePath: '/some.service.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Default',
                category: overrides.category,
                tags: overrides.tags
            },
            provision: 'auto',
            api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
        }
    };
}

function createPipe(overrides: Partial<{ title: string; category: string; tags: string[]; className: string; pipeName: string }> = {}): RuntimePipe {
    return {
        meta: {
            className: overrides.className ?? 'SomePipe',
            filePath: '/some.pipe.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Default',
                category: overrides.category,
                tags: overrides.tags
            },
            pipeName: overrides.pipeName ?? 'some',
            api: { tags: {}, transform: [], setup: [], types: [] }
        }
    };
}

function setup(manifest: RuntimeManifest): PrismSearchService {
    const injector = Injector.create({
        providers: [{ provide: PRISM_MANIFEST, useValue: manifest }]
    });
    const manifestService = runInInjectionContext(injector, () => new PrismManifestService());
    const childInjector = Injector.create({
        providers: [{ provide: PrismManifestService, useValue: manifestService }],
        parent: injector
    });

    return runInInjectionContext(childInjector, () => new PrismSearchService());
}

describe('PrismSearchService', () => {
    it('should return all components when query is empty', () => {
        const comps = [createComponent({ title: 'Button' }), createComponent({ title: 'Card' })];
        const service = setup({ components: comps });

        expect(service.filteredComponents()).toEqual(comps);
    });

    it('should filter by title', () => {
        const btn = createComponent({ title: 'Button' });
        const card = createComponent({ title: 'Card' });
        const service = setup({ components: [btn, card] });

        service.search('button');
        expect(service.filteredComponents()).toEqual([btn]);
    });

    it('should filter case-insensitively', () => {
        const btn = createComponent({ title: 'Button' });
        const service = setup({ components: [btn] });

        service.search('BUTTON');
        expect(service.filteredComponents()).toEqual([btn]);
    });

    it('should filter by category', () => {
        const btn = createComponent({ title: 'Button', category: 'Forms' });
        const card = createComponent({ title: 'Card', category: 'Layout' });
        const service = setup({ components: [btn, card] });

        service.search('forms');
        expect(service.filteredComponents()).toEqual([btn]);
    });

    it('should filter by tags', () => {
        const btn = createComponent({ title: 'Button', tags: ['input', 'action'] });
        const card = createComponent({ title: 'Card', tags: ['container'] });
        const service = setup({ components: [btn, card] });

        service.search('action');
        expect(service.filteredComponents()).toEqual([btn]);
    });

    it('filters components by their class name and selector', () => {
        const button = createComponent({ title: 'Button', className: 'ButtonComponent', selector: 'lib-button, [libButton]' });
        const card = createComponent({ title: 'Card', className: 'CardComponent', selector: 'lib-card' });
        const service = setup({ components: [button, card] });

        service.search('ButtonComponent');
        expect(service.filteredComponents()).toEqual([button]);

        service.search('libbutton');
        expect(service.filteredComponents()).toEqual([button]);

        service.search('component');
        expect(service.filteredComponents()).toEqual([button, card]);
    });

    it('should clear the query', () => {
        const comps = [createComponent({ title: 'Button' }), createComponent({ title: 'Card' })];
        const service = setup({ components: comps });

        service.search('button');
        expect(service.filteredComponents().length).toBe(1);

        service.clear();
        expect(service.filteredComponents()).toEqual(comps);
    });

    it('should handle empty results', () => {
        const service = setup({ components: [createComponent({ title: 'Button' })] });

        service.search('nonexistent');
        expect(service.filteredComponents()).toEqual([]);
    });

    it('filters services by title, category, tags and className', () => {
        const toast = createService({ title: 'Toasts', className: 'ToastService', category: 'Feedback', tags: ['notification'] });
        const auth = createService({ title: 'Session', className: 'AuthStore', category: 'Security', tags: ['login'] });
        const service = setup({ components: [], services: [toast, auth] });

        expect(service.filteredServices()).toEqual([toast, auth]);

        service.search('toasts');
        expect(service.filteredServices()).toEqual([toast]);

        service.search('security');
        expect(service.filteredServices()).toEqual([auth]);

        service.search('NOTIFICATION');
        expect(service.filteredServices()).toEqual([toast]);

        service.search('authstore');
        expect(service.filteredServices()).toEqual([auth]);

        service.search('nonexistent');
        expect(service.filteredServices()).toEqual([]);
    });

    it('has no services for a manifest without them', () => {
        const service = setup({ components: [createComponent({ title: 'Button' })] });

        expect(service.filteredServices()).toEqual([]);
    });

    it('filters pipes by title, category, tags and className', () => {
        const truncate = createPipe({ title: 'Truncate', className: 'TruncatePipe', category: 'Text', tags: ['shorten'] });
        const money = createPipe({ title: 'Money', className: 'CurrencyFormat', category: 'Numbers', tags: ['locale'] });
        const service = setup({ components: [], pipes: [truncate, money] });

        expect(service.filteredPipes()).toEqual([truncate, money]);

        service.search('truncate');
        expect(service.filteredPipes()).toEqual([truncate]);

        service.search('numbers');
        expect(service.filteredPipes()).toEqual([money]);

        service.search('SHORTEN');
        expect(service.filteredPipes()).toEqual([truncate]);

        service.search('currencyformat');
        expect(service.filteredPipes()).toEqual([money]);

        service.search('nonexistent');
        expect(service.filteredPipes()).toEqual([]);
    });

    it('has no pipes for a manifest without them', () => {
        const service = setup({ components: [createComponent({ title: 'Button' })] });

        expect(service.filteredPipes()).toEqual([]);
    });

    it('finds a pipe by its template name', () => {
        const timeAgo = createPipe({ title: 'Relative time', className: 'RelativeTimePipe', pipeName: 'timeAgo' });
        const truncate = createPipe({ title: 'Truncate', className: 'TruncatePipe', pipeName: 'truncate' });
        const service = setup({ components: [], pipes: [timeAgo, truncate] });

        service.search('timeago');
        expect(service.filteredPipes()).toEqual([timeAgo]);
    });

    describe('parts', () => {
        function createSelect(): RuntimeComponent {
            return { ...createComponent({ title: 'Select' }), parts: [createPart({ title: 'Choice', tags: ['listbox'] })] };
        }

        it.each(['choice', 'option', 'OptionComponent', 'lib-option', 'listbox'])('lists the parent for a query that matches its part: %s', (query) => {
            const select = createSelect();
            const button = createComponent({ title: 'Button' });
            const service = setup({ components: [select, button] });

            service.search(query);
            expect(service.filteredComponents()).toEqual([select]);
        });

        it('does not list a part on its own', () => {
            const select = createSelect();
            const service = setup({ components: [select, createComponent({ title: 'Button' })] });

            for (const query of ['', 'option', 'choice', 'select']) {
                service.search(query);
                expect(service.filteredComponents().map((comp) => comp.meta.className)).not.toContain('OptionComponent');
            }
        });

        it('lists a component without parts for a query that matches the class names and selectors of all', () => {
            const select = { ...createComponent({ title: 'Select', className: 'SelectComponent', selector: 'lib-select' }), parts: [createPart()] };
            const button = createComponent({ title: 'Button', className: 'ButtonComponent', selector: 'lib-button' });
            const service = setup({ components: [select, button] });

            for (const query of ['Component', 'lib-']) {
                service.search(query);
                expect(service.filteredComponents()).toEqual([select, button]);
            }
        });

        it('lists a parent once when both it and a part match', () => {
            const select = {
                ...createComponent({ title: 'Option picker' }),
                parts: [createPart(), createPart({ className: 'OptgroupComponent', selector: 'lib-optgroup' })]
            };
            const service = setup({ components: [select] });

            service.search('option');
            expect(service.filteredComponents()).toEqual([select]);
        });

        it('keeps matching a component by its own fields, with or without parts', () => {
            const select = createSelect();
            const plain = { ...createComponent({ title: 'Button' }), parts: [] };
            const service = setup({ components: [select, plain] });

            service.search('select');
            expect(service.filteredComponents()).toEqual([select]);

            service.search('button');
            expect(service.filteredComponents()).toEqual([plain]);
        });
    });
});
