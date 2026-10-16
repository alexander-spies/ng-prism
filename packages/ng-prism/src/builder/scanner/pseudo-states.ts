import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoState, type PseudoTarget } from '../../shared/pseudo-state.type.js';

function isPseudoState(value: string): value is PseudoState {
    return (PSEUDO_STATES as readonly string[]).includes(value);
}

function isSelector(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

function describeValue(value: unknown): string {
    if (typeof value === 'string' || (typeof value === 'object' && value !== null)) return JSON.stringify(value) ?? String(value);
    return String(value);
}

/**
 * `Variant.pseudo` as the scanner evaluated it, with everything it cannot use
 * reported and dropped: a value that is no object, an unknown state, and a
 * target that is neither `true` nor selectors. `undefined` when nothing is left.
 *
 * Selectors are checked to be non-empty strings only. Whether one parses is up
 * to the browser, which warns about it once the variant renders.
 */
export function readPseudoStates(value: unknown, where: string, report: (message: string) => void): ForcedPseudoStates | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        report(`${where} declares invalid pseudo ${describeValue(value)}, expected an object mapping pseudo states to true or selectors. Skipping.`);
        return undefined;
    }

    const states: ForcedPseudoStates = {};

    for (const [state, target] of Object.entries(value as Record<string, unknown>)) {
        if (!isPseudoState(state)) {
            report(`${where} declares unknown pseudo state "${state}", expected one of: ${PSEUDO_STATES.join(', ')}. Skipping.`);
            continue;
        }
        const read = readTarget(target, `${where} declares pseudo state "${state}"`, report);

        if (read !== undefined) states[state] = read;
    }

    return Object.keys(states).length > 0 ? states : undefined;
}

function readTarget(target: unknown, where: string, report: (message: string) => void): PseudoTarget | undefined {
    if (target === true || isSelector(target)) return target;

    if (typeof target === 'string') {
        report(`${where} with an empty selector. Skipping.`);
        return undefined;
    }

    if (Array.isArray(target)) {
        const selectors = target.filter(isSelector);
        const invalid = target.filter((entry) => !isSelector(entry));

        if (invalid.length > 0) {
            report(
                `${where} with ${invalid.map(describeValue).join(', ')} in its selector list, expected non-empty strings. Skipping ${invalid.length === 1 ? 'it' : 'them'}.`
            );
        } else if (selectors.length === 0) {
            report(`${where} with an empty selector list. Skipping.`);
        }
        return selectors.length > 0 ? selectors : undefined;
    }

    report(`${where} with invalid target ${describeValue(target)}, expected true, a selector or a list of selectors. Skipping.`);
    return undefined;
}
