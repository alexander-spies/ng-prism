import type { InputMeta, RuntimePart } from '../../plugin/plugin.types.js';
import { type StatusBadge, statusBadge } from './status-badge.js';

/** One input or output in the popover of a part. An output has neither type nor default. */
export interface PartRow {
    name: string;
    type?: string;
    defaultValue?: string;
    required?: boolean;
    doc?: string;
}

/** A part of the active component as the head shows it: a chip, and the popover that opens from it. */
export interface PartChip {
    className: string;
    title: string;
    selector: string;
    /** The id of the popover and the `popovertarget` of the chip: one per part, so every chip opens its own card. */
    popoverId: string;
    /** The CSS anchor name of the chip, which the card positions itself against. */
    anchorName: string;
    status: StatusBadge | null;
    description?: string;
    inputs: PartRow[];
    outputs: PartRow[];
}

/**
 * The default of an input as it is written in a template: a string in single
 * quotes, anything else as JSON. `undefined` for an input that starts out
 * without one, and `…` for one that has a default the scan could not evaluate.
 */
export function formatPartDefault(input: InputMeta): string | undefined {
    if (input.defaultUnreadable) return '…';
    const value = input.defaultValue;

    if (value === undefined) return undefined;
    return typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
}

/**
 * The chips of the parts of a component, in the order given: the manifest
 * already sorts them by title. Inputs and outputs go by the name a template
 * binds them with, so an alias wins over the class member.
 */
export function partChips(parts: readonly RuntimePart[] | undefined): PartChip[] {
    return (parts ?? []).map(({ meta }) => ({
        className: meta.className,
        title: meta.showcaseConfig.title,
        selector: meta.componentMeta.selector,
        popoverId: `prism-part-${meta.className}`,
        anchorName: `--prism-part-${meta.className}`,
        status: statusBadge(meta.showcaseConfig.status),
        description: meta.showcaseConfig.description,
        inputs: meta.inputs.map((input) => ({
            name: input.alias ?? input.name,
            type: input.rawType ?? input.type,
            defaultValue: formatPartDefault(input),
            required: input.required,
            doc: input.doc
        })),
        outputs: meta.outputs.map((output) => ({ name: output.alias ?? output.name, doc: output.doc }))
    }));
}
