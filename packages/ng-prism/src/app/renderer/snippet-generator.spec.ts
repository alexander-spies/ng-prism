import type { InputMeta } from '../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT as SLOT } from '../../shared/composition.js';
import { generateCompositionSnippet, generateSnippet, subjectAttributes } from './snippet-generator.js';

function meta(overrides: Partial<InputMeta> & Pick<InputMeta, 'name'>): InputMeta {
    return { type: 'string', required: false, ...overrides };
}

describe('generateSnippet', () => {
    it('should return self-closing tag when no inputs have values', () => {
        expect(generateSnippet('lib-button', [], {})).toBe('<lib-button />');
    });

    it('should render string inputs as plain attributes', () => {
        const inputs = [meta({ name: 'label' })];
        const result = generateSnippet('lib-button', inputs, { label: 'Save' });

        expect(result).toBe('<lib-button label="Save" />');
    });

    it('should render boolean true with binding syntax', () => {
        const inputs = [meta({ name: 'disabled', type: 'boolean' })];
        const result = generateSnippet('lib-button', inputs, { disabled: true });

        expect(result).toBe('<lib-button [disabled]="true" />');
    });

    it('should omit boolean false', () => {
        const inputs = [meta({ name: 'disabled', type: 'boolean' })];
        const result = generateSnippet('lib-button', inputs, { disabled: false });

        expect(result).toBe('<lib-button />');
    });

    it('should render number with binding syntax', () => {
        const inputs = [meta({ name: 'count', type: 'number' })];
        const result = generateSnippet('lib-button', inputs, { count: 42 });

        expect(result).toBe('<lib-button [count]="42" />');
    });

    it('should render object/array as placeholder', () => {
        const inputs = [meta({ name: 'data', type: 'object' })];
        const result = generateSnippet('lib-button', inputs, { data: { foo: 1 } });

        expect(result).toBe('<lib-button [data]="yourData" />');
    });

    it('should omit inputs with undefined value', () => {
        const inputs = [meta({ name: 'label' }), meta({ name: 'variant' })];
        const result = generateSnippet('lib-button', inputs, { label: 'Save' });

        expect(result).toBe('<lib-button label="Save" />');
    });

    it('should omit inputs matching their default value', () => {
        const inputs = [meta({ name: 'variant', defaultValue: 'primary' }), meta({ name: 'label' })];
        const result = generateSnippet('lib-button', inputs, {
            variant: 'primary',
            label: 'Save'
        });

        expect(result).toBe('<lib-button label="Save" />');
    });

    it('should render single-line when total length fits in 80 chars', () => {
        const inputs = [meta({ name: 'variant' }), meta({ name: 'label' }), meta({ name: 'disabled', type: 'boolean' })];
        const result = generateSnippet('lib-button', inputs, {
            variant: 'filled',
            label: 'Save',
            disabled: true
        });

        expect(result).toBe('<lib-button variant="filled" label="Save" [disabled]="true" />');
    });

    it('should render multiline when total length exceeds 80 chars', () => {
        const inputs = [meta({ name: 'variant' }), meta({ name: 'label' }), meta({ name: 'placeholder' }), meta({ name: 'disabled', type: 'boolean' })];
        const result = generateSnippet('my-long-component-selector', inputs, {
            variant: 'filled',
            label: 'Save Changes',
            placeholder: 'Enter something here',
            disabled: true
        });

        expect(result).toBe(`<my-long-component-selector\n  variant="filled"\n  label="Save Changes"\n  placeholder="Enter something here"\n  [disabled]="true" />`);
    });

    it('should render boolean false when the input defaults to true', () => {
        const inputs = [meta({ name: 'truncateLabel', type: 'boolean', defaultValue: true })];
        const result = generateSnippet('lib-toggle', inputs, {
            truncateLabel: false
        });

        expect(result).toBe('<lib-toggle [truncateLabel]="false" />');
    });

    it('should omit a boolean matching its true default', () => {
        const inputs = [meta({ name: 'truncateLabel', type: 'boolean', defaultValue: true })];
        const result = generateSnippet('lib-toggle', inputs, {
            truncateLabel: true
        });

        expect(result).toBe('<lib-toggle />');
    });

    it('should omit a boolean matching its false default', () => {
        const inputs = [meta({ name: 'disabled', type: 'boolean', defaultValue: false })];
        const result = generateSnippet('lib-button', inputs, { disabled: false });

        expect(result).toBe('<lib-button />');
    });

    it('should render boolean false for an explicitly keyed input with a false default', () => {
        const inputs = [meta({ name: 'disabled', type: 'boolean', defaultValue: false })];
        const result = generateSnippet('lib-button', inputs, { disabled: false }, new Set(['disabled']));

        expect(result).toBe('<lib-button [disabled]="false" />');
    });

    it('should include non-default values even when defaults exist', () => {
        const inputs = [meta({ name: 'variant', defaultValue: 'primary' })];
        const result = generateSnippet('lib-button', inputs, { variant: 'danger' });

        expect(result).toBe('<lib-button variant="danger" />');
    });

    it('should render array as placeholder', () => {
        const inputs = [meta({ name: 'items', type: 'array' })];
        const result = generateSnippet('lib-button', inputs, { items: [1, 2, 3] });

        expect(result).toBe('<lib-button [items]="yourData" />');
    });

    it('should include default values when input is in explicitKeys', () => {
        const inputs = [meta({ name: 'variant', defaultValue: 'filled' }), meta({ name: 'icon', defaultValue: '★' })];
        const explicitKeys = new Set(['variant', 'icon']);
        const result = generateSnippet('lib-button', inputs, { variant: 'icon-only', icon: '★' }, explicitKeys);

        expect(result).toBe('<lib-button variant="icon-only" icon="★" />');
    });

    it('should include values not present in inputs metadata', () => {
        const inputs = [meta({ name: 'disabled', type: 'boolean' })];
        const result = generateSnippet('sg-color-picker', inputs, {
            value: '#6366f1',
            alphaChannel: true,
            disabled: false
        });

        expect(result).toBe('<sg-color-picker value="#6366f1" [alphaChannel]="true" />');
    });

    it('should still omit defaults for non-explicit inputs', () => {
        const inputs = [meta({ name: 'variant', defaultValue: 'filled' }), meta({ name: 'label', defaultValue: 'Button' })];
        const explicitKeys = new Set(['variant']);
        const result = generateSnippet('lib-button', inputs, { variant: 'outlined', label: 'Button' }, explicitKeys);

        expect(result).toBe('<lib-button variant="outlined" />');
    });

    it('writes an aliased input under its alias, the name a template uses', () => {
        const inputs = [meta({ name: 'size', alias: 'buttonSize' })];

        expect(generateSnippet('lib-button', inputs, { size: 'lg' })).toBe('<lib-button buttonSize="lg" />');
    });

    describe('directive snippets', () => {
        it('writes an aliased directive input under its alias', () => {
            const inputs = [meta({ name: 'color', alias: 'appHighlightColor' })];
            const result = generateSnippet('[appHighlight]', inputs, { color: 'red' }, undefined, undefined, { host: '<div>' });

            expect(result).toBe('<div appHighlight appHighlightColor="red"></div>');
        });

        it('writes an input aliased to the directive selector once, with its value', () => {
            const inputs = [meta({ name: 'color', alias: 'appHighlight' })];
            const result = generateSnippet('[appHighlight]', inputs, { color: 'red' }, undefined, undefined, { host: '<div>' });

            expect(result).toBe('<div appHighlight="red"></div>');
        });

        it('should render directive on host element', () => {
            const inputs = [meta({ name: 'highlightColor' })];
            const result = generateSnippet('[appHighlight]', inputs, { highlightColor: 'yellow' }, undefined, 'Hover me', { host: '<span class="demo-text">' });

            expect(result).toBe('<span class="demo-text" appHighlight highlightColor="yellow">Hover me</span>');
        });

        it('should render directive on plain host element without attributes', () => {
            const inputs = [meta({ name: 'color' })];
            const result = generateSnippet('[appHighlight]', inputs, { color: 'red' }, undefined, undefined, { host: '<div>' });

            expect(result).toBe('<div appHighlight color="red"></div>');
        });

        it('should render directive with object host', () => {
            const inputs = [meta({ name: 'tooltipText' })];
            const result = generateSnippet('[appTooltip]', inputs, { tooltipText: 'Hello' }, undefined, 'Click me', {
                host: {
                    selector: 'my-button',
                    import: { name: 'ButtonComponent', from: 'my-lib' },
                    inputs: { variant: 'primary' }
                }
            });

            expect(result).toContain('<my-button');
            expect(result).toContain('appTooltip');
            expect(result).toContain('variant="primary"');
            expect(result).toContain('tooltipText="Hello"');
            expect(result).toContain('Click me');
            expect(result).toContain('</my-button>');
        });

        it('should render boolean false on a directive when the input defaults to true', () => {
            const inputs = [meta({ name: 'truncate', type: 'boolean', defaultValue: true })];
            const result = generateSnippet('[libTooltip]', inputs, { truncate: false }, undefined, undefined, { host: 'div' });

            expect(result).toBe('<div libTooltip [truncate]="false"></div>');
        });

        it('keeps the tag of a string host with content, and its content when the variant has none', () => {
            const result = generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host: '<button>Hover me</button>' });

            expect(result).toBe('<button libTooltip>Hover me</button>');
        });

        it('keeps the attributes of a string host with content', () => {
            const result = generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host: '<button class="btn">Hover me</button>' });

            expect(result).toBe('<button class="btn" libTooltip>Hover me</button>');
        });

        it('prefers the content of the variant to the content of the host', () => {
            const host = { host: '<button>Hover me</button>' };

            expect(generateSnippet('[libTooltip]', [], {}, undefined, 'Save', host)).toBe('<button libTooltip>Save</button>');
            expect(generateSnippet('[libTooltip]', [], { __prismContent__: 'Save' }, undefined, undefined, host)).toBe('<button libTooltip>Save</button>');
            expect(generateSnippet('[libTooltip]', [], { __prismContent__: '' }, undefined, undefined, host)).toBe('<button libTooltip></button>');
        });

        it('never self-closes a native element that is not void', () => {
            expect(generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host: '<button>' })).toBe('<button libTooltip></button>');
            expect(generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host: '<button></button>' })).toBe('<button libTooltip></button>');
        });

        it('breaks the attributes of an element that is closed with its end tag', () => {
            const inputs = [meta({ name: 'tooltipText' }), meta({ name: 'tooltipPosition' }), meta({ name: 'tooltipDelay', type: 'number' })];
            const result = generateSnippet(
                '[libTooltip]',
                inputs,
                { tooltipText: 'Some longer tooltip text', tooltipPosition: 'bottom', tooltipDelay: 300 },
                undefined,
                undefined,
                {
                    host: '<button class="btn">'
                }
            );

            expect(result).toBe(
                '<button\n  class="btn"\n  libTooltip\n  tooltipText="Some longer tooltip text"\n  tooltipPosition="bottom"\n  [tooltipDelay]="300"></button>'
            );
        });

        it('puts the attributes of the selector on the host, not the selector', () => {
            expect(generateSnippet('input[libInput]', [], {}, undefined, undefined, { host: '<input type="text">' })).toBe('<input type="text" libInput />');
            expect(generateSnippet('a[libLink]', [], {}, undefined, undefined, { host: '<a href="#">' })).toBe('<a href="#" libLink></a>');
            expect(generateSnippet('[libA][libB]', [], {}, undefined, undefined, { host: '<span>' })).toBe('<span libA libB></span>');
            expect(generateSnippet('[libTooltip][position=top].tip', [], {}, undefined, undefined, { host: '<span>' })).toBe(
                '<span libTooltip position="top" class="tip"></span>'
            );
        });

        it('takes the part of a selector list that fits the host', () => {
            const selector = 'input[libInput], textarea[libInput]';

            expect(generateSnippet(selector, [], {}, undefined, undefined, { host: '<textarea>' })).toBe('<textarea libInput></textarea>');
            expect(generateSnippet(selector, [], {}, undefined, undefined, { host: '<input>' })).toBe('<input libInput />');
            expect(generateSnippet('button[libA], [libB]', [], {}, undefined, undefined, { host: '<span>' })).toBe('<span libB></span>');
        });

        it('takes the first part of a selector list when none fits the host', () => {
            expect(generateSnippet('button[libBtn], a[libBtn]', [], {}, undefined, undefined, { host: '<div>' })).toBe('<div libBtn></div>');
        });

        it('puts the attributes of the selector on an object host as well', () => {
            const host = { selector: 'lib-badge', import: { name: 'LibBadge', from: 'lib' } };

            expect(generateSnippet('lib-badge[libTooltip], [libTooltip]', [], {}, undefined, undefined, { host })).toBe('<lib-badge libTooltip />');
            expect(generateSnippet('button[libTooltip], span[libTooltip]', [], {}, undefined, undefined, { host })).toBe('<lib-badge libTooltip />');
        });

        it('writes an attribute of a selector with element once when an input is aliased to it', () => {
            const inputs = [meta({ name: 'text', alias: 'libTooltip' })];

            expect(generateSnippet('span[libTooltip]', inputs, { text: 'Info' }, undefined, undefined, { host: '<span>' })).toBe('<span libTooltip="Info"></span>');
        });

        it('lets a custom element host close itself', () => {
            expect(generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host: '<lib-badge>' })).toBe('<lib-badge libTooltip />');
        });

        it('lets an object host without content close itself, and closes it with its end tag when it is no custom element', () => {
            const host = { selector: 'lib-badge', import: { name: 'LibBadge', from: 'lib' } };

            expect(generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host })).toBe('<lib-badge libTooltip />');
            expect(generateSnippet('[libTooltip]', [], {}, undefined, undefined, { host: { ...host, selector: 'button' } })).toBe('<button libTooltip></button>');
        });

        it('writes the content of a directive without host as content, not as an attribute', () => {
            expect(generateSnippet('[libTooltip]', [], { __prismContent__: 'Hover me' })).toBe('<div libTooltip>Hover me</div>');
        });

        it('closes a void host without content', () => {
            const inputs = [meta({ name: 'size' })];
            const result = generateSnippet('[libInput]', inputs, { size: 'lg', __prismContent__: 'ignored' }, undefined, 'ignored', { host: '<input type="text">' });

            expect(result).toBe('<input type="text" libInput size="lg" />');
        });

        it('closes a void host without content when it has none either', () => {
            const result = generateSnippet('[libInput]', [], {}, undefined, undefined, { host: '<input type="text">' });

            expect(result).toBe('<input type="text" libInput />');
        });

        it('should fall back to normal snippet when no host is provided', () => {
            const result = generateSnippet('lib-button', [], {}, undefined, 'Click');

            expect(result).toBe('<lib-button>Click</lib-button>');
        });

        it('should use __prismContent__ from values as projected content when content is undefined', () => {
            const inputs = [meta({ name: 'tooltipText' })];
            const result = generateSnippet('[appTooltip]', inputs, { tooltipText: 'Info', __prismContent__: 'Hover me' }, undefined, undefined, { host: '<button>' });

            expect(result).toBe('<button appTooltip tooltipText="Info">Hover me</button>');
        });

        it('should never emit __prismContent__ as an attribute', () => {
            const inputs = [meta({ name: 'tooltipText' })];
            const result = generateSnippet('[appTooltip]', inputs, { tooltipText: 'Info', __prismContent__: 'Hover me' }, undefined, undefined, { host: '<button>' });

            expect(result).not.toContain('__prismContent__');
            expect(result).not.toContain('[__prismContent__]');
        });

        it('should prefer explicit content over __prismContent__ in values', () => {
            const result = generateSnippet('[appTooltip]', [], { __prismContent__: 'from values' }, undefined, 'from content', { host: '<button>' });

            expect(result).toBe('<button appTooltip>from content</button>');
        });

        it('should use __prismContent__ with object host (content projection into component)', () => {
            const result = generateSnippet('[sguiTooltip]', [], { __prismContent__: 'Hover me' }, undefined, undefined, {
                host: {
                    selector: 'sgui-label',
                    import: { name: 'SguiLabelComponent', from: 'sgui-lib' }
                }
            });

            expect(result).toBe('<sgui-label sguiTooltip>Hover me</sgui-label>');
        });
    });

    describe('component selectors', () => {
        it('writes the element and the attributes of a selector like button[libBtn]', () => {
            expect(generateSnippet('button[libBtn]', [], {})).toBe('<button libBtn></button>');
            expect(generateSnippet('button[libBtn]', [meta({ name: 'size' })], { size: 'lg' })).toBe('<button libBtn size="lg"></button>');
            expect(generateSnippet('button[libBtn]', [], {}, undefined, 'Save')).toBe('<button libBtn>Save</button>');
        });

        it('writes the classes and attribute values of a selector', () => {
            expect(generateSnippet('button.primary[libBtn][type=submit]', [], {})).toBe('<button libBtn type="submit" class="primary"></button>');
        });

        it('takes the first part of a selector list and ignores :not()', () => {
            expect(generateSnippet('button[libBtn]:not([disabled]), a[libBtn]', [], {})).toBe('<button libBtn></button>');
        });

        it('falls back to a div for a selector without element', () => {
            expect(generateSnippet('[libCard]', [], {})).toBe('<div libCard></div>');
        });

        it('lets a void or a custom element close itself', () => {
            expect(generateSnippet('input[libInput]', [], {})).toBe('<input libInput />');
            expect(generateSnippet('input[libInput]', [], {}, undefined, 'ignored')).toBe('<input libInput />');
            expect(generateSnippet('lib-button', [], {})).toBe('<lib-button />');
        });

        it('writes an attribute of the selector once when an input is aliased to it', () => {
            const inputs = [meta({ name: 'variant', alias: 'libBtn' })];

            expect(generateSnippet('button[libBtn]', inputs, { variant: 'primary' })).toBe('<button libBtn="primary"></button>');
        });
    });

    describe('content projection', () => {
        it('should render opening/closing tags with string content', () => {
            const result = generateSnippet('lib-button', [], {}, undefined, 'Click me');

            expect(result).toBe('<lib-button>Click me</lib-button>');
        });

        it('should render content with attributes', () => {
            const inputs = [meta({ name: 'variant' })];
            const result = generateSnippet('lib-button', inputs, { variant: 'primary' }, undefined, 'Save');

            expect(result).toBe('<lib-button variant="primary">Save</lib-button>');
        });

        it('should render multiline when content + attributes exceed 80 chars', () => {
            const inputs = [meta({ name: 'variant' }), meta({ name: 'size' })];
            const result = generateSnippet(
                'my-long-component-selector',
                inputs,
                { variant: 'primary', size: 'large' },
                undefined,
                'Some longer content that makes it wider'
            );

            expect(result).toContain('>\n  Some longer content');
            expect(result).toContain('</my-long-component-selector>');
        });

        it('should render self-closing tag when content is undefined', () => {
            const result = generateSnippet('lib-button', [], {}, undefined, undefined);

            expect(result).toBe('<lib-button />');
        });

        it('should render Record content with default slot', () => {
            const result = generateSnippet('lib-card', [], {}, undefined, {
                default: 'Body text'
            });

            expect(result).toBe('<lib-card>Body text</lib-card>');
        });

        it('should render Record content with named slots', () => {
            const result = generateSnippet('lib-card', [], {}, undefined, {
                default: 'Body text',
                '[card-header]': 'Title'
            });

            expect(result).toContain('Body text');
            expect(result).toContain('<ng-container card-header>Title</ng-container>');
        });
    });

    describe('attribute escaping', () => {
        it('should escape double quotes in string attribute values', () => {
            const inputs = [meta({ name: 'label' })];
            const result = generateSnippet('lib-button', inputs, {
                label: 'He said "hi"'
            });

            expect(result).toBe('<lib-button label="He said &quot;hi&quot;" />');
        });

        it('should escape ampersands in string attribute values', () => {
            const inputs = [meta({ name: 'label' })];
            const result = generateSnippet('lib-button', inputs, { label: 'A & B' });

            expect(result).toBe('<lib-button label="A &amp; B" />');
        });
    });
});

describe('subjectAttributes', () => {
    it('writes the attributes generateSnippet writes', () => {
        const inputs = [meta({ name: 'label' }), meta({ name: 'count', type: 'number' }), meta({ name: 'disabled', type: 'boolean' })];

        expect(subjectAttributes(inputs, { label: 'Save', count: 2, disabled: true })).toEqual(['label="Save"', '[count]="2"', '[disabled]="true"']);
    });

    it('leaves out a value that equals its default unless the variant sets it', () => {
        const inputs = [meta({ name: 'variant', defaultValue: 'primary' })];

        expect(subjectAttributes(inputs, { variant: 'primary' })).toEqual([]);
        expect(subjectAttributes(inputs, { variant: 'primary' }, new Set(['variant']))).toEqual(['variant="primary"']);
    });

    it('writes a boolean false only where the input defaults to true', () => {
        expect(subjectAttributes([meta({ name: 'truncate', type: 'boolean' })], { truncate: false })).toEqual([]);
        expect(subjectAttributes([meta({ name: 'truncate', type: 'boolean', defaultValue: true })], { truncate: false })).toEqual(['[truncate]="false"']);
    });

    it('writes an aliased input under its alias', () => {
        expect(subjectAttributes([meta({ name: 'size', alias: 'buttonSize' })], { size: 'lg' })).toEqual(['buttonSize="lg"']);
    });

    it('writes values that no input declares', () => {
        expect(subjectAttributes([], { 'aria-label': 'Close', hidden: false })).toEqual(['aria-label="Close"']);
    });

    it('leaves out the members it is told to skip', () => {
        const inputs = [meta({ name: 'label' }), meta({ name: 'required', type: 'boolean' })];

        expect(subjectAttributes(inputs, { label: 'E-Mail', required: true }, undefined, new Set(['required']))).toEqual(['label="E-Mail"']);
        expect(subjectAttributes(inputs, { label: 'E-Mail', extra: 'x' }, undefined, new Set(['extra']))).toEqual(['label="E-Mail"']);
    });

    it('skips by member name, not by alias', () => {
        const inputs = [meta({ name: 'size', alias: 'buttonSize' })];

        expect(subjectAttributes(inputs, { size: 'lg' }, undefined, new Set(['size']))).toEqual([]);
        expect(subjectAttributes(inputs, { size: 'lg' }, undefined, new Set(['buttonSize']))).toEqual(['buttonSize="lg"']);
    });
});

describe('generateCompositionSnippet', () => {
    it('shows the composition with the current values of the subject', () => {
        expect(generateCompositionSnippet(`<lib-form-field${SLOT}><input libInput /></lib-form-field>`, ['label="E-Mail"'])).toBe(
            '<lib-form-field label="E-Mail"><input libInput /></lib-form-field>'
        );
    });

    it('leaves out inputs the case does not bind', () => {
        const inputs = [meta({ name: 'label' }), meta({ name: 'required', type: 'boolean' })];
        const attributes = subjectAttributes(inputs, { label: 'E-Mail', required: true }, undefined, new Set(['required']));

        expect(generateCompositionSnippet(`<lib-form-field required${SLOT}><input libInput /></lib-form-field>`, attributes)).toBe(
            '<lib-form-field required label="E-Mail"><input libInput /></lib-form-field>'
        );
    });

    it('closes the subject without a stray space when it has no attributes', () => {
        expect(generateCompositionSnippet(`<lib-form-field${SLOT}><input libInput /></lib-form-field>`, [])).toBe('<lib-form-field><input libInput /></lib-form-field>');
        expect(generateCompositionSnippet(`<input libInput${SLOT} />`, [])).toBe('<input libInput />');
    });

    // `<button libTooltip>` leaves the input to ng-prism: its value takes the place of the bare attribute, as without a composition.
    it('writes an attribute that sets the input of a bare selector attribute in its place', () => {
        expect(generateCompositionSnippet(`<p><button libTooltip${SLOT}>Save</button></p>`, ['libTooltip="Saved"'])).toBe(
            '<p><button libTooltip="Saved">Save</button></p>'
        );
        expect(generateCompositionSnippet(`<button libTooltip class="btn"${SLOT}>Save</button>`, ['[libTooltip]="true"'])).toBe(
            '<button class="btn" [libTooltip]="true">Save</button>'
        );
        expect(generateCompositionSnippet(`<button libTooltip libTooltipWide${SLOT}></button>`, ['libTooltip="Saved"'])).toBe(
            '<button libTooltipWide libTooltip="Saved"></button>'
        );
    });

    it('puts the attributes after the last attribute of the subject', () => {
        expect(generateCompositionSnippet(`<input class="field" libInput${SLOT} />`, ['size="lg"', '[disabled]="true"'])).toBe(
            '<input class="field" libInput size="lg" [disabled]="true" />'
        );
    });

    it('keeps the markup around the subject as written', () => {
        const template = `<label>\n  Name\n  <input libInput${SLOT} />\n</label>`;

        expect(generateCompositionSnippet(template, ['placeholder="Name"'])).toBe('<label>\n  Name\n  <input libInput placeholder="Name" />\n</label>');
    });

    it('writes a value with a replacement pattern as it is', () => {
        expect(generateCompositionSnippet(`<input libInput${SLOT} />`, ['placeholder="$& $1 $$"'])).toBe('<input libInput placeholder="$& $1 $$" />');
    });

    it('shows a template without a slot as written', () => {
        expect(generateCompositionSnippet('<input libInput />', ['size="lg"'])).toBe('<input libInput />');
    });
});
