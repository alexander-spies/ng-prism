import type { ScannedPipe } from '../../plugin/pipe.types.js';
import type { NgPrismPlugin, PrismManifest, ScannedComponent } from '../../plugin/plugin.types.js';
import type { ScannedService } from '../../plugin/service.types.js';
import { runPluginHooks } from './plugin-runner.js';

function createComponent(overrides: Partial<ScannedComponent> = {}): ScannedComponent {
    return {
        className: 'TestComponent',
        filePath: 'test.ts',
        showcaseConfig: { title: 'Test' },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'test', standalone: true, isDirective: false },
        ...overrides
    };
}

function svc(className: string): ScannedService {
    return {
        className,
        filePath: `${className}.ts`,
        showcaseConfig: { title: className },
        provision: 'auto',
        api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
    };
}

function pipe(className: string): ScannedPipe {
    return {
        className,
        filePath: `${className}.ts`,
        showcaseConfig: { title: className },
        pipeName: className.toLowerCase(),
        api: { tags: {}, transform: [], setup: [], types: [] }
    };
}

function createManifest(components: ScannedComponent[] = [createComponent()]): PrismManifest {
    return { components };
}

describe('runPluginHooks', () => {
    it('should return manifest unchanged when no plugins are provided', async () => {
        const manifest = createManifest();
        const result = await runPluginHooks(manifest, []);

        expect(result.components).toEqual(manifest.components);
    });

    it('should call onComponentScanned for each component', async () => {
        const spy = jest.fn();
        const plugin: NgPrismPlugin = { name: 'spy-plugin', onComponentScanned: spy };
        const manifest = createManifest([createComponent(), createComponent({ className: 'OtherComponent' })]);

        await runPluginHooks(manifest, [plugin]);

        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should apply component transformation when onComponentScanned returns a value', async () => {
        const plugin: NgPrismPlugin = {
            name: 'transform-plugin',
            onComponentScanned: (comp) => ({
                ...comp,
                meta: { ...comp.meta, custom: true }
            })
        };
        const manifest = createManifest();

        const result = await runPluginHooks(manifest, [plugin]);

        expect(result.components[0].meta).toEqual({ custom: true });
    });

    it('should leave component unchanged when onComponentScanned returns void', async () => {
        const plugin: NgPrismPlugin = {
            name: 'noop-plugin',
            onComponentScanned: () => {
                /* void */
            }
        };
        const manifest = createManifest();

        const result = await runPluginHooks(manifest, [plugin]);

        expect(result.components[0]).toEqual(manifest.components[0]);
    });

    it('should chain multiple plugins sequentially for onComponentScanned', async () => {
        const pluginA: NgPrismPlugin = {
            name: 'plugin-a',
            onComponentScanned: (comp) => ({ ...comp, meta: { ...comp.meta, a: true } })
        };
        const pluginB: NgPrismPlugin = {
            name: 'plugin-b',
            onComponentScanned: (comp) => ({ ...comp, meta: { ...comp.meta, b: true } })
        };
        const manifest = createManifest();

        const result = await runPluginHooks(manifest, [pluginA, pluginB]);

        expect(result.components[0].meta).toEqual({ a: true, b: true });
    });

    it('should call onManifestReady and apply transformation', async () => {
        const plugin: NgPrismPlugin = {
            name: 'manifest-plugin',
            onManifestReady: (m) => ({
                components: [...m.components, createComponent({ className: 'InjectedComponent' })]
            })
        };
        const manifest = createManifest();

        const result = await runPluginHooks(manifest, [plugin]);

        expect(result.components).toHaveLength(2);
        expect(result.components[1].className).toBe('InjectedComponent');
    });

    it('should wrap onComponentScanned errors with plugin and component context', async () => {
        const plugin: NgPrismPlugin = {
            name: 'broken-plugin',
            onComponentScanned: () => {
                throw new Error('boom');
            }
        };
        const manifest = createManifest([createComponent({ className: 'BadComponent' })]);

        await expect(runPluginHooks(manifest, [plugin])).rejects.toThrow(/plugin "broken-plugin" failed in onComponentScanned for component "BadComponent": boom/);
    });

    it('should preserve original error as cause', async () => {
        const original = new Error('original');
        const plugin: NgPrismPlugin = {
            name: 'broken-plugin',
            onManifestReady: () => {
                throw original;
            }
        };

        try {
            await runPluginHooks(createManifest(), [plugin]);
            fail('expected to throw');
        } catch (err) {
            expect((err as Error & { cause?: unknown }).cause).toBe(original);
        }
    });

    it('should handle async plugin hooks', async () => {
        const plugin: NgPrismPlugin = {
            name: 'async-plugin',
            onComponentScanned: async (comp) => {
                await new Promise((r) => setTimeout(r, 1));
                return { ...comp, meta: { ...comp.meta, async: true } };
            }
        };
        const manifest = createManifest();

        const result = await runPluginHooks(manifest, [plugin]);

        expect(result.components[0].meta).toEqual({ async: true });
    });

    it('should call onServiceScanned for each service and apply its result', async () => {
        const plugin: NgPrismPlugin = {
            name: 'service-plugin',
            onServiceScanned: (service) => ({ ...service, meta: { seen: true } })
        };
        const manifest: PrismManifest = { components: [createComponent()], services: [svc('A'), svc('B')] };

        const result = await runPluginHooks(manifest, [plugin]);

        expect(result.services?.map((s) => s.meta)).toEqual([{ seen: true }, { seen: true }]);
        expect(result.components).toEqual(manifest.components);
    });

    it('should not pass services to onComponentScanned', async () => {
        const spy = jest.fn();
        const plugin: NgPrismPlugin = { name: 'spy-plugin', onComponentScanned: spy };
        const manifest: PrismManifest = { components: [], services: [svc('A')] };

        await runPluginHooks(manifest, [plugin]);

        expect(spy).not.toHaveBeenCalled();
    });

    it('should wrap onServiceScanned errors with plugin and service context', async () => {
        const plugin: NgPrismPlugin = {
            name: 'broken-plugin',
            onServiceScanned: () => {
                throw new Error('boom');
            }
        };
        const manifest: PrismManifest = { components: [], services: [svc('A')] };

        await expect(runPluginHooks(manifest, [plugin])).rejects.toThrow(/plugin "broken-plugin" failed in onServiceScanned for service "A": boom/);
    });

    it('should omit services from the result when the input has none', async () => {
        const result = await runPluginHooks(createManifest(), []);

        expect('services' in result).toBe(false);
    });

    it('should call onPipeScanned for each pipe and apply its result', async () => {
        const plugin: NgPrismPlugin = {
            name: 'pipe-plugin',
            onPipeScanned: (scanned) => ({ ...scanned, meta: { seen: true } })
        };
        const manifest: PrismManifest = { components: [createComponent()], pipes: [pipe('A'), pipe('B')] };

        const result = await runPluginHooks(manifest, [plugin]);

        expect(result.pipes?.map((p) => p.meta)).toEqual([{ seen: true }, { seen: true }]);
        expect(result.components).toEqual(manifest.components);
    });

    it('should not pass pipes to onComponentScanned or onServiceScanned', async () => {
        const componentSpy = jest.fn();
        const serviceSpy = jest.fn();
        const plugin: NgPrismPlugin = { name: 'spy-plugin', onComponentScanned: componentSpy, onServiceScanned: serviceSpy };
        const manifest: PrismManifest = { components: [], pipes: [pipe('A')] };

        await runPluginHooks(manifest, [plugin]);

        expect(componentSpy).not.toHaveBeenCalled();
        expect(serviceSpy).not.toHaveBeenCalled();
    });

    it('should wrap onPipeScanned errors with plugin and pipe context', async () => {
        const plugin: NgPrismPlugin = {
            name: 'broken-plugin',
            onPipeScanned: () => {
                throw new Error('boom');
            }
        };
        const manifest: PrismManifest = { components: [], pipes: [pipe('A')] };

        await expect(runPluginHooks(manifest, [plugin])).rejects.toThrow(/plugin "broken-plugin" failed in onPipeScanned for pipe "A": boom/);
    });

    it('should omit pipes from the result when the input has none', async () => {
        const result = await runPluginHooks(createManifest(), []);

        expect('pipes' in result).toBe(false);
    });
});

describe('runPluginHooks with parts', () => {
    const SELECT = createComponent({
        className: 'SelectComponent',
        showcaseConfig: { title: 'Select' },
        componentMeta: { selector: 'lib-select', standalone: true, isDirective: false }
    });
    const OPTION = createComponent({
        className: 'OptionComponent',
        showcaseConfig: { title: 'Option', partOf: 'lib-select' },
        componentMeta: { selector: 'lib-option', standalone: true, isDirective: false },
        parentClassName: 'SelectComponent'
    });

    it('runs onComponentScanned on parts and hands onManifestReady the nested manifest', async () => {
        const seen: string[] = [];
        let ready: PrismManifest | undefined;
        const plugin: NgPrismPlugin = {
            name: 'p',
            onComponentScanned: (c) => void seen.push(c.className),
            onManifestReady: (m) => void (ready = m)
        };

        await runPluginHooks({ components: [SELECT, OPTION] }, [plugin]);

        expect(seen).toEqual(['SelectComponent', 'OptionComponent']);
        expect(ready!.components.map((c) => c.className)).toEqual(['SelectComponent']);
        expect(ready!.components[0].parts!.map((p) => p.className)).toEqual(['OptionComponent']);
    });

    it('nests the part as onComponentScanned returned it', async () => {
        const plugin: NgPrismPlugin = {
            name: 'p',
            onComponentScanned: (c) => ({ ...c, meta: { ...c.meta, seen: c.className } })
        };

        const result = await runPluginHooks({ components: [SELECT, OPTION] }, [plugin]);

        expect(result.components).toHaveLength(1);
        expect(result.components[0].meta).toEqual({ seen: 'SelectComponent' });
        expect(result.components[0].parts![0].meta).toEqual({ seen: 'OptionComponent' });
    });

    it('returns the nested manifest when no plugin changes it', async () => {
        const result = await runPluginHooks({ components: [SELECT, OPTION] }, []);

        expect(result.components.map((c) => c.className)).toEqual(['SelectComponent']);
        expect(result.components[0].parts!.map((p) => p.className)).toEqual(['OptionComponent']);
    });

    it('does not change the manifest it was given', async () => {
        const manifest: PrismManifest = { components: [SELECT, OPTION] };

        await runPluginHooks(manifest, []);

        expect(manifest.components).toEqual([SELECT, OPTION]);
        expect(SELECT).not.toHaveProperty('parts');
    });

    it('leaves a manifest without parts as it is', async () => {
        const result = await runPluginHooks({ components: [SELECT] }, []);

        expect(result.components[0]).not.toHaveProperty('parts');
    });
});
