import type { InputMeta, RuntimeComponent } from '../../../plugin/plugin.types.js';
import { activeCase } from '../../renderer/composition.js';

/**
 * Angular framework reference types that aren't meaningfully editable via
 * a JSON textarea (they wrap live framework objects, not data). When a
 * showcased component declares an input of one of these types, the controls
 * panel renders a "Not editable" placeholder instead of routing it through
 * the JsonControl, which would otherwise crash on `undefined`/non-serializable
 * defaults and presents a misleading editor to the developer anyway.
 */
const NON_EDITABLE_TYPE_NAMES = ['TemplateRef', 'ElementRef', 'ViewContainerRef'] as const;

const NON_EDITABLE_TYPE_PATTERN = new RegExp(`\\b(?:${NON_EDITABLE_TYPE_NAMES.join('|')})\\b`);

export function isNonEditableInputType(input: InputMeta): boolean {
    const raw = input.rawType;

    if (!raw) return false;
    return NON_EDITABLE_TYPE_PATTERN.test(raw);
}

const UNBOUND_REASONS = {
    template: 'Set by the template of this variant',
    default: 'Its default is unknown to ng-prism'
} as const;

/**
 * Why the controls panel cannot edit `input` in variant `variantIndex`, `null`
 * when it can: the composition of the variant does not bind it, because its
 * template sets it or because its default is unknown, or its type is a
 * framework reference. The first two hold for the variant, the last for every
 * variant.
 */
export function nonEditableReason(input: InputMeta, comp: RuntimeComponent, variantIndex: number): string | null {
    const unbound = activeCase(comp, variantIndex)?.unbound.find(({ name }) => name === input.name);

    if (unbound) return UNBOUND_REASONS[unbound.reason];
    return isNonEditableInputType(input) ? 'Framework reference type' : null;
}
