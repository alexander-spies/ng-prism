import type { TmplAstElement } from '@angular/compiler';
import { COMPOSITION_SUBJECT_SLOT } from '../../../shared/composition.js';
import { type ComposeResult, composeTemplate } from './compose-template.js';

const SLOT = COMPOSITION_SUBJECT_SLOT;

const field = { selector: 'lib-form-field', isDirective: false, inputNames: new Map([['label', 'label']]) };
const input = {
    selector: 'input[libInput], textarea[libInput]',
    isDirective: true,
    inputNames: new Map([
        ['required', 'required'],
        ['libDatepicker', 'datepicker']
    ])
};
const tooltip = { selector: '[libTooltip]', isDirective: true, inputNames: new Map([['libTooltip', 'libTooltip']]) };

function ok(result: ComposeResult): Extract<ComposeResult, { ok: true }> {
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    return result as Extract<ComposeResult, { ok: true }>;
}

describe('composeTemplate', () => {
    it('wraps content in the subject when there is no host template', () => {
        const composed = ok(composeTemplate({ ...field, content: '<input libInput />' }));

        expect(composed.template).toBe(`<lib-form-field${SLOT}><input libInput /></lib-form-field>`);
        expect(composed.ownedInputs).toEqual([]);
        expect(composed.nodes.map((node) => (node as TmplAstElement).name)).toEqual(['lib-form-field']);
    });

    it('finds a directive subject by its selector', () => {
        expect(ok(composeTemplate({ ...input, hostTemplate: '<lib-form-field label="Name"><textarea libInput></textarea></lib-form-field>' })).template).toBe(
            `<lib-form-field label="Name"><textarea libInput${SLOT}></textarea></lib-form-field>`
        );
    });

    it('asks for prism-subject when the selector matches several elements', () => {
        expect(
            composeTemplate({
                selector: 'lib-radio',
                isDirective: false,
                inputNames: new Map(),
                hostTemplate: '<lib-radio-group><lib-radio /><lib-radio /></lib-radio-group>'
            })
        ).toEqual({ ok: false, at: 'host', problem: expect.stringContaining('matches 2 elements of the host template; mark one with prism-subject') });
    });

    it('reports a host template that the selector matches nowhere', () => {
        expect(composeTemplate({ ...input, hostTemplate: '<lib-form-field><select></select></lib-form-field>' })).toEqual({
            ok: false,
            at: 'host',
            problem: expect.stringContaining('matches no element of the host template')
        });
    });

    it('takes the marked element and removes the marker', () => {
        const t = ok(
            composeTemplate({
                selector: 'lib-radio',
                isDirective: false,
                inputNames: new Map(),
                hostTemplate: '<lib-radio-group><lib-radio value="a" /><lib-radio prism-subject value="b" /></lib-radio-group>'
            })
        ).template;

        expect(t).toBe(`<lib-radio-group><lib-radio value="a" /><lib-radio value="b"${SLOT} /></lib-radio-group>`);
    });

    it('puts the slot after the last attribute when the marker is the last one', () => {
        expect(ok(composeTemplate({ ...input, hostTemplate: '<input libInput\n    prism-subject\n/>' })).template).toBe(`<input libInput${SLOT}\n/>`);
    });

    it('rejects a second prism-subject', () => {
        expect(composeTemplate({ ...input, hostTemplate: '<input libInput prism-subject /><input libInput prism-subject />' })).toEqual({
            ok: false,
            at: 'host',
            problem: expect.stringContaining('prism-subject marks 2 elements')
        });
    });

    it('adds the attributes of a directive selector to a marked element it does not match', () => {
        expect(ok(composeTemplate({ ...tooltip, hostTemplate: '<lib-button prism-subject label="Save" />' })).template).toBe(
            `<lib-button label="Save" libTooltip${SLOT} />`
        );
    });

    it('rejects a marked element that the selector cannot fit', () => {
        expect(composeTemplate({ ...input, hostTemplate: '<div prism-subject></div>' })).toEqual({ ok: false, at: 'host', problem: expect.stringContaining('<div>') });
        expect(composeTemplate({ ...field, hostTemplate: '<div prism-subject></div>' })).toEqual({ ok: false, at: 'host', problem: expect.stringContaining('<div>') });
    });

    it('opens a self-closing subject for content', () => {
        expect(
            ok(
                composeTemplate({
                    selector: 'lib-select',
                    isDirective: false,
                    inputNames: new Map(),
                    hostTemplate: '<lib-form-field><lib-select /></lib-form-field>',
                    content: '<lib-option value="s">S</lib-option>'
                })
            ).template
        ).toBe(`<lib-form-field><lib-select${SLOT}><lib-option value="s">S</lib-option></lib-select></lib-form-field>`);
    });

    it('replaces what the subject holds in the host template with the content', () => {
        expect(
            ok(
                composeTemplate({
                    selector: 'lib-select',
                    isDirective: false,
                    inputNames: new Map(),
                    hostTemplate: '<lib-select><lib-option value="a">A</lib-option></lib-select>',
                    content: ''
                })
            ).template
        ).toBe(`<lib-select${SLOT}></lib-select>`);
    });

    it('replaces what a subject holds whose end tag the parser implies', () => {
        const item = { selector: '[libItem]', isDirective: true, inputNames: new Map() };

        expect(ok(composeTemplate({ ...item, hostTemplate: '<ul><li libItem>old <b>x</b> more<li>b</ul>', content: 'new' })).template).toBe(
            `<ul><li libItem${SLOT}>new<li>b</ul>`
        );
        expect(ok(composeTemplate({ ...item, hostTemplate: '<div><p libItem>old <b>x</b></div>', content: 'new' })).template).toBe(`<div><p libItem${SLOT}>new</div>`);
        expect(ok(composeTemplate({ ...item, hostTemplate: '<ul><li libItem><p *ngIf="on">old</ul>', content: 'new' })).template).toBe(`<ul><li libItem${SLOT}>new</ul>`);
    });

    // At the top level Angular closes what is open at the end; inside the `@case` of the generated wrapper it fails.
    it('rejects a host template that leaves an element open', () => {
        const select = { selector: 'lib-select', isDirective: false, inputNames: new Map() };

        expect(composeTemplate({ ...input, hostTemplate: '<lib-form-field label="x"><input libInput /></lib-form-field><div>' })).toEqual({
            ok: false,
            at: 'host',
            problem: '<div> is not closed'
        });
        expect(composeTemplate({ ...input, hostTemplate: '<div><lib-form-field label="x"><input libInput /></lib-form-field>' })).toEqual({
            ok: false,
            at: 'host',
            problem: '<div> is not closed'
        });
        expect(composeTemplate({ ...input, hostTemplate: '<lib-form-field label="x"><input libInput>' })).toEqual({
            ok: false,
            at: 'host',
            problem: '<lib-form-field> is not closed'
        });
        expect(composeTemplate({ ...select, hostTemplate: '<lib-form-field><lib-select>', content: '<lib-option>a</lib-option>' })).toEqual({
            ok: false,
            at: 'host',
            problem: '<lib-select> is not closed'
        });
    });

    it('says where a problem comes from that only the @case around the template shows', () => {
        expect(composeTemplate({ ...input, hostTemplate: '<lib-form-field><input libInput /></lib-form-field>{{ 1 +' })).toEqual({
            ok: false,
            at: 'host',
            problem: 'Unclosed block "switch", in the @case that the generated wrapper puts the template in; an unclosed {{ or block can cause it'
        });
    });

    it('reports inputs the template sets on the subject itself', () => {
        expect(ok(composeTemplate({ ...input, hostTemplate: '<input libInput required [libDatepicker]="picker" /><lib-datepicker #picker />' })).ownedInputs).toEqual([
            'required',
            'datepicker'
        ]);
    });

    it('leaves an input to ng-prism when the template writes it without a value only for the selector to match', () => {
        expect(ok(composeTemplate({ ...tooltip, hostTemplate: '<button libTooltip></button>' })).ownedInputs).toEqual([]);
        expect(ok(composeTemplate({ ...tooltip, hostTemplate: '<button libTooltip="Saved"></button>' })).ownedInputs).toEqual(['libTooltip']);
    });

    it('reports a syntax error of the variant template', () => {
        // Angular has no message for an unclosed element: it fails on the end tag of the subject that should close it.
        expect(composeTemplate({ ...field, content: '<span>' })).toEqual({
            ok: false,
            at: 'template',
            problem: expect.stringContaining('Unexpected closing tag "lib-form-field"')
        });
    });

    it('reports a syntax error of the host template', () => {
        expect(composeTemplate({ ...input, hostTemplate: '<lib-form-field><input libInput></span></lib-form-field>' })).toEqual({
            ok: false,
            at: 'host',
            problem: expect.stringContaining('Unexpected closing tag "span"')
        });
    });

    it('rejects content for a void subject', () => {
        expect(composeTemplate({ ...input, content: 'x' })).toEqual({ ok: false, at: 'template', problem: expect.stringContaining('void element') });
        expect(composeTemplate({ ...input, hostTemplate: '<input libInput />', content: 'x' })).toEqual({
            ok: false,
            at: 'template',
            problem: expect.stringContaining('void element')
        });
    });

    it('finds the subject inside @if and ng-template', () => {
        expect(ok(composeTemplate({ ...input, hostTemplate: '@if (true) { <input libInput /> }' })).template).toBe(`@if (true) { <input libInput${SLOT} /> }`);
        expect(ok(composeTemplate({ ...input, hostTemplate: '<ng-template><textarea libInput *ngIf="on"></textarea></ng-template>' })).template).toBe(
            `<ng-template><textarea libInput *ngIf="on"${SLOT}></textarea></ng-template>`
        );
    });
});
