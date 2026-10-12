import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * `@ng-prism/core` is `"type": "module"`, so the compiled schematics are loaded
 * as native ESM. `@angular-devkit/schematics` ships without an `exports` map and
 * relies on the legacy folder-as-module convention (`tasks/package.json` with a
 * `main` field). CommonJS `require()` honours that; Node's ESM resolver does
 * not. A bare `@angular-devkit/schematics/tasks` is a directory import and
 * fails with ERR_UNSUPPORTED_DIR_IMPORT.
 *
 * Jest/SWC runs the specs as CommonJS, where such an import resolves fine, so
 * the breakage would only show up for consumers. This spec checks the source
 * text instead of relying on the resolver.
 *
 * See https://github.com/ng-prism/ng-prism/issues/32.
 */

const SCHEMATICS_DIR = __dirname;

/** Packages without an `exports` map, where subpath imports must name a file. */
const DIRECTORY_IMPORT_UNSAFE = ['@angular-devkit/schematics'];

const IMPORT_RE = /(?:^|\n)\s*import[\s\S]*?from\s*['"]([^'"]+)['"]/g;

function collectSourceFiles(dir: string): string[] {
    const files: string[] = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...collectSourceFiles(full));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            files.push(full);
        }
    }
    return files;
}

function subpathImports(source: string): string[] {
    const found: string[] = [];

    for (const match of source.matchAll(IMPORT_RE)) {
        const specifier = match[1];
        const unsafe = DIRECTORY_IMPORT_UNSAFE.find((pkg) => specifier.startsWith(`${pkg}/`) && specifier !== pkg);

        if (unsafe) found.push(specifier);
    }
    return found;
}

describe('schematics ESM imports', () => {
    const sourceFiles = collectSourceFiles(SCHEMATICS_DIR);

    it('should find schematic sources to check', () => {
        expect(sourceFiles.length).toBeGreaterThan(0);
    });

    it.each(DIRECTORY_IMPORT_UNSAFE)('should not import a bare subpath of %s', (pkg) => {
        const offenders: string[] = [];

        for (const file of sourceFiles) {
            const source = readFileSync(file, 'utf-8');

            for (const specifier of subpathImports(source)) {
                if (specifier.startsWith(`${pkg}/`) && !specifier.endsWith('.js')) {
                    offenders.push(`${file}: ${specifier}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });
});
