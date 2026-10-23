import { COMPOSITION_SUBJECT_SLOT as SLOT, type CompositionCase, type InputMeta, type ScannedComponent } from '@ng-prism/core/plugin';
import { generateComponentUsage } from './component-usage.js';

function input(name: string, overrides: Partial<InputMeta> = {}): InputMeta {
    return { name, type: 'string', required: false, ...overrides };
}

function makeComponent(selector: string, overrides: Partial<ScannedComponent> = {}, componentMeta: Partial<ScannedComponent['componentMeta']> = {}): ScannedComponent {
    return {
        className: 'ButtonComponent',
        filePath: '/lib/button.component.ts',
        importPath: 'test-lib',
        showcaseConfig: { title: 'Button' },
        inputs: [],
        outputs: [],
        componentMeta: { selector, standalone: true, isDirective: false, ...componentMeta },
        ...overrides
    };
}

function makeDirective(selector: string, overrides: Partial<ScannedComponent> = {}): ScannedComponent {
    return makeComponent(selector, { className: 'FxDirective', ...overrides }, { isDirective: true });
}

/** The line of the template block, the snippet's last. */
function templateLine(component: ScannedComponent): string {
    return generateComponentUsage(component).split('\n').at(-1) ?? '';
}

const HEAD = [
    "import { ButtonComponent } from 'test-lib';",
    '',
    '// in the component that uses it',
    '@Component({ imports: [ButtonComponent], … })',
    '',
    '// in its template'
];

describe('generateComponentUsage', () => {
    it('shows a component without required inputs as a bare element', () => {
        expect(generateComponentUsage(makeComponent('lib-button', { inputs: [input('label')] }))).toBe([...HEAD, '<lib-button />'].join('\n'));
    });

    it('binds each required input by its public name, in source order', () => {
        const tabs = makeComponent('sg-tabs', {
            className: 'TabsComponent',
            inputs: [input('tabs', { required: true }), input('activeTabId'), input('size', { required: true })]
        });

        expect(templateLine(tabs)).toBe('<sg-tabs [tabs]="tabs" [size]="size" />');
    });

    it('binds an aliased input by its alias to the member', () => {
        const tabs = makeComponent('sg-tabs', { inputs: [input('items', { alias: 'tabs', required: true })] });

        expect(templateLine(tabs)).toBe('<sg-tabs [tabs]="items" />');
    });

    it('takes the first selector of a list', () => {
        expect(templateLine(makeComponent('fx-a, fx-b'))).toBe('<fx-a />');
    });

    it('keeps the element of an attribute selector and puts the attribute on it', () => {
        expect(templateLine(makeComponent('button[libButton]'))).toBe('<button libButton></button>');
    });

    it('falls back to a div for a component without an element in its selector', () => {
        expect(templateLine(makeComponent('[libCard]'))).toBe('<div libCard></div>');
    });

    it('reads attribute values and classes of a selector, and ignores the rest', () => {
        expect(templateLine(makeComponent('button[type=submit][role="button"].primary.large[data-x^=y]:not([disabled])'))).toBe(
            '<button type="submit" role="button" class="primary large"></button>'
        );
    });

    it('leaves a selector attribute out when a required input binds the same name', () => {
        const component = makeComponent('button[libButton]', { inputs: [input('variant', { alias: 'libButton', required: true })] });

        expect(templateLine(component)).toBe('<button [libButton]="variant"></button>');
    });

    it('closes a void element of an attribute selector itself', () => {
        expect(templateLine(makeComponent('input[libField]'))).toBe('<input libField />');
    });

    it('leaves the import line of a class without an import path out and still lists it', () => {
        expect(generateComponentUsage(makeComponent('lib-button', { importPath: undefined }))).toBe(
            ['// in the component that uses it', '@Component({ imports: [ButtonComponent], … })', '', '// in its template', '<lib-button />'].join('\n')
        );
    });

    describe('of a directive', () => {
        it('puts a required input on a div as a binding, and an optional attribute selector bare', () => {
            const required = makeDirective('[fxHint]', { inputs: [input('fxHint', { required: true })] });
            const optional = makeDirective('[fxHint]', { inputs: [input('fxHint')] });

            expect(templateLine(required)).toBe('<div [fxHint]="fxHint"></div>');
            expect(templateLine(optional)).toBe('<div fxHint></div>');
        });

        it('takes the element of its selector when there is no host', () => {
            expect(templateLine(makeDirective('button[libButton]'))).toBe('<button libButton></button>');
            expect(templateLine(makeDirective('input[fxMask]'))).toBe('<input fxMask />');
            expect(templateLine(makeDirective('fx-a, fx-b'))).toBe('<fx-a />');
        });

        it('takes the element of a string host and keeps its attributes as written', () => {
            expect(templateLine(makeDirective('input[fxMask]', { showcaseConfig: { title: 'Mask', host: '<input type="text" />' } }))).toBe(
                '<input type="text" fxMask />'
            );
            expect(templateLine(makeDirective('[fxMask]', { showcaseConfig: { title: 'Mask', host: '<button class="btn">' } }))).toBe(
                '<button class="btn" fxMask></button>'
            );
        });

        it('reads the element of a string host that has content and a closing tag, and drops both', () => {
            const required = makeDirective('[libTooltip]', {
                inputs: [input('libTooltip', { required: true })],
                showcaseConfig: { title: 'Tooltip', host: '<button class="btn">Hover me</button>' }
            });
            const optional = makeDirective('[fxHint]', {
                inputs: [input('fxHint')],
                showcaseConfig: { title: 'Hint', host: '<p>Some text</p>' }
            });

            expect(templateLine(required)).toBe('<button class="btn" [libTooltip]="libTooltip"></button>');
            expect(templateLine(optional)).toBe('<p fxHint></p>');
        });

        it('falls back to the element of the selector when the string host is no tag', () => {
            expect(templateLine(makeDirective('input[fxMask]', { showcaseConfig: { title: 'Mask', host: 'not a tag' } }))).toBe('<input fxMask />');
        });

        it('writes the host inputs as attributes, bindings for numbers and booleans', () => {
            const directive = makeDirective('[fxMask]', {
                showcaseConfig: {
                    title: 'Mask',
                    host: {
                        selector: 'lib-field',
                        import: { name: 'FieldComponent', from: 'test-lib' },
                        inputs: { disabled: true, count: 2, label: 'A "B"', items: [1] }
                    }
                }
            });

            expect(templateLine(directive)).toBe('<lib-field [disabled]="true" [count]="2" label="A &quot;B&quot;" [items]="items" fxMask />');
        });

        it('puts the host component first, then the directive attribute and the required inputs', () => {
            const tooltip = makeDirective('[libTooltip]', {
                className: 'TooltipDirective',
                inputs: [input('libTooltip', { required: true }), input('tooltipPosition')],
                showcaseConfig: {
                    title: 'Tooltip',
                    host: { selector: 'lib-button', import: { name: 'ButtonComponent', from: 'test-lib' }, inputs: { label: 'Hover me', variant: 'filled' } }
                }
            });

            expect(generateComponentUsage(tooltip)).toBe(
                [
                    "import { TooltipDirective, ButtonComponent } from 'test-lib';",
                    '',
                    '// in the component that uses it',
                    '@Component({ imports: [TooltipDirective, ButtonComponent], … })',
                    '',
                    '// in its template',
                    '<lib-button label="Hover me" variant="filled" [libTooltip]="libTooltip" />'
                ].join('\n')
            );
        });

        it('writes one import line per entry point, the directive first', () => {
            const directive = makeDirective('[fxMask]', {
                showcaseConfig: { title: 'Mask', host: { selector: 'lib-field', import: { name: 'FieldComponent', from: 'test-lib/field' } } }
            });

            expect(generateComponentUsage(directive).split('\n').slice(0, 4)).toEqual([
                "import { FxDirective } from 'test-lib';",
                "import { FieldComponent } from 'test-lib/field';",
                '',
                '// in the component that uses it'
            ]);
        });

        it('has only the host line when the directive has no import path', () => {
            const directive = makeDirective('[fxMask]', {
                importPath: undefined,
                showcaseConfig: { title: 'Mask', host: { selector: 'lib-field', import: { name: 'FieldComponent', from: 'test-lib' } } }
            });

            expect(generateComponentUsage(directive).split('\n')[0]).toBe("import { FieldComponent } from 'test-lib';");
            expect(generateComponentUsage(directive)).not.toContain('FxDirective }');
        });

        it('ignores the host of a component', () => {
            const component = makeComponent('lib-button', {
                showcaseConfig: { title: 'Button', host: '<input />' }
            });

            expect(templateLine(component)).toBe('<lib-button />');
        });

        it('does not stumble over an empty host', () => {
            const directive = makeDirective('input[libInput]', { showcaseConfig: { title: 'Input', host: null as never } });

            expect(templateLine(directive)).toBe('<input libInput />');
        });
    });

    describe('of a showcase with a host template', () => {
        const FRAME = `<lib-form-field label="Name"><input libInput type="text"${SLOT} /></lib-form-field>`;

        function composedCase(template: string, unbound: CompositionCase['unbound'] = []): CompositionCase {
            return { template, unbound };
        }

        function inputInFrame(overrides: Partial<ScannedComponent> = {}): ScannedComponent {
            return makeDirective('input[libInput]', {
                className: 'InputDirective',
                showcaseConfig: { title: 'Input', host: { template: '<lib-form-field label="Name"><input libInput type="text" /></lib-form-field>' } },
                composition: {
                    variantCases: [0],
                    cases: [composedCase(FRAME)],
                    imports: [{ name: 'FormFieldComponent', from: 'test-lib' }]
                },
                ...overrides
            });
        }

        it('shows a directive inside its host template', () => {
            expect(generateComponentUsage(inputInFrame())).toContain('<lib-form-field label="Name"><input libInput type="text" /></lib-form-field>');
            expect(generateComponentUsage(inputInFrame())).toContain('imports: [InputDirective, FormFieldComponent]');
        });

        it('writes the whole snippet from the subject, the composition imports and the case', () => {
            expect(generateComponentUsage(inputInFrame())).toBe(
                [
                    "import { InputDirective, FormFieldComponent } from 'test-lib';",
                    '',
                    '// in the component that uses it',
                    '@Component({ imports: [InputDirective, FormFieldComponent], … })',
                    '',
                    '// in its template',
                    '<lib-form-field label="Name"><input libInput type="text" /></lib-form-field>'
                ].join('\n')
            );
        });

        it('leaves nothing of the slot behind', () => {
            expect(generateComponentUsage(inputInFrame())).not.toContain(SLOT);
        });

        it('writes one import line per entry point, the subject first', () => {
            const component = inputInFrame({
                composition: {
                    variantCases: [0],
                    cases: [composedCase(FRAME)],
                    imports: [
                        { name: 'FormFieldComponent', from: 'test-lib/form-field' },
                        { name: 'LabelComponent', from: 'test-lib' }
                    ]
                }
            });

            expect(generateComponentUsage(component).split('\n').slice(0, 4)).toEqual([
                "import { InputDirective, LabelComponent } from 'test-lib';",
                "import { FormFieldComponent } from 'test-lib/form-field';",
                '',
                '// in the component that uses it'
            ]);
        });

        it('imports only the subject when the composition has no imports', () => {
            const component = inputInFrame({ composition: { variantCases: [0], cases: [composedCase(FRAME)] } });

            expect(generateComponentUsage(component)).toContain('@Component({ imports: [InputDirective], … })');
        });

        it('puts the required inputs on the subject in place of the slot, bound by their public names', () => {
            const component = inputInFrame({
                inputs: [input('placeholderText', { alias: 'placeholder', required: true }), input('size'), input('label', { required: true })]
            });

            expect(templateLine(component)).toBe(
                '<lib-form-field label="Name"><input libInput type="text" [placeholder]="placeholderText" [label]="label" /></lib-form-field>'
            );
        });

        it('leaves out a required input that the template sets itself', () => {
            const component = inputInFrame({
                inputs: [input('label', { required: true }), input('size', { required: true })],
                composition: {
                    variantCases: [0],
                    cases: [composedCase(`<lib-form-field label="Name"><input libInput [size]="3"${SLOT} /></lib-form-field>`, [{ name: 'size', reason: 'template' }])]
                }
            });

            expect(templateLine(component)).toBe('<lib-form-field label="Name"><input libInput [size]="3" [label]="label" /></lib-form-field>');
        });

        it('takes the case of the first variant that has a composition', () => {
            const component = inputInFrame({
                composition: {
                    variantCases: [-1, 1, 0],
                    cases: [composedCase(`<p><input libInput${SLOT} /></p>`), composedCase(`<label><input libInput${SLOT} /></label>`)]
                }
            });

            expect(templateLine(component)).toBe('<label><input libInput /></label>');
        });

        it('shows a component inside its host template as well', () => {
            const component = makeComponent('lib-chip', {
                className: 'ChipComponent',
                inputs: [input('label', { required: true })],
                showcaseConfig: { title: 'Chip', host: { template: '<lib-chip-list><lib-chip /></lib-chip-list>' } },
                composition: {
                    variantCases: [0],
                    cases: [composedCase(`<lib-chip-list><lib-chip${SLOT} /></lib-chip-list>`)],
                    imports: [{ name: 'ChipListComponent', from: 'test-lib' }]
                }
            });

            expect(generateComponentUsage(component)).toBe(
                [
                    "import { ChipComponent, ChipListComponent } from 'test-lib';",
                    '',
                    '// in the component that uses it',
                    '@Component({ imports: [ChipComponent, ChipListComponent], … })',
                    '',
                    '// in its template',
                    '<lib-chip-list><lib-chip [label]="label" /></lib-chip-list>'
                ].join('\n')
            );
        });

        it('falls back to the element of the selector when no variant has a composition', () => {
            const unscanned = inputInFrame({ composition: undefined });
            const uncomposed = inputInFrame({ composition: { variantCases: [-1], cases: [], imports: [{ name: 'FormFieldComponent', from: 'test-lib' }] } });

            expect(templateLine(unscanned)).toBe('<input libInput />');
            expect(templateLine(uncomposed)).toBe('<input libInput />');
            expect(generateComponentUsage(uncomposed)).toContain('@Component({ imports: [InputDirective], … })');
        });
    });
});
