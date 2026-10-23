import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT } from '../../shared/composition.js';
import { buildInputBindings, PRISM_CONTENT_INPUT, unboundInputs } from './input-bindings.js';

function makeComp(
    overrides: Partial<{
        inputs: RuntimeComponent['meta']['inputs'];
        isDirective: boolean;
        composition: RuntimeComponent['meta']['composition'];
    }> = {}
): RuntimeComponent {
    const type = class {} as any;

    return {
        type,
        ...(overrides.composition && { composition: type }),
        meta: {
            className: 'Comp',
            filePath: '/test.ts',
            showcaseConfig: { title: 'Test' },
            inputs: overrides.inputs ?? [],
            outputs: [],
            componentMeta: {
                selector: 'test',
                standalone: true,
                isDirective: overrides.isDirective ?? false
            },
            ...(overrides.composition && { composition: overrides.composition })
        }
    };
}

const SLOT = COMPOSITION_SUBJECT_SLOT;
const INPUTS: RuntimeComponent['meta']['inputs'] = [
    { name: 'label', alias: 'libLabel', type: 'string', required: false },
    { name: 'required', type: 'boolean', defaultValue: false, required: false }
];

/** Every variant composed: variant 0's template sets `required` itself, variant 1 leaves it to ng-prism. */
const owned = makeComp({
    inputs: INPUTS,
    composition: {
        variantCases: [0, 1],
        cases: [
            { template: `<lib-field${SLOT} required />`, unbound: [{ name: 'required', reason: 'template' }] },
            { template: `<section><lib-field${SLOT} /></section>`, unbound: [] }
        ]
    }
});

describe('buildInputBindings', () => {
    it('maps every declared input of a component to the name setInput takes', () => {
        const comp = makeComp({
            inputs: [
                { name: 'label', type: 'string', required: false },
                { name: 'size', alias: 'buttonSize', type: 'string', required: false }
            ]
        });

        const bindings = buildInputBindings(comp);

        expect([...bindings]).toEqual([
            ['label', 'label'],
            ['size', 'buttonSize']
        ]);
    });

    it('keeps member names for a directive, whose generated host declares the inputs under them', () => {
        const comp = makeComp({
            isDirective: true,
            inputs: [{ name: 'tooltipText', alias: 'libTooltip', type: 'string', required: false }]
        });

        const bindings = buildInputBindings(comp);

        expect(bindings.get('tooltipText')).toBe('tooltipText');
        expect(bindings.get(PRISM_CONTENT_INPUT)).toBe(PRISM_CONTENT_INPUT);
    });

    it('does not add __prismContent__ for non-directive components', () => {
        const comp = makeComp({ isDirective: false });

        expect(buildInputBindings(comp).has(PRISM_CONTENT_INPUT)).toBe(false);
    });

    it('binds member names without the unbound inputs of the case', () => {
        expect([...buildInputBindings(owned, 0)]).toEqual([['label', 'label']]); // required unbound by template
        expect([...buildInputBindings(owned, 1)]).toEqual([
            ['label', 'label'],
            ['required', 'required']
        ]);
    });

    it('binds a variant without a composition as before', () => {
        const mixed = makeComp({ inputs: INPUTS, composition: { variantCases: [-1, 0], cases: owned.meta.composition!.cases } });

        expect(buildInputBindings(mixed, 0)).toEqual(buildInputBindings(mixed));
        expect(buildInputBindings(mixed, 0).get('label')).toBe('libLabel');
    });

    it('does not bind __prismContent__ for a composed directive, whose wrapper does not declare it', () => {
        const directive = makeComp({ isDirective: true, inputs: INPUTS, composition: owned.meta.composition });

        expect(buildInputBindings(directive, 1).has(PRISM_CONTENT_INPUT)).toBe(false);
        expect(buildInputBindings(directive).has(PRISM_CONTENT_INPUT)).toBe(true);
    });
});

describe('unboundInputs', () => {
    it('lists what a composed variant leaves out on purpose: the unbound inputs of its case and __prismContent__', () => {
        expect([...unboundInputs(owned, 0)].sort()).toEqual([PRISM_CONTENT_INPUT, 'required']);
        expect([...unboundInputs(owned, 1)]).toEqual([PRISM_CONTENT_INPUT]);
    });

    it('is empty for a variant without a composition', () => {
        expect(unboundInputs(makeComp({ inputs: INPUTS }), 0).size).toBe(0);
    });
});
