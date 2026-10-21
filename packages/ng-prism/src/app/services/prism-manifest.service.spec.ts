import { Injector, runInInjectionContext } from '@angular/core';
import type { RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';

function createComponent(overrides: Partial<{ title: string; category: string; className: string }> = {}): RuntimeComponent {
    return {
        type: class {} as any,
        meta: {
            className: overrides.className ?? 'TestComponent',
            filePath: '/test.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Test',
                category: overrides.category
            },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'test', standalone: true, isDirective: false }
        }
    };
}

function setup(manifest: RuntimeManifest): PrismManifestService {
    const injector = Injector.create({
        providers: [{ provide: PRISM_MANIFEST, useValue: manifest }]
    });

    return runInInjectionContext(injector, () => new PrismManifestService());
}

describe('PrismManifestService', () => {
    it('should expose components from manifest', () => {
        const comps = [createComponent(), createComponent({ className: 'Other' })];
        const service = setup({ components: comps });

        expect(service.components()).toEqual(comps);
    });

    it('should compute unique sorted categories', () => {
        const service = setup({
            components: [createComponent({ category: 'Forms' }), createComponent({ category: 'Layout' }), createComponent({ category: 'Forms' })]
        });

        expect(service.categories()).toEqual(['Forms', 'Layout']);
    });

    it('should use "Uncategorized" for components without category', () => {
        const service = setup({ components: [createComponent()] });

        expect(service.categories()).toEqual(['Uncategorized']);
    });

    it('should group components by category', () => {
        const a = createComponent({ category: 'A', className: 'A1' });
        const b = createComponent({ category: 'A', className: 'A2' });
        const c = createComponent({ category: 'B', className: 'B1' });
        const service = setup({ components: [a, b, c] });

        const grouped = service.groupedByCategory();

        expect(grouped.get('A')).toEqual([a, b]);
        expect(grouped.get('B')).toEqual([c]);
    });

    it('should handle empty manifest', () => {
        const service = setup({ components: [] });

        expect(service.components()).toEqual([]);
        expect(service.categories()).toEqual([]);
        expect(service.groupedByCategory().size).toBe(0);
    });

    it('should expose manifest as a readonly signal', () => {
        const comps = [createComponent()];
        const service = setup({ components: comps });

        expect(service.manifest()).toEqual({ components: comps });
    });

    it('should update components when updateManifest is called', () => {
        const service = setup({ components: [createComponent({ className: 'Old' })] });
        const newComps = [createComponent({ className: 'New1' }), createComponent({ className: 'New2' })];

        service.updateManifest({ components: newComps });

        expect(service.components()).toEqual(newComps);
    });

    it('should update categories computed when updateManifest is called', () => {
        const service = setup({ components: [createComponent({ category: 'Forms' })] });

        expect(service.categories()).toEqual(['Forms']);

        service.updateManifest({
            components: [createComponent({ category: 'Layout', className: 'L1' }), createComponent({ category: 'Data', className: 'D1' })]
        });

        expect(service.categories()).toEqual(['Data', 'Layout']);
    });

    it('should update groupedByCategory computed when updateManifest is called', () => {
        const service = setup({ components: [createComponent({ category: 'A', className: 'A1' })] });

        const newComp = createComponent({ category: 'B', className: 'B1' });

        service.updateManifest({ components: [newComp] });

        const grouped = service.groupedByCategory();

        expect(grouped.get('B')).toEqual([newComp]);
        expect(grouped.has('A')).toBe(false);
    });

    it('should update pages when updateManifest is called', () => {
        const service = setup({ components: [] });

        expect(service.pages()).toEqual([]);

        service.updateManifest({
            components: [],
            pages: [{ type: 'component', title: 'Intro', category: 'Docs', component: class {} as any }]
        });

        expect(service.pages()).toEqual([{ type: 'component', title: 'Intro', category: 'Docs', component: expect.any(Function) }]);
    });

    it('should expose services from the manifest, none when it has no services field', () => {
        const toast: RuntimeService = {
            meta: {
                className: 'ToastService',
                filePath: '/toast.service.ts',
                showcaseConfig: { title: 'Toasts' },
                provision: 'auto',
                api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
            }
        };

        expect(setup({ components: [] }).services()).toEqual([]);

        const service = setup({ components: [], services: [toast] });

        expect(service.services()).toEqual([toast]);

        service.updateManifest({ components: [] });
        expect(service.services()).toEqual([]);
    });
});
