import type { Type } from '@angular/core';
import type { CompositionCase, RuntimeComponent } from '../../plugin/plugin.types.js';

/**
 * The composition variant `variantIndex` renders in, `null` for a variant without one, which renders the class (or the
 * `__PrismHost` of a directive) as before. Also `null` when the manifest has no wrapper to render the case in.
 */
export function activeCase(comp: RuntimeComponent, variantIndex: number): CompositionCase | null {
    const composition = comp.meta.composition;

    if (!composition || !comp.composition) return null;
    const caseIndex = composition.variantCases[variantIndex] ?? -1;

    return caseIndex < 0 ? null : (composition.cases[caseIndex] ?? null);
}

/** The class to create for variant `variantIndex`: the composition wrapper for a composed variant, else `comp.type`. */
export function renderTypeFor(comp: RuntimeComponent, variantIndex: number): Type<unknown> {
    return activeCase(comp, variantIndex) && comp.composition ? comp.composition : comp.type;
}

/** What a render consists of: when two are the same, a variant switch sets the inputs on the instance instead of creating a new one. */
export interface RenderSignature {
    type: Type<unknown>;
    /** `variantIndex` only for a composed variant: two composed variants are two renders even with equal inputs. */
    variantIndex: number | null;
    content: string | Record<string, string> | undefined;
}

export function renderSignature(comp: RuntimeComponent, variantIndex: number, content: RenderSignature['content']): RenderSignature {
    return {
        type: renderTypeFor(comp, variantIndex),
        variantIndex: activeCase(comp, variantIndex) ? variantIndex : null,
        content
    };
}

/** Whether `b` renders what `a` rendered, `a` being `null` while nothing is rendered. Content compares by identity. */
export function sameRender(a: RenderSignature | null, b: RenderSignature): boolean {
    return a !== null && a.type === b.type && a.variantIndex === b.variantIndex && a.content === b.content;
}
