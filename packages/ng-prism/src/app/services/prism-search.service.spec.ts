import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismSearchService } from './prism-search.service.js';

function createComponent(overrides: Partial<{ title: string; category: string; tags: string[] }> = {}): RuntimeComponent {
    return {
        type: class {} as any,
        meta: {
            className: 'Comp',
            filePath: '/test.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Default',
                category: overrides.category,
                tags: overrides.tags
            },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'test', standalone: true, isDirective: false }
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
});
