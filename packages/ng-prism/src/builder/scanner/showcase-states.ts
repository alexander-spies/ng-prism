import type { ShowcaseState } from '../../decorator/showcase.types.js';
import { describeValue, readPseudoStates } from './pseudo-states.js';

/**
 * `ShowcaseConfig.states` as the scanner evaluated it, with everything it
 * cannot use reported. `undefined` when it is no list, or an empty one.
 *
 * Every slot of the list survives, because a state is identified by its
 * position (the URL, the marker and the discovery manifest use it): an
 * unusable entry becomes a state without pseudo states, which the styleguide
 * shows as an empty column, instead of shifting the entries behind it.
 * A state without a usable name is called `State <position>`.
 */
export function readShowcaseStates(value: unknown, className: string, report: (message: string) => void): ShowcaseState[] | undefined {
    if (!Array.isArray(value)) {
        report(`${className} declares invalid states ${describeValue(value)}, expected a list of { name, pseudo }. Skipping.`);
        return undefined;
    }

    if (value.length === 0) return undefined;

    const firstIndexOfName = new Map<string, number>();

    return value.map((entry: unknown, index): ShowcaseState => {
        const state = typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? (entry as Record<string, unknown>) : undefined;
        const declaredName = state?.['name'];
        const hasName = typeof declaredName === 'string' && declaredName.trim() !== '';

        if (!state) report(`${className} states[${index}] is ${describeValue(entry)}, expected { name, pseudo }. Its column stays empty.`);
        else if (!hasName) report(`${className} states[${index}] has no name, expected a non-empty string. Calling it "State ${index + 1}".`);

        const name = hasName ? declaredName : `State ${index + 1}`;
        const first = firstIndexOfName.get(name);

        if (first !== undefined) {
            report(`${className} state "${name}" repeats the name of states[${first}]; only the first one is used. Its column stays empty.`);
            return { name, pseudo: {} };
        }
        firstIndexOfName.set(name, index);

        if (!state) return { name, pseudo: {} };

        if (state['pseudo'] === undefined) {
            report(`${className} state "${name}" declares no pseudo states. Its column stays empty.`);
            return { name, pseudo: {} };
        }

        return { name, pseudo: readPseudoStates(state['pseudo'], `${className} state "${name}"`, report) ?? {} };
    });
}
