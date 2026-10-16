import type { DiscoveryComponent, DiscoveryManifest, DiscoveryVariant, RuntimeManifest } from '../plugin/plugin.types.js';
import type { ForcedPseudoStates } from '../shared/pseudo-state.type.js';
import { resolveVariantBg } from '../shared/variant-bg.js';
import { forcesAnyState } from './pseudo/pseudo-state-marker.js';

/**
 * External tooling reads `__PRISM_MANIFEST__` through a structured-clone bridge
 * (Playwright's `page.evaluate()`, `postMessage`, devtools). `ShowcaseConfig.meta`
 * is an open `Record<string, unknown>`, and a class, function or cyclic object
 * in it makes that bridge throw or drop the whole payload.
 *
 * So only JSON-safe values cross: primitives, arrays and plain-prototype
 * objects. Class instances, functions, symbols, Dates, Maps and DOM nodes are
 * dropped and cycles are broken. Unrepresentable array elements become `null`,
 * as in `JSON.stringify`, so indices stay stable.
 */
function toSerializable(value: unknown, seen: Set<object>): unknown {
    if (value === null) return null;

    const type = typeof value;

    if (type === 'string' || type === 'boolean') return value;
    if (type === 'number') return Number.isFinite(value) ? value : undefined;
    if (type !== 'object') return undefined;

    const object = value as object;

    if (seen.has(object)) return undefined;

    if (Array.isArray(object)) {
        seen.add(object);
        const items = object.map((item) => {
            const serialized = toSerializable(item, seen);

            return serialized === undefined ? null : serialized;
        });

        seen.delete(object);
        return items;
    }

    const proto = Object.getPrototypeOf(object) as object | null;

    if (proto !== Object.prototype && proto !== null) return undefined;

    seen.add(object);
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(object)) {
        const serialized = toSerializable(item, seen);

        if (serialized !== undefined) result[key] = serialized;
    }
    seen.delete(object);
    return result;
}

/** Sanitised `meta`, or `undefined` when there is nothing worth exposing. */
export function serializableMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!meta) return undefined;
    const serialized = toSerializable(meta, new Set()) as Record<string, unknown> | undefined;

    if (!serialized || Object.keys(serialized).length === 0) return undefined;
    return serialized;
}

/**
 * Builds the discovery view of the manifest, i.e. what `__PRISM_MANIFEST__` exposes.
 *
 * It is not the runtime manifest: no Angular class references, no
 * providers, no scanned input/output metadata. It carries what an external tool
 * needs to enumerate and address variants, plus the `@Showcase` metadata that
 * lets a tool decide how to treat one.
 */
export function buildDiscoveryManifest(manifest: RuntimeManifest): DiscoveryManifest {
    return {
        components: manifest.components.map((component): DiscoveryComponent => {
            const { className, showcaseConfig } = component.meta;

            // An empty `variants` array is not "no variants": the renderer still
            // instantiates the component with its declared defaults at index 0 and
            // marks it `data-prism-rendered="<class>:0"`. Reporting zero variants
            // here would let a runner walk past a component the app happily renders.
            // That's the quiet coverage loss the `excluded` status exists to prevent.
            const declared = showcaseConfig.variants ?? [];
            const variants: DiscoveryVariant[] = declared.length
                ? declared.map((variant, index) => {
                      const meta = serializableMeta(variant.meta);
                      const pseudo = forcesAnyState(variant.pseudo) ? (serializableMeta(variant.pseudo) as ForcedPseudoStates | undefined) : undefined;
                      const discovered: DiscoveryVariant = { name: variant.name, index, bg: resolveVariantBg(showcaseConfig, index) };

                      if (meta) discovered.meta = meta;
                      if (pseudo) discovered.pseudo = pseudo;
                      return discovered;
                  })
                : [
                      {
                          name: 'Default',
                          index: 0,
                          bg: resolveVariantBg(showcaseConfig, 0)
                      }
                  ];

            const meta = serializableMeta(showcaseConfig.meta);
            const discovered: DiscoveryComponent = {
                className,
                title: showcaseConfig.title,
                variants
            };

            if (meta) discovered.meta = meta;
            return discovered;
        }),
        pages: (manifest.pages ?? []).map((page) => ({ title: page.title }))
    };
}
