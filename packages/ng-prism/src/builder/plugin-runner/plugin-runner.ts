import type { StyleguidePage } from '../../plugin/page.types.js';
import type { NgPrismPlugin, PrismManifest, ScannedComponent } from '../../plugin/plugin.types.js';
import type { ScannedService } from '../../plugin/service.types.js';

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

export async function runPluginHooks(manifest: PrismManifest, plugins: NgPrismPlugin[]): Promise<PrismManifest> {
    const components = [...manifest.components];

    for (let i = 0; i < components.length; i++) {
        let current: ScannedComponent = components[i];

        for (const plugin of plugins) {
            if (plugin.onComponentScanned) {
                try {
                    const result = await plugin.onComponentScanned(current);

                    if (result) {
                        current = result;
                    }
                } catch (err) {
                    throw wrapPluginError(plugin, 'onComponentScanned', `component "${current.className}"`, err);
                }
            }
        }
        components[i] = current;
    }

    const services = [...(manifest.services ?? [])];

    for (let i = 0; i < services.length; i++) {
        let current: ScannedService = services[i];

        for (const plugin of plugins) {
            if (plugin.onServiceScanned) {
                try {
                    const result = await plugin.onServiceScanned(current);

                    if (result) {
                        current = result;
                    }
                } catch (err) {
                    throw wrapPluginError(plugin, 'onServiceScanned', `service "${current.className}"`, err);
                }
            }
        }
        services[i] = current;
    }

    const pages = [...(manifest.pages ?? [])];

    for (let i = 0; i < pages.length; i++) {
        let current: StyleguidePage = pages[i];

        for (const plugin of plugins) {
            if (plugin.onPageScanned) {
                try {
                    const result = await plugin.onPageScanned(current);

                    if (result) {
                        current = result;
                    }
                } catch (err) {
                    throw wrapPluginError(plugin, 'onPageScanned', `page "${current.title}"`, err);
                }
            }
        }
        pages[i] = current;
    }

    let result: PrismManifest = { components, pages };

    if (manifest.services) {
        result.services = services;
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
