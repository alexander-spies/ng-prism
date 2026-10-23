import path from 'node:path';
import ts from 'typescript';
import type { ComponentComposition, ScannedComponent } from '../../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT as SLOT } from '../../../shared/composition.js';
import { createReporters, findShowcasedClasses, scanComponents } from '../component.scanner.js';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { buildDeclarableIndex } from './declarables.js';
import { createCompositionContext } from './read-composition.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__');

/** Each fixture is the fixture library with one showcase added or swapped in, scanned as a library of its own. */
const SUBJECTS = {
    frame: 'FormFieldComponent',
    broken: 'FormFieldComponent',
    input: 'InputDirective',
    owned: 'InputDirective',
    defaults: 'InputDirective',
    text: 'HintDirective',
    unresolved: 'FormFieldComponent',
    throws: 'OddComponent',
    bare: 'InputDirective',
    email: 'EmailDirective'
} as const;

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

const diagnostics: string[] = [];
const notices = new Set<string>();
const scanned = new Map<string, ScannedComponent[]>();

beforeAll(() => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const entryPoints = Object.keys(SUBJECTS).map((name) => ({ entryFile: path.join(FIXTURES_DIR, 'composition', `${name}.showcase.ts`), importPath: 'fixture-lib' }));
    const { program, entries } = resolveEntryPointExports(entryPoints, compilerOptions);
    const checker = program.getTypeChecker();

    for (const entry of entries) {
        const { notify } = createReporters(diagnostics, notices);
        const composition = createCompositionContext(buildDeclarableIndex([entry], checker), compilerOptions, notify);

        scanned.set(
            path.relative(FIXTURES_DIR, entry.entryFile),
            scanComponents(findShowcasedClasses(entry.exports, checker), checker, { diagnostics, notices, composition })
        );
    }
    warnSpy.mockRestore();
});

function scanFixture(file: string, className: string): ScannedComponent {
    const component = scanned.get(file)?.find((c) => c.className === className);

    if (!component) throw new Error(`${file} has no showcase for ${className}`);
    return component;
}

function composition(name: keyof typeof SUBJECTS): ComponentComposition {
    const read = scanFixture(`composition/${name}.showcase.ts`, SUBJECTS[name]).composition;

    if (!read) throw new Error(`${name}.showcase.ts has no composition`);
    return read;
}

function expectDiagnostic(pattern: RegExp): void {
    expect(diagnostics).toContainEqual(expect.stringMatching(pattern));
}

function noticesAbout(file: string): string[] {
    return [...notices].filter((notice) => notice.includes(`${file}:`));
}

describe('readComposition', () => {
    it('builds one case per distinct template', () => {
        const { composition } = scanFixture('composition/frame.showcase.ts', 'FormFieldComponent');

        expect(composition?.variantCases).toEqual([0, 1, 2, 0]); // variant 3 repeats variant 0
        expect(composition?.cases[0].template).toBe(`<lib-form-field${SLOT}><input libInput type="email" /></lib-form-field>`);
        expect(composition?.imports).toHaveLength(2);
        expect(composition?.imports).toEqual(
            expect.arrayContaining([
                { name: 'InputDirective', from: 'fixture-lib' },
                { name: 'IconComponent', from: 'fixture-lib' }
            ])
        );
    });

    it('says which variants a case comes from and where the first of them is written', () => {
        expect(composition('frame').cases[0].origin).toBe(
            'variants[0] "Default", variants[3] "Again" (src/builder/scanner/__fixtures__/composition/frame.showcase.ts:13:9)'
        );
        expect(composition('frame').cases[1].origin).toMatch(/^variants\[1\] "With icon" \(.*frame\.showcase\.ts:14:9\)$/);
    });

    it('reads no composition for a showcase whose variants have neither template nor host template', () => {
        expect(scanFixture('composition/frame.showcase.ts', 'InputDirective')).not.toHaveProperty('composition');
    });

    it('gives a directive with a host template one case for all variants', () => {
        expect(scanFixture('composition/input.showcase.ts', 'InputDirective').composition?.variantCases).toEqual([0, 0]);
        expect(composition('input').cases).toEqual([
            {
                template: `<lib-form-field><input libInput type="text"${SLOT} /></lib-form-field>`,
                unbound: [],
                origin: expect.stringMatching(/^variants\[0\] "Default", variants\[1\] "Disabled" \(.*input\.showcase\.ts:13:16\)$/)
            }
        ]);
        expect(composition('input').imports).toEqual([{ name: 'FormFieldComponent', from: 'fixture-lib' }]);
    });

    it('renders a showcase without variants in its host template', () => {
        expect(composition('bare').variantCases).toEqual([0]);
        expect(composition('bare').cases[0].origin).toMatch(/^host \(.*bare\.showcase\.ts:13:5\)$/);
    });

    it('reports a broken template with showcase file, line and variant and leaves the variant out', () => {
        expectDiagnostic(/FormFieldComponent › variants\[1\] "Broken" › template — .*Unexpected closing tag.*\(.*broken\.showcase\.ts:\d+:\d+\)/);
        expect(composition('broken').variantCases[1]).toBe(-1);
    });

    it('reports an unknown element when every import resolved', () => expectDiagnostic(/› template — <lib-icn> matches no imported component/));

    it('reports an unknown pipe', () => expectDiagnostic(/^FormFieldComponent › variants\[3\] "Bad pipe" › template — pipe "nope" matches no imported pipe/));

    it('reports an element that two library components match', () => {
        expectDiagnostic(/^FormFieldComponent › variants\[4\] "Twins" › template — <lib-twin> matches TwinAComponent and TwinBComponent.*NG0300/);
    });

    it('reports a host template without the subject against the host', () => {
        expectDiagnostic(
            /^FormFieldComponent › variants\[5\] "No subject" › host — the selector "lib-form-field" matches no element of the host template \(.*broken\.showcase\.ts:18:31\)$/
        );
    });

    it('leaves out every variant with a diagnostic and keeps the others', () => {
        expect(composition('broken').variantCases).toEqual([0, -1, -1, -1, -1, -1, 1, -1]);
        expect(composition('broken').imports).toEqual([{ name: 'InputDirective', from: 'fixture-lib' }]);
    });

    it('only notes unknown elements while an import is unresolved', () => {
        const fileNotices = noticesAbout('unresolved.showcase.ts');

        expect(fileNotices).toContainEqual(expect.stringMatching(/^FormFieldComponent › variants\[0\] "Custom" › template — <x-thing> matches no imported component/));
        expect(fileNotices).toContainEqual(expect.stringMatching(/^FormFieldComponent › variants\[1\] "Piped" › template — pipe "shout" matches no imported pipe/));
        expect(diagnostics.filter((d) => d.includes('unresolved.showcase.ts:'))).toEqual([]);
        expect(composition('unresolved').variantCases).toEqual([0, 1]);
    });

    it('imports an import it cannot resolve as written, with a notice', () => {
        expect(noticesAbout('unresolved.showcase.ts')).toContainEqual(
            expect.stringMatching(/^FormFieldComponent › imports\[0\] — "X" from "nope" is not a component, directive or pipe ng-prism can read/)
        );
        expect(composition('unresolved').imports).toEqual([{ name: 'X', from: 'nope' }]);
    });

    it('marks inputs the template sets and drops the variant value', () => {
        expect(composition('owned').cases[0].unbound).toEqual([{ name: 'required', reason: 'template' }]);
        expectDiagnostic(/› inputs\.required — set by the template on the subject/);
        expect(scanFixture('composition/owned.showcase.ts', 'InputDirective').showcaseConfig.variants![0].inputs).toEqual({ label: 'Name' });
        expect(composition('owned').variantCases).toEqual([0]);
    });

    it('leaves an input with an unreadable default unbound unless a variant sets it', () => {
        const { variantCases, cases } = composition('defaults');

        expect(variantCases).toEqual([0, 1]);
        expect(cases[0].unbound).toEqual([{ name: 'size', reason: 'default' }]);
        expect(cases[1].unbound).toEqual([]);
        expect(cases[1].template).toBe(cases[0].template);
    });

    it('escapes a directive text content into the case', () => {
        const { cases } = composition('text');

        expect(cases[0].template).toBe(`<p><span libHint${SLOT}>a &lt; &#123;b&#125;</span></p>`);
        expect(cases[1].template).toBe(`<p><span libHint${SLOT}>Tom &amp; Jerry &#64;if</span></p>`);
    });

    it('drops HTML content of a component variant inside a host template', () => {
        const { variants } = scanFixture('composition/broken.showcase.ts', 'FormFieldComponent').showcaseConfig;

        expectDiagnostic(/"HTML content" › content — HTML content cannot be projected into a host template; use template/);
        expect(variants![6]).not.toHaveProperty('content');
        expect(variants![7].content).toBe('<b>Hi</b>');
        expect(composition('broken').cases[1].template).toBe(`<section><lib-form-field${SLOT} /></section>`);
    });

    it('notes once per showcase which library classes its compositions leave out', () => {
        expect(noticesAbout('frame.showcase.ts').filter((notice) => notice.includes('EmailDirective'))).toEqual([
            expect.stringMatching(/^FormFieldComponent › imports — EmailDirective on <input> matches only by standard attributes/)
        ]);
    });

    it('leaves the subject out of the notice and of the imports', () => {
        expect(noticesAbout('email.showcase.ts')).toEqual([]);
        expect(composition('email').imports).toEqual([{ name: 'FormFieldComponent', from: 'fixture-lib' }]);
    });

    it('reports a compiler failure once for the showcase and reads no composition', () => {
        expect(scanFixture('composition/throws.showcase.ts', 'OddComponent')).not.toHaveProperty('composition');
        expect(diagnostics.filter((d) => d.startsWith('OddComponent'))).toEqual([
            expect.stringMatching(/^OddComponent › host — .*Nesting :not.*\(.*throws\.showcase\.ts:13:5\)$/)
        ]);
    });

    it('leaves a library class whose selector Angular cannot parse out of every composition, with a notice', () => {
        expect([...notices]).toContainEqual(
            expect.stringMatching(/^OddComponent from "fixture-lib" has the selector "lib-odd:not\(\.a:not\(\.b\)\)", which Angular cannot parse/)
        );
        expect(scanFixture('composition/throws.showcase.ts', 'CalmComponent').composition?.imports).toEqual([{ name: 'IconComponent', from: 'fixture-lib' }]);
    });
});
