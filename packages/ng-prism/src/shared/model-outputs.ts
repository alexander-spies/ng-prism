import type { InputMeta, OutputMeta } from '../plugin/plugin.types.js';

/** The output Angular adds for a `model()` input a template binds as `input`, which `[(input)]` listens to. Since 22.7.0. */
export function modelChangeOutput(input: string): string {
    return `${input}Change`;
}

/**
 * The outputs a template binds on a component or directive, by alias or name: its outputs, then the change output
 * Angular adds for each `model()` input, which the scan does not list among the outputs. Since 22.7.0.
 */
export function publicOutputNames({ inputs, outputs }: { inputs: readonly InputMeta[]; outputs: readonly OutputMeta[] }): string[] {
    return [
        ...outputs.map((output) => output.alias ?? output.name),
        ...inputs.filter((input) => input.model).map((input) => modelChangeOutput(input.alias ?? input.name))
    ];
}
