import ts from 'typescript';
import type { PipeApi } from '../../../plugin/pipe.types.js';
import type { ApiMethod } from '../../../plugin/service.types.js';
import { getClassChain } from '../class-hierarchy.js';
import { isDocumented, readDescription, readDocTags } from './doc-tags.js';
import type { ExportIndex } from './export-index.js';
import { extractOverloads, type TypeRefResolver } from './member.extractor.js';
import { describeSetupEntries } from './service-api.extractor.js';
import type { SetupRef } from './setup.reader.js';
import { createTypeCollector } from './type-collector.js';

/**
 * What the API page of a pipe shows: the description and tags of the class,
 * the signatures of `transform()`, its setup functions and tokens with their
 * config tables, and every documented type all of them reach. A template only
 * calls `transform()`: no other member is read, and none adds a type.
 */
export function extractPipeApi(classDecl: ts.ClassDeclaration, setupRefs: SetupRef[], checker: ts.TypeChecker, exportIndex: ExportIndex): PipeApi {
    const collector = createTypeCollector(checker, exportIndex);
    const transform = extractTransform(classDecl, checker, collector);
    const setup = describeSetupEntries(setupRefs, checker, collector);
    const api: PipeApi = { tags: readDocTags(classDecl), transform, setup, types: collector.drain() };
    // The class's own block only: unlike a member, a pipe does not take the description of its base class.
    const description = readDescription(classDecl);

    if (description) api.description = description;

    return api;
}

/**
 * The signatures of `transform()` in the nearest class that declares it,
 * which may be a base class that only exists as a declaration, such as
 * `DatePipe` in the .d.ts of `@angular/common`. See {@link extractOverloads}
 * for which signatures are listed and where each takes its docs from.
 */
function extractTransform(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker, types: TypeRefResolver): ApiMethod[] {
    const levels = getClassChain(classDecl, checker).map(getTransformDeclarations);
    const level = levels.findIndex((declarations) => declarations.length > 0);

    if (level < 0) return [];

    return extractOverloads('transform', levels[level], findInheritedDocs(levels.slice(level + 1)), checker, types);
}

/** The instance declarations of `transform()` in a class, in source order: the overload signatures and the implementation. */
function getTransformDeclarations(classDecl: ts.ClassDeclaration): ts.MethodDeclaration[] {
    return classDecl.members.filter(
        (member): member is ts.MethodDeclaration =>
            ts.isMethodDeclaration(member) &&
            (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) &&
            member.name.text === 'transform' &&
            !ts.getModifiers(member)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
    );
}

/** The first documented `transform()` declaration in the nearest of the given base classes that has one. */
function findInheritedDocs(levels: ts.MethodDeclaration[][]): ts.MethodDeclaration | undefined {
    for (const declarations of levels) {
        const documented = declarations.find(isDocumented);

        if (documented) return documented;
    }

    return undefined;
}
