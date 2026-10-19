import type { RuntimeComponent } from '../../plugin/plugin.types.js';

/** Synthetic input the manifest generator emits on directive wrapper classes
 * to project per-variant `content` text into the host element. The directive
 * itself doesn't declare it, so it isn't in `meta.inputs`, and code that
 * validates / filters inputs against that list must allow this key through.
 */
export const PRISM_CONTENT_INPUT = '__prismContent__';

/**
 * The inputs a variant may set, by class member name, each mapped to the name
 * `ComponentRef.setInput` takes. Angular resolves that by the public name, so a
 * component's aliased input maps to its alias. A directive renders inside the
 * generated `__PrismHost` wrapper, which declares the inputs under their member
 * names and binds the aliases itself.
 */
export function buildInputBindings(comp: RuntimeComponent): Map<string, string> {
    const isDirective = comp.meta.componentMeta.isDirective;
    const bindings = new Map(comp.meta.inputs.map((i) => [i.name, isDirective ? i.name : (i.alias ?? i.name)]));

    if (isDirective) {
        bindings.set(PRISM_CONTENT_INPUT, PRISM_CONTENT_INPUT);
    }
    return bindings;
}
