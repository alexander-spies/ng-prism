import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { discoverSecondaryEntryPoints, findPrimaryEntryFile } from './entry-point-discovery.js';

function createTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'ng-prism-discovery-'));
}

function writeJson(dir: string, filename: string, data: unknown): void {
    writeFileSync(join(dir, filename), JSON.stringify(data));
}

describe('discoverSecondaryEntryPoints', () => {
    let tmp: string;

    afterEach(() => {
        if (tmp) rmSync(tmp, { recursive: true, force: true });
    });

    it('should find secondary entry points in subdirectories', () => {
        tmp = createTempDir();
        mkdirSync(join(tmp, 'atoms', 'pill'), { recursive: true });
        writeJson(tmp, 'ng-package.json', { dest: '../../dist/my-lib', lib: { entryFile: './public-api.ts' } });
        writeJson(join(tmp, 'atoms', 'pill'), 'ng-package.json', { lib: { entryFile: 'public-api.ts' } });
        writeFileSync(join(tmp, 'atoms', 'pill', 'public-api.ts'), 'export {}');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([{ entryFile: join(tmp, 'atoms', 'pill', 'public-api.ts'), importPath: 'my-lib/atoms/pill' }]);
    });

    it('should find multiple entry points across categories', () => {
        tmp = createTempDir();
        writeJson(tmp, 'ng-package.json', { dest: '../../dist/my-lib' });

        for (const sub of ['atoms/pill', 'atoms/icon', 'overlay/tooltip']) {
            const dir = join(tmp, ...sub.split('/'));

            mkdirSync(dir, { recursive: true });
            writeJson(dir, 'ng-package.json', { lib: { entryFile: 'public-api.ts' } });
            writeFileSync(join(dir, 'public-api.ts'), 'export {}');
        }

        const result = discoverSecondaryEntryPoints(tmp, 'sgui-lib');

        const importPaths = result.map((e) => e.importPath).sort();

        expect(importPaths).toEqual(['sgui-lib/atoms/icon', 'sgui-lib/atoms/pill', 'sgui-lib/overlay/tooltip']);
    });

    it('should skip directories without ng-package.json', () => {
        tmp = createTempDir();
        mkdirSync(join(tmp, 'assets'), { recursive: true });
        writeFileSync(join(tmp, 'assets', 'styles.scss'), '');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([]);
    });

    it('should skip root ng-package.json with dest field', () => {
        tmp = createTempDir();
        mkdirSync(join(tmp, 'sub'), { recursive: true });
        writeJson(join(tmp, 'sub'), 'ng-package.json', { dest: '../dist', lib: { entryFile: 'public-api.ts' } });
        writeFileSync(join(tmp, 'sub', 'public-api.ts'), 'export {}');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([]);
    });

    it('should default entryFile to public-api.ts when not specified', () => {
        tmp = createTempDir();
        mkdirSync(join(tmp, 'shared'), { recursive: true });
        writeJson(join(tmp, 'shared'), 'ng-package.json', {});
        writeFileSync(join(tmp, 'shared', 'public-api.ts'), 'export {}');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([{ entryFile: join(tmp, 'shared', 'public-api.ts'), importPath: 'my-lib/shared' }]);
    });

    it('should skip entry point when entryFile does not exist', () => {
        tmp = createTempDir();
        mkdirSync(join(tmp, 'broken'), { recursive: true });
        writeJson(join(tmp, 'broken'), 'ng-package.json', { lib: { entryFile: 'index.ts' } });

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([]);
    });

    it('should include the library root itself when its ng-package.json has no dest', () => {
        tmp = createTempDir();
        writeJson(tmp, 'ng-package.json', { lib: { entryFile: 'public-api.ts' } });
        writeFileSync(join(tmp, 'public-api.ts'), 'export {}');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([{ entryFile: join(tmp, 'public-api.ts'), importPath: 'my-lib' }]);
    });

    it('should include both the library root and a secondary entry point', () => {
        tmp = createTempDir();
        writeJson(tmp, 'ng-package.json', { lib: { entryFile: 'public-api.ts' } });
        writeFileSync(join(tmp, 'public-api.ts'), 'export {}');
        mkdirSync(join(tmp, 'testing'), { recursive: true });
        writeJson(join(tmp, 'testing'), 'ng-package.json', { lib: { entryFile: 'public-api.ts' } });
        writeFileSync(join(tmp, 'testing', 'public-api.ts'), 'export {}');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        const importPaths = result.map((e) => e.importPath).sort();

        expect(importPaths).toEqual(['my-lib', 'my-lib/testing']);
    });

    it('should ignore node_modules directories', () => {
        tmp = createTempDir();
        mkdirSync(join(tmp, 'node_modules', 'some-pkg'), { recursive: true });
        writeJson(join(tmp, 'node_modules', 'some-pkg'), 'ng-package.json', { lib: { entryFile: 'public-api.ts' } });
        writeFileSync(join(tmp, 'node_modules', 'some-pkg', 'public-api.ts'), 'export {}');

        const result = discoverSecondaryEntryPoints(tmp, 'my-lib');

        expect(result).toEqual([]);
    });
});

describe('findPrimaryEntryFile', () => {
    let tmp: string;

    afterEach(() => {
        if (tmp) rmSync(tmp, { recursive: true, force: true });
    });

    it('reads lib.entryFile from the root ng-package.json', () => {
        tmp = createTempDir();
        writeJson(tmp, 'ng-package.json', { dest: '../../dist/my-lib', lib: { entryFile: './src/public-api.ts' } });
        mkdirSync(join(tmp, 'src'));
        writeFileSync(join(tmp, 'src', 'public-api.ts'), 'export {}');

        expect(findPrimaryEntryFile(tmp)).toBe(join(tmp, 'src', 'public-api.ts'));
    });

    it("falls back to ng-packagr's default entry file", () => {
        tmp = createTempDir();
        writeJson(tmp, 'ng-package.json', { dest: '../../dist/my-lib' });
        mkdirSync(join(tmp, 'src'));
        writeFileSync(join(tmp, 'src', 'public_api.ts'), 'export {}');

        expect(findPrimaryEntryFile(tmp)).toBe(join(tmp, 'src', 'public_api.ts'));
    });

    it('returns undefined without an ng-package.json or an existing entry file', () => {
        tmp = createTempDir();

        expect(findPrimaryEntryFile(tmp)).toBeUndefined();

        writeJson(tmp, 'ng-package.json', { dest: '../../dist/my-lib', lib: { entryFile: 'missing.ts' } });

        expect(findPrimaryEntryFile(tmp)).toBeUndefined();
    });
});
