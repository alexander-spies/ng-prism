import type { InputMeta } from '../../plugin/plugin.types.js';
import { generateSnippet } from './snippet-generator.js';

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

            expect(result).toBe('<div appHighlight appHighlightColor="red" />');
        });

        it('writes an input aliased to the directive selector once, with its value', () => {
            const inputs = [meta({ name: 'color', alias: 'appHighlight' })];
            const result = generateSnippet('[appHighlight]', inputs, { color: 'red' }, undefined, undefined, { host: '<div>' });

            expect(result).toBe('<div appHighlight="red" />');
        });

        it('should render directive on host element', () => {
            const inputs = [meta({ name: 'highlightColor' })];
            const result = generateSnippet('[appHighlight]', inputs, { highlightColor: 'yellow' }, undefined, 'Hover me', { host: '<span class="demo-text">' });

            expect(result).toBe('<span class="demo-text" appHighlight highlightColor="yellow">Hover me</span>');
        });

        it('should render directive on plain host element without attributes', () => {
            const inputs = [meta({ name: 'color' })];
            const result = generateSnippet('[appHighlight]', inputs, { color: 'red' }, undefined, undefined, { host: '<div>' });

            expect(result).toBe('<div appHighlight color="red" />');
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
            const result = generateSnippet('libTooltip', inputs, { truncate: false }, undefined, undefined, { host: 'div' });

            expect(result).toBe('<div libTooltip [truncate]="false" />');
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
