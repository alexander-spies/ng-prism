import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { createSourceFileCache } from './source-file-cache.js';

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    noLib: true,
    types: [],
    noEmit: true
};

// Whole seconds, so that setting the time back restores exactly the same mtimeMs.
const T0 = 1_700_000_000;

describe('createSourceFileCache', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'ng-prism-sf-cache-'));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    function write(name: string, content: string, mtime = T0): string {
        const file = join(dir, name);

        writeFileSync(file, content);
        utimesSync(file, mtime, mtime);
        return file;
    }

    it('should hand the next program the same SourceFile for an unchanged file', () => {
        const entry = write('entry.ts', `export { a } from './a';\n`);
        const a = write('a.ts', 'export const a = 1;\n');
        const cache = createSourceFileCache(compilerOptions);

        const first = ts.createProgram([entry], compilerOptions, cache.host);
        const second = ts.createProgram([entry], compilerOptions, cache.host, first);

        expect(second.getSourceFile(a)).toBe(first.getSourceFile(a));
        expect(second.getSourceFile(entry)).toBe(first.getSourceFile(entry));
    });

    it('should re-parse a file whose mtime changed while its size stayed the same', () => {
        const a = write('a.ts', 'export const a = 1;\n');
        const cache = createSourceFileCache(compilerOptions);
        const first = ts.createProgram([a], compilerOptions, cache.host);

        write('a.ts', 'export const a = 2;\n', T0 + 5);
        const second = ts.createProgram([a], compilerOptions, cache.host, first);

        expect(second.getSourceFile(a)?.text).toBe('export const a = 2;\n');
    });

    it('should re-parse a file whose size changed while its mtime stayed the same', () => {
        const a = write('a.ts', 'export const a = 1;\n');
        const cache = createSourceFileCache(compilerOptions);
        const first = ts.createProgram([a], compilerOptions, cache.host);

        write('a.ts', 'export const a = 12345;\n');
        const second = ts.createProgram([a], compilerOptions, cache.host, first);

        expect(second.getSourceFile(a)?.text).toBe('export const a = 12345;\n');
    });

    it('should report a deleted file as missing', () => {
        const a = write('a.ts', 'export const a = 1;\n');
        const cache = createSourceFileCache(compilerOptions);

        expect(cache.host.getSourceFile(a, ts.ScriptTarget.ES2022)).toBeDefined();

        rmSync(a);

        expect(cache.host.getSourceFile(a, ts.ScriptTarget.ES2022)).toBeUndefined();
    });

    it('should parse afresh when TypeScript asks for a new SourceFile', () => {
        const a = write('a.ts', 'export const a = 1;\n');
        const cache = createSourceFileCache(compilerOptions);

        const first = cache.host.getSourceFile(a, ts.ScriptTarget.ES2022);
        const second = cache.host.getSourceFile(a, ts.ScriptTarget.ES2022, undefined, true);

        expect(second).toBeDefined();
        expect(second).not.toBe(first);
    });

    it('should resolve an import again once its missing target file appears', () => {
        const entry = write('entry.ts', `export { b } from './b';\n`);
        const cache = createSourceFileCache(compilerOptions);
        const first = ts.createProgram([entry], compilerOptions, cache.host);

        const b = write('b.ts', 'export const b = 1;\n');
        const second = ts.createProgram([entry], compilerOptions, cache.host, first);

        expect(second.getSourceFile(b)).toBeDefined();
    });

    it('should forget files the pruned program no longer contains', () => {
        const entry = write('entry.ts', `export { a } from './a';\n`);
        const a = write('a.ts', 'export const a = 1;\n');
        const cache = createSourceFileCache(compilerOptions);
        const first = ts.createProgram([entry], compilerOptions, cache.host);
        const original = first.getSourceFile(a);

        write('entry.ts', 'export const nothing = 0;\n', T0 + 5);
        const second = ts.createProgram([entry], compilerOptions, cache.host, first);

        cache.prune(second);

        write('entry.ts', `export { a } from './a';\n`, T0 + 10);
        const third = ts.createProgram([entry], compilerOptions, cache.host, second);

        expect(third.getSourceFile(a)).toBeDefined();
        expect(third.getSourceFile(a)).not.toBe(original);
    });
});
