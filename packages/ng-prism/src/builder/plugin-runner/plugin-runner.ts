import type { NgPrismPlugin, PrismManifest } from '../../plugin/plugin.types.js';

function pluginLabel(plugin: NgPrismPlugin): string {
    return plugin.name ? `"${plugin.name}"` : '<unnamed>';
}

function wrapPluginError(plugin: NgPrismPlugin, hook: string, target: string, err: unknown): Error {
    const cause = err instanceof Error ? err.message : String(err);
    const wrapped = new Error(`ng-prism: plugin ${pluginLabel(plugin)} failed in ${hook} for ${target}: ${cause}`, err instanceof Error ? { cause: err } : undefined);

    if (err instanceof Error && err.stack) {
        wrapped.stack = `${wrapped.message}\nCaused by: ${err.stack}`;
    }
    return wrapped;
}

/** The hooks that run once per scanned item, in the order the plugins are listed. */
type ItemHookName = 'onComponentScanned' | 'onServiceScanned' | 'onPipeScanned' | 'onPageScanned';

type ItemOf<K extends ItemHookName> = Parameters<NonNullable<NgPrismPlugin[K]>>[0];

type ItemHook<T> = (item: T) => T | void | Promise<T | void>;

/**
 * Runs a per-item hook over every item: each item goes through all plugins in
 * turn, and a plugin that returns a value replaces the item for the next one.
 */
async function runItemHook<K extends ItemHookName>(
    items: readonly ItemOf<K>[],
    plugins: NgPrismPlugin[],
    hook: K,
    label: (item: ItemOf<K>) => string
): Promise<ItemOf<K>[]> {
    const done: ItemOf<K>[] = [];

    for (const item of items) {
        let current = item;

        for (const plugin of plugins) {
            const run = plugin[hook] as ItemHook<ItemOf<K>> | undefined;

            if (run) {
                try {
                    const result = await run.call(plugin, current);

                    if (result) {
                        current = result;
                    }
                } catch (err) {
                    throw wrapPluginError(plugin, hook, label(current), err);
                }
            }
        }
        done.push(current);
    }
    return done;
}

export async function runPluginHooks(manifest: PrismManifest, plugins: NgPrismPlugin[]): Promise<PrismManifest> {
    const components = await runItemHook(manifest.components, plugins, 'onComponentScanned', (component) => `component "${component.className}"`);
    const services = await runItemHook(manifest.services ?? [], plugins, 'onServiceScanned', (service) => `service "${service.className}"`);
    const pipes = await runItemHook(manifest.pipes ?? [], plugins, 'onPipeScanned', (pipe) => `pipe "${pipe.className}"`);
    const pages = await runItemHook(manifest.pages ?? [], plugins, 'onPageScanned', (page) => `page "${page.title}"`);

    let result: PrismManifest = { components, pages };

    if (manifest.services) {
        result.services = services;
    }
    if (manifest.pipes) {
        result.pipes = pipes;
    }
    if (manifest.meta) {
        result.meta = manifest.meta;
    }

    for (const plugin of plugins) {
        if (plugin.onManifestReady) {
            try {
                const updated = await plugin.onManifestReady(result);

                if (updated) {
                    result = updated;
                }
            } catch (err) {
                throw wrapPluginError(plugin, 'onManifestReady', 'manifest', err);
            }
        }
    }

    return result;
}
