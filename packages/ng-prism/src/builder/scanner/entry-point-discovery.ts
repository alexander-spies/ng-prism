import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, posix, relative } from 'path';

export interface DiscoveredEntryPoint {
    entryFile: string;
    importPath: string;
}

export function discoverSecondaryEntryPoints(libraryRoot: string, baseImportPath: string): DiscoveredEntryPoint[] {
    const entryPoints: DiscoveredEntryPoint[] = [];

    findNgPackageJsons(libraryRoot, libraryRoot, baseImportPath, entryPoints);
    return entryPoints;
}

/** ng-packagr's default for `lib.entryFile`. */
const NG_PACKAGR_DEFAULT_ENTRY_FILE = 'src/public_api.ts';

/**
 * The primary entry file of the library at `libraryRoot`: `lib.entryFile` of its
 * own `ng-package.json`, or `undefined` when there is no such file.
 */
export function findPrimaryEntryFile(libraryRoot: string): string | undefined {
    const ngPackagePath = join(libraryRoot, 'ng-package.json');

    if (!existsSync(ngPackagePath)) return undefined;

    const ngPackage = JSON.parse(readFileSync(ngPackagePath, 'utf-8'));
    const entryFilePath = join(libraryRoot, ngPackage.lib?.entryFile ?? NG_PACKAGR_DEFAULT_ENTRY_FILE);

    return existsSync(entryFilePath) ? entryFilePath : undefined;
}

function findNgPackageJsons(dir: string, libraryRoot: string, baseImportPath: string, result: DiscoveredEntryPoint[]): void {
    const isLibraryRoot = dir === libraryRoot;
    const ngPackagePath = join(dir, 'ng-package.json');

    if (existsSync(ngPackagePath)) {
        const ngPackage = JSON.parse(readFileSync(ngPackagePath, 'utf-8'));

        if (!ngPackage.dest) {
            const entryFile = ngPackage.lib?.entryFile ?? 'public-api.ts';
            const entryFilePath = join(dir, entryFile);

            if (existsSync(entryFilePath)) {
                const relDir = relative(libraryRoot, dir);
                const importPath = relDir === '' ? baseImportPath : posix.join(baseImportPath, relDir.split('\\').join('/'));

                result.push({ entryFile: entryFilePath, importPath });
            }

            if (!isLibraryRoot) return;
        }
    }

    let entries: string[];

    try {
        entries = readdirSync(dir);
    } catch {
        return;
    }

    for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git') continue;

        const fullPath = join(dir, entry);

        try {
            if (!statSync(fullPath).isDirectory()) continue;
        } catch {
            continue;
        }

        findNgPackageJsons(fullPath, libraryRoot, baseImportPath, result);
    }
}
