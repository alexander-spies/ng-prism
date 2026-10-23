import type { InputMeta, RuntimeComponent } from '../../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT } from '../../../shared/composition.js';
import { isNonEditableInputType, nonEditableReason } from './non-editable-input-types.js';

function meta(rawType: string | undefined): InputMeta {
    return { name: 'x', type: 'unknown', required: false, rawType };
}

describe('isNonEditableInputType', () => {
    it('flags TemplateRef inputs', () => {
        expect(isNonEditableInputType(meta('TemplateRef<any>'))).toBe(true);
        expect(isNonEditableInputType(meta('TemplateRef<MyContext>'))).toBe(true);
    });

    it('flags TemplateRef in unions (e.g. `TemplateRef | undefined`)', () => {
        expect(isNonEditableInputType(meta('TemplateRef<any> | undefined'))).toBe(true);
        expect(isNonEditableInputType(meta('TemplateRef<any> | null'))).toBe(true);
    });

    it('flags ElementRef and ViewContainerRef', () => {
        expect(isNonEditableInputType(meta('ElementRef'))).toBe(true);
        expect(isNonEditableInputType(meta('ViewContainerRef'))).toBe(true);
    });

    it('does not flag unrelated object types', () => {
        expect(isNonEditableInputType(meta('MyConfig'))).toBe(false);
        expect(isNonEditableInputType(meta('Record<string, unknown>'))).toBe(false);
        expect(isNonEditableInputType(meta('string | number'))).toBe(false);
    });

    it('does not match substrings (e.g. `MyTemplateRefWrapper`)', () => {
        expect(isNonEditableInputType(meta('MyTemplateRefWrapper'))).toBe(false);
    });

    it('returns false when rawType is missing', () => {
        expect(isNonEditableInputType(meta(undefined))).toBe(false);
    });
});

describe('nonEditableReason', () => {
    const SLOT = COMPOSITION_SUBJECT_SLOT;
    const labelInput: InputMeta = { name: 'label', type: 'string', required: false };
    const requiredInput: InputMeta = { name: 'required', type: 'boolean', defaultValue: false, required: false };
    const itemsInput: InputMeta = { name: 'items', type: 'array', defaultUnreadable: true, required: false };
    const templateInput: InputMeta = { name: 'itemTemplate', type: 'unknown', rawType: 'TemplateRef<unknown>', required: false };
    const type = class {};

    /** Variant 0 composed with a template that sets `required` and leaves the unreadable default of `items`, variant 1 plain. */
    const owned: RuntimeComponent = {
        type,
        composition: type,
        meta: {
            className: 'Field',
            filePath: '/field.ts',
            showcaseConfig: { title: 'Field', variants: [{ name: 'Required' }, { name: 'Plain' }] },
            inputs: [labelInput, requiredInput, itemsInput, templateInput],
            outputs: [],
            componentMeta: { selector: 'lib-field', standalone: true, isDirective: false },
            composition: {
                variantCases: [0, -1],
                cases: [
                    {
                        template: `<lib-field${SLOT} required />`,
                        unbound: [
                            { name: 'required', reason: 'template' },
                            { name: 'items', reason: 'default' }
                        ]
                    }
                ]
            }
        }
    };

    it('gives the reason an input is not editable in this variant', () => {
        expect(nonEditableReason(requiredInput, owned, 0)).toBe('Set by the template of this variant');
        expect(nonEditableReason(requiredInput, owned, 1)).toBeNull();
    });

    it('says when the case leaves an input unbound because its default is unknown', () => {
        expect(nonEditableReason(itemsInput, owned, 0)).toBe('Its default is unknown to ng-prism');
        expect(nonEditableReason(itemsInput, owned, 1)).toBeNull();
    });

    it('names a framework reference type in every variant', () => {
        expect(nonEditableReason(templateInput, owned, 0)).toBe('Framework reference type');
        expect(nonEditableReason(templateInput, owned, 1)).toBe('Framework reference type');
    });

    it('has no reason for an input the variant binds', () => {
        expect(nonEditableReason(labelInput, owned, 0)).toBeNull();
    });
});
