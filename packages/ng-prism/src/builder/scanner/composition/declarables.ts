import ts from 'typescript';
import type { ShowcaseImport } from '../../../decorator/showcase.types.js';
import { isImportableName } from '../../manifest/manifest-imports.js';
import { findDecorator, getDecoratorArgument, readDecoratorField } from '../ast-utils.js';

/** A component, directive or pipe that a template can use, and the module specifier a consumer imports it from. */
export interface Declarable {
    /** The name it is exported under. */
    name: string;
    from: string;
    kind: 'component' | 'directive' | 'pipe';
    /** Of a component or directive, as written in its metadata: a list of selectors is one string. */
    selector?: string;
    /** Of a pipe: the name a template calls it by. */
    pipeName?: string;
}

/** What {@link readDeclarable} finds in a class: a {@link Declarable} before it is given a name and a module. */
export type DeclarableShape = Pick<Declarable, 'kind' | 'selector' | 'pipeName'>;

/** How many modules a lookup follows from the one the import names: `export … from` and a re-exported import each count one. */
const MAX_REEXPORT_DEPTH = 5;

const DECORATED = [
    { decorator: 'Component', kind: 'component' },
    { decorator: 'Directive', kind: 'directive' },
    { decorator: 'Pipe', kind: 'pipe' }
] as const;

/** The static members that Angular's compiler leaves in a `.d.ts`, each typed `ɵɵ…Declaration<Class, "selector" | "name", …>`. */
const COMPILED_MEMBERS: ReadonlyMap<string, DeclarableShape['kind']> = new Map([
    ['ɵcmp', 'component'],
    ['ɵdir', 'directive'],
    ['ɵpipe', 'pipe']
]);

/** Where the declaration of a class can be read from: TypeScript source and its declaration files. */
const READABLE_EXTENSIONS: ReadonlySet<string> = new Set([
    ts.Extension.Ts,
    ts.Extension.Tsx,
    ts.Extension.Dts,
    ts.Extension.Mts,
    ts.Extension.Dmts,
    ts.Extension.Cts,
    ts.Extension.Dcts
]);

/**
 * Index every component, directive and pipe the library's entry points export
 * by its selector or name, with or without `@Showcase`, so that a template can
 * be matched against them. A class from a dependency that an entry point
 * re-exports is read from its `.d.ts`. A class without a selector (or a pipe
 * without a name) cannot be used in a template and is left out, as is
 * everything that is not a component, directive or pipe.
 *
 * A class exported more than once keeps its first entry, as in
 * `buildExportIndex`: callers put the secondary entry points before the
 * primary one.
 */
export function buildDeclarableIndex(entries: ReadonlyArray<{ exports: ts.Symbol[]; importPath: string }>, checker: ts.TypeChecker): Declarable[] {
    const seen = new Set<ts.Symbol>();
    const declarables: Declarable[] = [];

    for (const { exports, importPath } of entries) {
        for (const sym of exports) {
            const resolved = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;

            if (seen.has(resolved)) continue;
            seen.add(resolved);

            const classDecl = resolved.declarations?.find(ts.isClassDeclaration);
            const shape = classDecl && readDeclarable(classDecl, checker);

            // A default export, or one under a string name, cannot be imported by its name.
            if (shape && isImportableName(sym.name)) declarables.push({ name: sym.name, from: importPath, ...shape });
        }
    }

    return declarables;
}

/**
 * Look up each `{ name, from }` of a showcase's `imports` without a program: the module is resolved the way a bundler
 * does it, with the `paths` and the other options given, and the class is read from the file it lands in, following
 * `export … from` up to five modules on. An entry that cannot be found, is not exported, or is not a component,
 * directive or pipe (an NgModule or a service, say) comes back unresolved. A selector that only a checker could
 * evaluate is not read.
 */
export function resolveShowcaseImports(
    imports: readonly ShowcaseImport[],
    containingFile: string,
    compilerOptions: ts.CompilerOptions
): { resolved: Declarable[]; unresolved: ShowcaseImport[] } {
    const options: ts.CompilerOptions = { ...compilerOptions, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
    const files = new Map<string, ts.SourceFile | undefined>();
    const resolved: Declarable[] = [];
    const unresolved: ShowcaseImport[] = [];

    for (const entry of imports) {
        const lookup: Lookup = { options, files, visited: new Set() };
        const classDecl = findExportedClass(entry.name, entry.from, containingFile, 0, lookup);
        const shape = classDecl && readDeclarable(classDecl);

        if (shape) resolved.push({ name: entry.name, from: entry.from, ...shape });
        else unresolved.push(entry);
    }

    return { resolved, unresolved };
}

/**
 * What a class declares for templates: from `@Component`, `@Directive` or `@Pipe` in source, from the `ɵcmp`, `ɵdir`
 * or `ɵpipe` that the compiler left in a `.d.ts`. `undefined` for a class that is neither, or has no selector or name.
 * The `checker` evaluates a selector given as a constant; without one only a literal is read.
 */
export function readDeclarable(classDecl: ts.ClassDeclaration, checker?: ts.TypeChecker): DeclarableShape | undefined {
    for (const { decorator, kind } of DECORATED) {
        const found = findDecorator(classDecl, decorator);

        if (!found) continue;

        const arg = getDecoratorArgument(found);

        return shape(kind, arg && readDecoratorField(arg, kind === 'pipe' ? 'name' : 'selector', checker));
    }

    for (const member of classDecl.members) {
        const kind = ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name) ? COMPILED_MEMBERS.get(member.name.text) : undefined;

        if (!kind || !ts.isPropertyDeclaration(member) || !member.type || !ts.isTypeReferenceNode(member.type)) continue;

        const literal = member.type.typeArguments?.[1];

        return shape(kind, literal && ts.isLiteralTypeNode(literal) && ts.isStringLiteral(literal.literal) ? literal.literal.text : undefined);
    }

    return undefined;
}

function shape(kind: DeclarableShape['kind'], value: unknown): DeclarableShape | undefined {
    if (typeof value !== 'string' || value === '') return undefined;

    return kind === 'pipe' ? { kind, pipeName: value } : { kind, selector: value };
}

interface Lookup {
    options: ts.CompilerOptions;
    /** Every file parsed so far by this call, `undefined` for one that could not be read. */
    files: Map<string, ts.SourceFile | undefined>;
    /** The module and export name pairs this lookup has been through, which ends a re-export that leads back to itself. */
    visited: Set<string>;
}

function findExportedClass(name: string, specifier: string, containingFile: string, depth: number, lookup: Lookup): ts.ClassDeclaration | undefined {
    if (depth > MAX_REEXPORT_DEPTH) return undefined;

    const resolved = ts.resolveModuleName(specifier, containingFile, lookup.options, ts.sys).resolvedModule;

    if (!resolved || !READABLE_EXTENSIONS.has(resolved.extension)) return undefined;

    const sourceFile = readSourceFile(resolved.resolvedFileName, lookup.files);
    const key = `${resolved.resolvedFileName}\0${name}`;

    if (!sourceFile || lookup.visited.has(key)) return undefined;
    lookup.visited.add(key);

    return findExportInFile(name, sourceFile, depth, lookup);
}

/**
 * The class that `sourceFile` exports as `name`. An export of its own wins over what `export *` brings along,
 * which is looked at only when there is none.
 */
function findExportInFile(name: string, sourceFile: ts.SourceFile, depth: number, lookup: Lookup): ts.ClassDeclaration | undefined {
    const reexportedAll: string[] = [];

    for (const statement of sourceFile.statements) {
        if (ts.isClassDeclaration(statement) && statement.name?.text === name && ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            return statement;
        }

        if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;

        const specifier = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : undefined;

        if (!statement.exportClause) {
            if (specifier) reexportedAll.push(specifier);
            continue;
        }

        if (!ts.isNamedExports(statement.exportClause)) continue;

        const element = statement.exportClause.elements.find((e) => !e.isTypeOnly && e.name.text === name);

        if (!element) continue;

        const exported = (element.propertyName ?? element.name).text;

        return specifier ? findExportedClass(exported, specifier, sourceFile.fileName, depth + 1, lookup) : findLocalClass(exported, sourceFile, depth, lookup);
    }

    for (const specifier of reexportedAll) {
        const found = findExportedClass(name, specifier, sourceFile.fileName, depth + 1, lookup);

        if (found) return found;
    }

    return undefined;
}

/** The class that `local` names inside `sourceFile`: declared there, or imported from another module, as `export { local }` can re-export either. */
function findLocalClass(local: string, sourceFile: ts.SourceFile, depth: number, lookup: Lookup): ts.ClassDeclaration | undefined {
    for (const statement of sourceFile.statements) {
        if (ts.isClassDeclaration(statement) && statement.name?.text === local) return statement;

        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;

        const bindings = statement.importClause?.namedBindings;
        const element = bindings && ts.isNamedImports(bindings) ? bindings.elements.find((e) => e.name.text === local) : undefined;

        if (element) return findExportedClass((element.propertyName ?? element.name).text, statement.moduleSpecifier.text, sourceFile.fileName, depth + 1, lookup);
    }

    return undefined;
}

function readSourceFile(fileName: string, files: Map<string, ts.SourceFile | undefined>): ts.SourceFile | undefined {
    if (files.has(fileName)) return files.get(fileName);

    const text = ts.sys.readFile(fileName);
    const sourceFile = text === undefined ? undefined : ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest);

    files.set(fileName, sourceFile);
    return sourceFile;
}
