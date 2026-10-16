import type { Type } from '@angular/core';
import type { ShowcaseConfig } from '../decorator/showcase.types.js';
import type { RuntimeManifest } from '../plugin/plugin.types.js';
import { DEFAULT_VARIANT_BG } from '../shared/variant-bg.js';
import { buildDiscoveryManifest, serializableMeta } from './discovery-manifest.js';

function manifestOf(...components: Array<{ className: string; showcaseConfig: ShowcaseConfig }>): RuntimeManifest {
    return {
        components: components.map((c) => ({
            type: class {} as Type<unknown>,
            meta: {
                className: c.className,
                filePath: `src/${c.className}.ts`,
                showcaseConfig: c.showcaseConfig,
                inputs: [],
                outputs: [],
                componentMeta: {
                    selector: 'x',
                    standalone: true,
                    isDirective: false
                }
            }
        }))
    };
}

describe('serializableMeta', () => {
    it('returns undefined for absent meta', () => {
        expect(serializableMeta(undefined)).toBeUndefined();
    });

    it('returns undefined for empty meta instead of an empty object', () => {
        expect(serializableMeta({})).toBeUndefined();
    });

    it('keeps primitives', () => {
        expect(serializableMeta({ a: 'x', b: 1, c: true, d: null })).toEqual({
            a: 'x',
            b: 1,
            c: true,
            d: null
        });
    });

    it('keeps nested plain objects and arrays', () => {
        expect(serializableMeta({ vrt: { skip: true, tags: ['a', 'b'] } })).toEqual({
            vrt: { skip: true, tags: ['a', 'b'] }
        });
    });

    it('drops functions', () => {
        expect(serializableMeta({ keep: 1, fn: () => 0 })).toEqual({ keep: 1 });
    });

    it('drops class instances, so an Angular type can never reach the global', () => {
        class SomeComponent {}
        expect(
            serializableMeta({
                keep: 1,
                component: SomeComponent,
                instance: new SomeComponent()
            })
        ).toEqual({ keep: 1 });
    });

    it('drops non-finite numbers, which JSON cannot represent', () => {
        expect(serializableMeta({ keep: 1, nan: NaN, inf: Infinity })).toEqual({
            keep: 1
        });
    });

    it('drops symbols and undefined values', () => {
        expect(serializableMeta({ keep: 1, sym: Symbol('s'), nope: undefined })).toEqual({ keep: 1 });
    });

    it('breaks cycles instead of throwing', () => {
        const cyclic: Record<string, unknown> = { keep: 1 };

        cyclic['self'] = cyclic;
        expect(() => serializableMeta(cyclic)).not.toThrow();
        expect(serializableMeta(cyclic)).toEqual({ keep: 1 });
    });

    it('nulls unrepresentable array entries so indices stay stable', () => {
        expect(serializableMeta({ list: ['a', () => 0, 'c'] })).toEqual({
            list: ['a', null, 'c']
        });
    });

    it('survives a structured clone, which is what the tooling bridge does', () => {
        class SomeComponent {}
        const cyclic: Record<string, unknown> = { component: SomeComponent };

        cyclic['self'] = cyclic;
        const sanitized = serializableMeta({ ...cyclic, figma: 'https://x', n: 1 });

        expect(() => structuredClone(sanitized)).not.toThrow();
    });

    it('does not mutate the input', () => {
        const input = { keep: 1, fn: () => 0 };

        serializableMeta(input);
        expect(typeof input.fn).toBe('function');
    });
});

describe('buildDiscoveryManifest', () => {
    it('exposes className, title and variant indices', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: {
                    title: 'Button',
                    variants: [{ name: 'Primary' }, { name: 'Secondary' }]
                }
            })
        );

        expect(result.components[0]).toEqual({
            className: 'ButtonComponent',
            title: 'Button',
            variants: [
                { name: 'Primary', index: 0, bg: 'transparent' },
                { name: 'Secondary', index: 1, bg: 'transparent' }
            ]
        });
    });

    it('reports a single Default variant when none are declared', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'IconComponent',
                showcaseConfig: { title: 'Icon' }
            })
        );

        expect(result.components[0].variants).toEqual([{ name: 'Default', index: 0, bg: 'transparent' }]);
    });

    it('reports the Default variant for an empty variants array too', () => {
        // The renderer treats `[]` the same as `undefined` (it still instantiates
        // the component at index 0), so a runner must not be told there is nothing
        // to capture.
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'IconComponent',
                showcaseConfig: { title: 'Icon', variants: [] }
            })
        );

        expect(result.components[0].variants).toEqual([{ name: 'Default', index: 0, bg: 'transparent' }]);
    });

    it('reports the background every variant renders on', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: {
                    title: 'Button',
                    bg: 'dark',
                    variants: [{ name: 'Filled' }, { name: 'Outlined', bg: 'light' }]
                }
            })
        );

        // Inherited from the component, then overridden by the variant. A runner
        // reads one field instead of reimplementing the fallback chain.
        expect(result.components[0].variants).toEqual([
            { name: 'Filled', index: 0, bg: 'dark' },
            { name: 'Outlined', index: 1, bg: 'light' }
        ]);
    });

    it('reports the default background when nothing declares one', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: { title: 'Button', variants: [{ name: 'Filled' }] }
            })
        );

        expect(result.components[0].variants[0].bg).toBe(DEFAULT_VARIANT_BG);
    });

    it('gives the synthetic Default variant the component background', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'IconComponent',
                showcaseConfig: { title: 'Icon', bg: 'dark' }
            })
        );

        expect(result.components[0].variants).toEqual([{ name: 'Default', index: 0, bg: 'dark' }]);
    });

    it('does not put bg on the component level', () => {
        // One resolved value per variant is the whole contract. A second,
        // component-level field would only invite a consumer to read the wrong one.
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: { title: 'Button', bg: 'dark' }
            })
        );

        expect('bg' in result.components[0]).toBe(false);
    });

    it('exposes variant meta, so a tool can opt a variant out', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'TooltipDirective',
                showcaseConfig: {
                    title: 'Tooltip',
                    variants: [{ name: 'Top', meta: { vrt: { skip: true } } }, { name: 'Disabled' }]
                }
            })
        );

        expect(result.components[0].variants[0].meta).toEqual({
            vrt: { skip: true }
        });
        expect(result.components[0].variants[1].meta).toBeUndefined();
    });

    it('reports the pseudo states a variant forces, and nothing for one that forces none', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: {
                    title: 'Button',
                    variants: [{ name: 'Filled' }, { name: 'Focused', pseudo: { 'focus-visible': '.btn', hover: true } }, { name: 'Empty', pseudo: {} }]
                }
            })
        );
        const [filled, focused, empty] = result.components[0].variants;

        expect(focused.pseudo).toEqual({ 'focus-visible': '.btn', hover: true });
        expect('pseudo' in filled).toBe(false);
        expect('pseudo' in empty).toBe(false);
    });

    it('exposes component meta, which is where build-time plugins write', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: {
                    title: 'Button',
                    meta: { figma: 'https://figma.com/x', coverage: { lines: 90 } }
                }
            })
        );

        expect(result.components[0].meta).toEqual({
            figma: 'https://figma.com/x',
            coverage: { lines: 90 }
        });
    });

    it('omits meta entirely when the decorator declares none', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: { title: 'Button' }
            })
        );

        expect('meta' in result.components[0]).toBe(false);
    });

    it('strips a component type placed in meta', () => {
        class Related {}
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: {
                    title: 'Button',
                    meta: { related: Related, tag: 'x' }
                }
            })
        );

        expect(result.components[0].meta).toEqual({ tag: 'x' });
    });

    it('maps pages to their titles', () => {
        const manifest = manifestOf({
            className: 'ButtonComponent',
            showcaseConfig: { title: 'Button' }
        });

        manifest.pages = [
            { type: 'custom', title: 'Patterns', data: {} },
            { type: 'custom', title: 'Tokens', data: {} }
        ];
        expect(buildDiscoveryManifest(manifest).pages).toEqual([{ title: 'Patterns' }, { title: 'Tokens' }]);
    });

    it('reports an empty pages array when there are none', () => {
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: { title: 'Button' }
            })
        );

        expect(result.pages).toEqual([]);
    });

    it('produces a structured-cloneable result for a hostile manifest', () => {
        class SomeComponent {}
        const result = buildDiscoveryManifest(
            manifestOf({
                className: 'ButtonComponent',
                showcaseConfig: {
                    title: 'Button',
                    meta: { component: SomeComponent, cb: () => 0 },
                    variants: [{ name: 'Primary', meta: { el: SomeComponent } }]
                }
            })
        );

        expect(() => structuredClone(result)).not.toThrow();
    });
});
