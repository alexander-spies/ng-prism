import { readFileSync, statSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { gzipSync } from 'zlib';
import { stripShowcaseDecorators } from '@ng-prism/core/transformer';
import ts from 'typescript';
import type { BundleMetrics } from '../perf.types.js';

/**
 * Measures the component file the way it ships: without `@Showcase`, which
 * ng-prism-strip removes from the published build, and without comments. The
 * whole file stays available as `rawSourceSize`/`rawGzipEstimate`. The files
 * behind `templateUrl` and `styleUrl(s)` ship too (the Angular compiler inlines
 * them) and are reported on their own.
 */
export function scanBundle(filePath: string, maxTreeDepth = 5): BundleMetrics {
    const raw = readFileSync(filePath, 'utf-8');
    const rawSourceSize = Buffer.byteLength(raw, 'utf-8');
    const rawGzipEstimate = gzipSize(raw);

    const shipped = shippedSource(raw, filePath);
    const sourceFile = shipped?.sourceFile ?? ts.createSourceFile(filePath, raw, ts.ScriptTarget.Latest, true);
    const sourceSize = shipped ? Buffer.byteLength(shipped.text, 'utf-8') : rawSourceSize;
    const gzipEstimate = shipped ? gzipSize(shipped.text) : rawGzipEstimate;

    const importList = extractImports(sourceFile);
    const directImports = importList.length;

    const treeDepth = computeTreeDepth(filePath, importList, maxTreeDepth);
    const { templateSize, styleSize } = measureResources(sourceFile, dirname(filePath));

    return {
        sourceSize,
        gzipEstimate,
        directImports,
        importList,
        treeDepth,
        rawSourceSize,
        rawGzipEstimate,
        stripped: shipped !== null,
        templateSize,
        styleSize
    };
}

/** The file without `@Showcase` and comments, or `null` when stripping or printing fails and the whole file is measured instead. */
function shippedSource(raw: string, filePath: string): { text: string; sourceFile: ts.SourceFile } | null {
    try {
        const stripped = stripShowcaseDecorators(raw, filePath);
        const sourceFile = ts.createSourceFile(filePath, stripped, ts.ScriptTarget.Latest, true);
        const text = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(sourceFile);

        return { text, sourceFile };
    } catch {
        return null;
    }
}

function gzipSize(text: string): number {
    try {
        return gzipSync(Buffer.from(text)).length;
    } catch {
        return Math.round(Buffer.byteLength(text, 'utf-8') * 0.31);
    }
}

/** Bytes of the files that the `@Component` decorators in the file reference through `templateUrl`, `styleUrl` and `styleUrls`. */
function measureResources(sourceFile: ts.SourceFile, dir: string): { templateSize: number; styleSize: number } {
    let templateSize = 0;
    let styleSize = 0;

    for (const statement of sourceFile.statements) {
        if (!ts.isClassDeclaration(statement)) continue;

        for (const decorator of ts.getDecorators(statement) ?? []) {
            const metadata = componentMetadata(decorator);

            if (!metadata) continue;

            for (const property of metadata.properties) {
                if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;

                const size = urlsOf(property.initializer).reduce((sum, url) => sum + fileSize(resolve(dir, url)), 0);

                if (property.name.text === 'templateUrl') templateSize += size;
                else if (property.name.text === 'styleUrl' || property.name.text === 'styleUrls') styleSize += size;
            }
        }
    }

    return { templateSize, styleSize };
}

function componentMetadata(decorator: ts.Decorator): ts.ObjectLiteralExpression | null {
    const call = decorator.expression;

    if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || call.expression.text !== 'Component') return null;

    const [metadata] = call.arguments;

    return metadata && ts.isObjectLiteralExpression(metadata) ? metadata : null;
}

function urlsOf(initializer: ts.Expression): string[] {
    if (ts.isStringLiteralLike(initializer)) return [initializer.text];
    if (ts.isArrayLiteralExpression(initializer)) return initializer.elements.filter(ts.isStringLiteralLike).map((element) => element.text);
    return [];
}

function fileSize(path: string): number {
    try {
        return statSync(path).size;
    } catch {
        return 0;
    }
}

function extractImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];

    ts.forEachChild(sourceFile, (node) => {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push(node.moduleSpecifier.text);
        }
    });
    return imports;
}

function computeTreeDepth(filePath: string, imports: string[], maxDepth: number, visited = new Set<string>(), currentDepth = 1): number {
    if (currentDepth >= maxDepth) return currentDepth;

    visited.add(filePath);
    let deepest = currentDepth;
    const dir = dirname(filePath);

    for (const imp of imports) {
        if (!imp.startsWith('.')) continue;

        const resolved = resolveImport(dir, imp);

        if (!resolved || visited.has(resolved)) continue;

        try {
            const childSource = readFileSync(resolved, 'utf-8');
            const childSf = ts.createSourceFile(resolved, childSource, ts.ScriptTarget.Latest, true);
            const childImports = extractImports(childSf);
            const childDepth = computeTreeDepth(resolved, childImports, maxDepth, visited, currentDepth + 1);

            deepest = Math.max(deepest, childDepth);
        } catch {
            // File not readable, treat as leaf
        }
    }

    return deepest;
}

function resolveImport(dir: string, importPath: string): string | null {
    const extensions = ['.ts', '.tsx', '.js', '.mjs'];
    const base = resolve(dir, importPath);

    if (extname(base)) {
        const withoutExt = base.replace(/\.[^.]+$/, '');

        for (const ext of extensions) {
            try {
                readFileSync(withoutExt + ext);
                return withoutExt + ext;
            } catch {
                /* noop */
            }
        }
    }

    for (const ext of extensions) {
        try {
            readFileSync(base + ext);
            return base + ext;
        } catch {
            /* noop */
        }
    }

    for (const ext of extensions) {
        try {
            readFileSync(resolve(base, 'index' + ext));
            return resolve(base, 'index' + ext);
        } catch {
            /* noop */
        }
    }

    return null;
}
