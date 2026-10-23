#!/usr/bin/env node
/**
 * Fails when a package imports something it does not declare.
 *
 * Undeclared imports resolve by accident under npm and pnpm, which hoist
 * transitive dependencies onto the resolution path, and break under package
 * managers that enforce declarations (Yarn PnP). See issue #35.
 *
 * Only `dependencies` and `peerDependencies` count: devDependencies are not
 * installed for consumers of a published package.
 *
 * Import specifiers are collected through the TypeScript AST rather than by
 * regex. Several schematics embed whole import statements inside string
 * literals to emit generated code, and a regex cannot tell those apart from
 * real imports.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { builtinModules } from 'node:module';
import ts from 'typescript';

const PACKAGES_DIR = 'packages';
const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
// Test-only code that the build of a package leaves out (see `exclude` in its tsconfig.lib.json), so consumers never import it.
const TEST_ONLY_DIRS = new Set(['__mocks__', '__fixtures__', '__test-utils__']);

function collectSources(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!TEST_ONLY_DIRS.has(entry.name)) collectSources(full, out);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !entry.name.startsWith('test-setup')) {
            out.push(full);
        }
    }
    return out;
}

/** Bare module specifiers reached from real import/export/require nodes. */
function importedSpecifiers(file) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true);
    const found = new Set();

    const record = (node) => {
        if (node && ts.isStringLiteral(node)) found.add(node.text);
    };

    const visit = (node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            record(node.moduleSpecifier);
        } else if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        ) {
            record(node.arguments[0]);
        } else if (ts.isImportTypeNode(node) && node.argument) {
            const literal = node.argument.literal ?? node.argument;
            record(literal);
        }
        ts.forEachChild(node, visit);
    };

    visit(source);
    return [...found];
}

function packageNameOf(specifier) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
    if (specifier.includes('${')) return null;
    const parts = specifier.split('/');
    return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

let failed = false;

for (const dirName of readdirSync(PACKAGES_DIR)) {
    const root = join(PACKAGES_DIR, dirName);
    const manifestPath = join(root, 'package.json');
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const declared = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})]);

    const offenders = new Map();
    for (const file of collectSources(join(root, 'src'))) {
        for (const specifier of importedSpecifiers(file)) {
            const name = packageNameOf(specifier);
            if (!name || BUILTINS.has(name) || name === manifest.name) continue;
            if (declared.has(name)) continue;
            if (!offenders.has(name)) offenders.set(name, new Set());
            offenders.get(name).add(file);
        }
    }

    if (offenders.size > 0) {
        failed = true;
        console.error(`\n${manifest.name} imports packages it does not declare:`);
        for (const [name, files] of [...offenders].sort()) {
            console.error(`  ${name}`);
            for (const file of [...files].sort()) console.error(`      ${file}`);
        }
    }
}

if (failed) {
    console.error(
        '\nAdd each to `dependencies` (internal, no instance constraint) or ' +
            '`peerDependencies` (Angular packages and anything that must stay a ' +
            'single instance) in the package that imports it.\n'
    );
    process.exit(1);
}

console.log('check-declared-deps: every imported package is declared');
