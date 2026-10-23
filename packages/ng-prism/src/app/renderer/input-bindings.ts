import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { activeCase } from './composition.js';

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
 *
 * With `variantIndex`, a composed variant renders in the composition wrapper,
 * which declares the inputs under their member names as well, and only those
 * its case binds.
 */
export function buildInputBindings(comp: RuntimeComponent, variantIndex?: number): Map<string, string> {
    const composition = variantIndex === undefined ? null : activeCase(comp, variantIndex);

    if (composition) {
        const unbound = new Set(composition.unbound.map(({ name }) => name));

        return new Map(comp.meta.inputs.filter(({ name }) => !unbound.has(name)).map(({ name }) => [name, name]));
    }

    const isDirective = comp.meta.componentMeta.isDirective;
    const bindings = new Map(comp.meta.inputs.map((i) => [i.name, isDirective ? i.name : (i.alias ?? i.name)]));

    if (isDirective) {
        bindings.set(PRISM_CONTENT_INPUT, PRISM_CONTENT_INPUT);
    }
    return bindings;
}

/**
 * What a composed variant leaves out of {@link buildInputBindings} on purpose:
 * the inputs its case does not bind, and `__prismContent__`, which only the
 * `__PrismHost` of a directive declares. A value for one of them is skipped
 * without the warning about an unknown input. Empty for a variant without a
 * composition.
 */
export function unboundInputs(comp: RuntimeComponent, variantIndex: number): ReadonlySet<string> {
    const composition = activeCase(comp, variantIndex);

    return new Set(composition ? [...composition.unbound.map(({ name }) => name), PRISM_CONTENT_INPUT] : []);
}
