import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { resolveEntryPointExports } from '../entry-point.scanner.js';
import { buildDeclarableIndex, type Declarable, resolveShowcaseImports } from './declarables.js';

const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__', 'composition');
const fixtureFile = path.join(FIXTURES_DIR, 'public-api.ts');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

function indexOf(entries: ReadonlyArray<{ entryFile: string; importPath: string }>): Declarable[] {
    const { program, entries: resolved } = resolveEntryPointExports(entries, compilerOptions);

    return buildDeclarableIndex(resolved, program.getTypeChecker());
}

describe('buildDeclarableIndex', () => {
    let index: Declarable[];

    beforeAll(() => {
        index = indexOf([{ entryFile: fixtureFile, importPath: 'fixture-lib' }]);
    });

    it('indexes components, directives and pipes with and without @Showcase', () => {
        expect(index).toEqual(
            expect.arrayContaining([
                { name: 'FormFieldComponent', from: 'fixture-lib', kind: 'component', selector: 'lib-form-field' },
                { name: 'IconComponent', from: 'fixture-lib', kind: 'component', selector: 'lib-icon' },
                { name: 'InputDirective', from: 'fixture-lib', kind: 'directive', selector: 'input[libInput], textarea[libInput]' },
                { name: 'EmailDirective', from: 'fixture-lib', kind: 'directive', selector: 'input[type=email]' },
                { name: 'UpperPipe', from: 'fixture-lib', kind: 'pipe', pipeName: 'upper' }
            ])
        );
        expect(index).toHaveLength(7);
    });

    it('keeps classes that share a selector as separate entries', () => {
        expect(index.filter((declarable) => declarable.selector === 'lib-twin').map((declarable) => declarable.name)).toEqual(['TwinAComponent', 'TwinBComponent']);
    });

    it('keeps the first entry of a class that several entry points export', () => {
        const twice = indexOf([
            { entryFile: fixtureFile, importPath: 'fixture-lib/secondary' },
            { entryFile: fixtureFile, importPath: 'fixture-lib' }
        ]);

        expect(twice).toHaveLength(7);
        expect(twice.every((declarable) => declarable.from === 'fixture-lib/secondary')).toBe(true);
    });

    it('leaves out a default export, which the manifest cannot import by its name', () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'ng-prism-declarables-'));
        const entryFile = path.join(dir, 'public-api.ts');

        writeFileSync(
            entryFile,
            [
                `import { Directive } from '@angular/core';`,
                `@Directive({ selector: '[libDefault]' })`,
                `export default class DefaultDirective {}`,
                `@Directive({ selector: '[libNamed]' })`,
                `export class NamedDirective {}`
            ].join('\n')
        );

        try {
            expect(indexOf([{ entryFile, importPath: 'fixture-lib' }]).map((declarable) => declarable.name)).toEqual(['NamedDirective']);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('reads the classes of a dependency from their .d.ts, and nothing that is not a component, directive or pipe', () => {
        const thirdParty = indexOf([{ entryFile: path.join(FIXTURES_DIR, 'third-party-api.ts'), importPath: 'fixture-lib' }]);

        expect(thirdParty).toEqual([
            { name: 'DatePipe', from: 'fixture-lib', kind: 'pipe', pipeName: 'date' },
            { name: 'CdkTextareaAutosize', from: 'fixture-lib', kind: 'directive', selector: 'textarea[cdkTextareaAutosize]' }
        ]);
    });
});

describe('resolveShowcaseImports', () => {
    it('resolves a third-party import through its .d.ts', () => {
        const { resolved, unresolved } = resolveShowcaseImports([{ name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field' }], fixtureFile, {});

        expect(unresolved).toEqual([]);
        expect(resolved).toEqual([{ name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field', kind: 'directive', selector: 'textarea[cdkTextareaAutosize]' }]);
    });

    it('resolves an Angular pipe, which the package re-exports from a chunk', () => {
        const { resolved, unresolved } = resolveShowcaseImports([{ name: 'DatePipe', from: '@angular/common' }], fixtureFile, {});

        expect(unresolved).toEqual([]);
        expect(resolved).toEqual([{ name: 'DatePipe', from: '@angular/common', kind: 'pipe', pipeName: 'date' }]);
    });

    it('reads a class from its source where the module resolves to one', () => {
        const { resolved, unresolved } = resolveShowcaseImports(
            [
                { name: 'InputDirective', from: './public-api' },
                { name: 'UpperPipe', from: './public-api' },
                { name: 'IconComponent', from: './public-api' }
            ],
            fixtureFile,
            {}
        );

        expect(unresolved).toEqual([]);
        expect(resolved).toEqual([
            { name: 'InputDirective', from: './public-api', kind: 'directive', selector: 'input[libInput], textarea[libInput]' },
            { name: 'UpperPipe', from: './public-api', kind: 'pipe', pipeName: 'upper' },
            { name: 'IconComponent', from: './public-api', kind: 'component', selector: 'lib-icon' }
        ]);
    });

    it('resolves a module through the paths of the compiler options', () => {
        const { resolved, unresolved } = resolveShowcaseImports([{ name: 'FormFieldComponent', from: 'fixture-lib' }], fixtureFile, {
            paths: { 'fixture-lib': [fixtureFile] }
        });

        expect(unresolved).toEqual([]);
        expect(resolved).toEqual([{ name: 'FormFieldComponent', from: 'fixture-lib', kind: 'component', selector: 'lib-form-field' }]);
    });

    it('follows `export *` and renamed re-exports to the declaration', () => {
        const { resolved, unresolved } = resolveShowcaseImports(
            [
                { name: 'EmailDirective', from: './barrel' },
                { name: 'ShoutPipe', from: './barrel' }
            ],
            fixtureFile,
            {}
        );

        expect(unresolved).toEqual([]);
        expect(resolved).toEqual([
            { name: 'EmailDirective', from: './barrel', kind: 'directive', selector: 'input[type=email]' },
            { name: 'ShoutPipe', from: './barrel', kind: 'pipe', pipeName: 'upper' }
        ]);
    });

    describe('with a chain of re-exports', () => {
        let dir: string;

        // `link-0` re-exports the class from `link-1` and so on; the last link declares it.
        function chain(links: number): string {
            for (let i = 0; i < links; i++) writeFileSync(path.join(dir, `link-${i}.ts`), `export { LinkDirective } from './link-${i + 1}.js';\n`);
            writeFileSync(
                path.join(dir, `link-${links}.ts`),
                `import { Directive } from '@angular/core';\n@Directive({ selector: '[libLink]' })\nexport class LinkDirective {}\n`
            );
            return path.join(dir, 'link-0');
        }

        beforeEach(() => {
            dir = mkdtempSync(path.join(tmpdir(), 'ng-prism-declarables-'));
        });

        afterEach(() => {
            rmSync(dir, { recursive: true, force: true });
        });

        it('follows five of them', () => {
            const first = chain(5);

            expect(resolveShowcaseImports([{ name: 'LinkDirective', from: first }], fixtureFile, {}).resolved).toEqual([
                { name: 'LinkDirective', from: first, kind: 'directive', selector: '[libLink]' }
            ]);
        });

        it('gives up on the sixth', () => {
            const entry = { name: 'LinkDirective', from: chain(6) };

            expect(resolveShowcaseImports([entry], fixtureFile, {})).toEqual({ resolved: [], unresolved: [entry] });
        });
    });

    it('returns a name that only re-exports itself in circles as unresolved', () => {
        const missing = { name: 'Anything', from: './cycle-a' };

        expect(resolveShowcaseImports([missing], fixtureFile, {})).toEqual({ resolved: [], unresolved: [missing] });
    });

    it('returns an unknown module or name as unresolved', () => {
        const nope = { name: 'Nope', from: '@angular/cdk/text-field' };
        const notAPackage = { name: 'X', from: 'not-a-package' };
        const known = { name: 'DatePipe', from: '@angular/common' };
        const { resolved, unresolved } = resolveShowcaseImports([nope, known, notAPackage], fixtureFile, {});

        expect(unresolved).toEqual([nope, notAPackage]);
        expect(resolved.map((declarable) => declarable.name)).toEqual(['DatePipe']);
    });

    it('returns an export that is no component, directive or pipe as unresolved', () => {
        const module = { name: 'TextFieldModule', from: '@angular/cdk/text-field' };
        const service = { name: 'AutofillMonitor', from: '@angular/cdk/text-field' };

        expect(resolveShowcaseImports([module, service], fixtureFile, {})).toEqual({ resolved: [], unresolved: [module, service] });
    });
});
