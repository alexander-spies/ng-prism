import { parseTemplate } from '@angular/compiler';
import type { Declarable } from './declarables.js';
import { type DeclarableMatch, matchDeclarables } from './match-declarables.js';

const FROM = 'fixture-lib';

/** The classes of the fixture library under `__fixtures__/composition/`, as `buildDeclarableIndex` reads them. */
const library: Declarable[] = [
    { name: 'FormFieldComponent', from: FROM, kind: 'component', selector: 'lib-form-field' },
    { name: 'InputDirective', from: FROM, kind: 'directive', selector: 'input[libInput], textarea[libInput]' },
    { name: 'IconComponent', from: FROM, kind: 'component', selector: 'lib-icon' },
    { name: 'EmailDirective', from: FROM, kind: 'directive', selector: 'input[type=email]' },
    { name: 'TwinAComponent', from: FROM, kind: 'component', selector: 'lib-twin' },
    { name: 'TwinBComponent', from: FROM, kind: 'component', selector: 'lib-twin' },
    { name: 'UpperPipe', from: FROM, kind: 'pipe', pipeName: 'upper' }
];

const email = library.find((declarable) => declarable.name === 'EmailDirective')!;

function match(template: string, explicit: Declarable[] = [], extraLibrary: Declarable[] = []): DeclarableMatch {
    const parsed = parseTemplate(template, 'match.html');

    expect(parsed.errors ?? []).toEqual([]);
    return matchDeclarables(parsed.nodes, [...library, ...extraLibrary], explicit);
}

function names(declarables: Declarable[]): string[] {
    return declarables.map((declarable) => declarable.name).sort();
}

describe('matchDeclarables', () => {
    it('imports the frame, the input directive and the icon', () => {
        expect(names(match('<lib-form-field><lib-icon libPrefix /><input libInput type="email" /></lib-form-field>').imports)).toEqual([
            'FormFieldComponent',
            'IconComponent',
            'InputDirective'
        ]);
    });

    it('leaves out a library directive that only matches standard attributes', () => {
        const m = match('<input libInput type="email" />');

        expect(names(m.imports)).not.toContain('EmailDirective');
        expect(m.skipped).toEqual([{ element: 'input', className: 'EmailDirective' }]);
    });

    it('imports it when the showcase names it explicitly', () => {
        const m = match('<input libInput type="email" />', [email]);

        expect(names(m.imports)).toEqual(['EmailDirective', 'InputDirective']);
        expect(m.skipped).toEqual([]);
    });

    it('matches a bound input as attribute', () => {
        expect(names(match('<input [libInput]="x" />').imports)).toEqual(['InputDirective']);
    });

    it('reports an unknown element and a typo of a native one', () => {
        expect(match('<lib-icn /><inptu></inptu>').unknownElements).toEqual(['lib-icn', 'inptu']);
    });

    it('accepts an element a resolved third-party import declares', () => {
        const m = match('<lib-x />', [{ name: 'XComponent', from: 'x-lib', kind: 'component', selector: 'lib-x' }]);

        expect(m.unknownElements).toEqual([]);
        expect(names(m.imports)).toEqual(['XComponent']);
    });

    it('reports two library components with one selector', () => {
        expect(match('<lib-twin />').ambiguous).toEqual([{ element: 'lib-twin', classes: ['TwinAComponent', 'TwinBComponent'] }]);
    });

    it('counts only imported components as ambiguous', () => {
        const buttons: Declarable[] = [
            { name: 'ButtonComponent', from: FROM, kind: 'component', selector: 'button[libButton]' },
            { name: 'FancyButtonComponent', from: FROM, kind: 'component', selector: 'button.lib-fancy' }
        ];
        const m = match('<button libButton class="lib-fancy"></button>', [], buttons);

        expect(m.ambiguous).toEqual([]);
        expect(m.skipped).toEqual([{ element: 'button', className: 'FancyButtonComponent' }]);
    });

    it('imports pipes by name and reports unknown ones', () => {
        const m = match('{{ "a" | upper }} {{ 1 | nope }}');

        expect(names(m.imports)).toContain('UpperPipe');
        expect(m.unknownPipes).toEqual(['nope']);
    });

    it('finds pipes in bindings, interpolated attributes and control flow', () => {
        const m = match(
            '@if (a | p1) { <b [title]="b | p2" class="{{ c | p3 }}"></b> } @for (i of d | p4; track i) {} ' +
                '@switch (e | p5) { @case (f | p6) {} } @let g = h | p7; <i *ngIf="x | p8"></i> @defer (when y | p9) {}'
        );

        expect(m.unknownPipes).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']);
    });

    it('knows standard HTML, SVG and the elements of Angular itself', () => {
        expect(match('<div><ng-container><svg><rect /></svg></ng-container><ng-template><span></span></ng-template><ng-content /></div>').unknownElements).toEqual([]);
    });

    it('accepts an element that a directive declares, as Angular does', () => {
        const m = match('<lib-outlet />', [], [{ name: 'OutletDirective', from: FROM, kind: 'directive', selector: 'lib-outlet' }]);

        expect(m.unknownElements).toEqual([]);
        expect(names(m.imports)).toEqual(['OutletDirective']);
    });

    it('imports a structural directive and one on an ng-template', () => {
        const structural: Declarable[] = [
            { name: 'IfDirective', from: FROM, kind: 'directive', selector: '[libIf]' },
            { name: 'OutletDirective', from: FROM, kind: 'directive', selector: 'ng-template[libOutlet]' }
        ];

        expect(names(match('<div *libIf="x"></div><ng-template libOutlet></ng-template>', [], structural).imports)).toEqual(['IfDirective', 'OutletDirective']);
    });

    it('counts neither a class nor an attribute that names a DOM property as written', () => {
        const broad: Declarable[] = [
            { name: 'ButtonDirective', from: FROM, kind: 'directive', selector: 'button.lib-button' },
            { name: 'FocusDirective', from: FROM, kind: 'directive', selector: '[tabindex]' }
        ];

        expect(match('<button class="lib-button" tabindex="0"></button>', [], broad).skipped).toEqual([
            { element: 'button', className: 'ButtonDirective' },
            { element: 'button', className: 'FocusDirective' }
        ]);
    });

    it('imports each class once and reports each finding once', () => {
        const m = match('<lib-icon /><lib-icon /><input type="email" /><input type="email" /><lib-icn /><lib-icn /><lib-twin /><lib-twin />', [
            library.find((declarable) => declarable.name === 'IconComponent')!
        ]);

        expect(names(m.imports)).toEqual(['IconComponent', 'TwinAComponent', 'TwinBComponent']);
        expect(m.skipped).toEqual([{ element: 'input', className: 'EmailDirective' }]);
        expect(m.unknownElements).toEqual(['lib-icn']);
        expect(m.ambiguous).toEqual([{ element: 'lib-twin', classes: ['TwinAComponent', 'TwinBComponent'] }]);
    });
});
