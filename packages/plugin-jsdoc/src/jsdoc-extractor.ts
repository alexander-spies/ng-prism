import { readFileSync, statSync } from 'node:fs';
import ts from 'typescript';
import type { JsDocData, JsDocTags, MethodDoc, ParamDoc } from './jsdoc.types.js';

/**
 * `baseClasses` come from the scanner, nearest first. Members are read from
 * the class and then from each of them; the first class that declares a
 * member decides its tags, as a redeclaration replaces the inherited one.
 */
export function extractJsDocData(filePath: string, className: string, baseClasses: { className: string; filePath: string }[] = []): JsDocData | null {
    const findClass = (path: string, name: string) => findClassByName(parseFile(path), name);

    const classDecl = findClass(filePath, className);

    if (!classDecl) return null;

    const hierarchy = [classDecl, ...baseClasses.flatMap((base) => findClass(base.filePath, base.className) ?? [])];

    return {
        classDescription: extractDescription(classDecl),
        classTags: extractTags(classDecl),
        memberTags: extractAllMemberTags(hierarchy),
        methods: extractPublicMethods(hierarchy)
    };
}

/**
 * The files parsed so far, with the size and modification time they had then.
 * `serve` runs the hook for every component again on each change in the
 * library, so a file that has not changed since is neither read nor parsed again.
 */
const parsedFiles = new Map<string, { mtimeMs: number; size: number; sourceFile: ts.SourceFile }>();

function parseFile(path: string): ts.SourceFile {
    const { mtimeMs, size } = statSync(path);
    const cached = parsedFiles.get(path);

    if (cached?.mtimeMs === mtimeMs && cached.size === size) return cached.sourceFile;

    const sourceFile = ts.createSourceFile(path, readFileSync(path, 'utf-8'), ts.ScriptTarget.ES2022, true);

    parsedFiles.set(path, { mtimeMs, size, sourceFile });
    return sourceFile;
}

function findClassByName(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration | null {
    let found: ts.ClassDeclaration | null = null;

    function visit(node: ts.Node): void {
        if (found) return;
        if (ts.isClassDeclaration(node) && node.name?.text === className) {
            found = node;
            return;
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return found;
}

function extractDescription(node: ts.Node): string | undefined {
    const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;

    if (!jsDocNodes?.length) return undefined;

    const lastDoc = jsDocNodes[jsDocNodes.length - 1];
    const comment = lastDoc.comment;

    if (!comment) return undefined;

    if (typeof comment === 'string') return comment.trim() || undefined;

    return (
        (comment as ts.NodeArray<ts.JSDocComment>)
            .map((c) => (typeof c === 'string' ? c : c.text))
            .join('')
            .trim() || undefined
    );
}

function extractTags(node: ts.Node): JsDocTags {
    const tags = ts.getJSDocTags(node);

    return buildTagsFromList(tags);
}

function buildTagsFromList(tags: readonly ts.JSDocTag[]): JsDocTags {
    const result: JsDocTags = {};

    for (const tag of tags) {
        const tagName = tag.tagName.text;
        const comment = tagCommentToString(tag.comment);

        if (tagName === 'deprecated') {
            result.deprecated = comment || true;
        } else if (tagName === 'since') {
            result.since = comment;
        } else if (tagName === 'version') {
            result.version = comment;
        } else if (tagName === 'see') {
            const seeRef = extractSeeReference(tag, comment);

            if (seeRef) result.see = [...(result.see ?? []), seeRef];
        } else if (tagName === 'example') {
            result.example = [...(result.example ?? []), ...(comment ? [comment] : [])];
        }
    }

    return result;
}

function extractSeeReference(tag: ts.JSDocTag, comment: string | undefined): string | undefined {
    const seeTag = tag as any;
    const nameRef: string | undefined = seeTag.name?.name?.text ?? seeTag.name?.left?.text;

    if (nameRef) return nameRef;
    if (comment && comment !== '*') return comment;
    return undefined;
}

function tagCommentToString(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string | undefined {
    if (!comment) return undefined;
    if (typeof comment === 'string') return comment.trim() || undefined;
    return (
        (comment as ts.NodeArray<ts.JSDocComment>)
            .map((c) => (typeof c === 'string' ? c : c.text))
            .join('')
            .trim() || undefined
    );
}

function extractAllMemberTags(hierarchy: ts.ClassDeclaration[]): Record<string, JsDocTags> {
    const result: Record<string, JsDocTags> = {};
    const shadowed = new Set<string>();

    for (const classDecl of hierarchy) {
        for (const member of classDecl.members) {
            const name = getMemberName(member);

            if (!name || shadowed.has(name)) continue;

            const tags = ts.getJSDocTags(member);

            if (tags.length === 0) continue;

            result[name] = buildTagsFromList(tags);
        }

        addMemberNames(classDecl, shadowed);
    }

    return result;
}

/**
 * A member with JSDoc of its own hides the same name further up, as it does
 * for TypeScript and for the description the scanner reads; one without
 * keeps the documentation it inherits. Applied after the whole class, so the
 * getter, setter or overloads next to a member are read too. A static member
 * hides nothing, since inputs, outputs and methods are instance members.
 */
function addMemberNames(classDecl: ts.ClassDeclaration, names: Set<string>): void {
    for (const member of classDecl.members) {
        const name = getMemberName(member);
        const isStatic = ts.canHaveModifiers(member) && ts.getModifiers(member)?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);

        if (name && !isStatic && ts.getJSDocCommentsAndTags(member).length > 0) names.add(name);
    }
}

function getMemberName(member: ts.ClassElement): string | undefined {
    if (!member.name) return undefined;
    if (ts.isIdentifier(member.name)) return member.name.text;
    if (ts.isStringLiteral(member.name)) return member.name.text;
    return undefined;
}

const LIFECYCLE_HOOKS = new Set([
    'ngOnInit',
    'ngOnDestroy',
    'ngOnChanges',
    'ngDoCheck',
    'ngAfterContentInit',
    'ngAfterContentChecked',
    'ngAfterViewInit',
    'ngAfterViewChecked'
]);

function extractPublicMethods(hierarchy: ts.ClassDeclaration[]): MethodDoc[] {
    const result: MethodDoc[] = [];
    const shadowed = new Set<string>();

    for (const classDecl of hierarchy) {
        const sourceFile = classDecl.getSourceFile();

        for (const member of classDecl.members) {
            if (!ts.isMethodDeclaration(member)) continue;

            const name = getMemberName(member);

            if (!name || shadowed.has(name)) continue;
            if (name.startsWith('_')) continue;
            if (LIFECYCLE_HOOKS.has(name)) continue;

            const isPrivate = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword);

            if (isPrivate) continue;

            if (!hasDirectJsDoc(member, sourceFile)) continue;

            const description = extractDescription(member);
            const tags = extractTags(member);
            const params = extractParamDocs(member);
            const returnType = member.type ? member.type.getText() : undefined;

            if (!description && Object.keys(tags).length === 0) continue;

            result.push({ name, description, tags, params, returnType });
        }

        addMemberNames(classDecl, shadowed);
    }

    return result;
}

function hasDirectJsDoc(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;

    if (!jsDocNodes?.length) return false;

    const lastDoc = jsDocNodes[jsDocNodes.length - 1];

    const commentEnd = sourceFile.getLineAndCharacterOfPosition(lastDoc.end).line;
    const methodStart = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;

    if (methodStart - commentEnd > 1) return false;

    const commentText = lastDoc.getText(sourceFile);
    const stripped = commentText.replace(/[/*\s]/g, '');

    if (stripped.length === 0) return false;
    if (/^[*=\-_#~]+$/.test(stripped)) return false;

    return true;
}

function extractParamDocs(method: ts.MethodDeclaration): ParamDoc[] {
    const jsDocNodes = (method as any).jsDoc as ts.JSDoc[] | undefined;

    if (!jsDocNodes?.length) return [];

    const lastDoc = jsDocNodes[jsDocNodes.length - 1];

    if (!lastDoc.tags) return [];

    const result: ParamDoc[] = [];

    for (const tag of lastDoc.tags) {
        if (!ts.isJSDocParameterTag(tag)) continue;

        const name = ts.isIdentifier(tag.name) ? tag.name.text : tag.name.getText();
        const type = tag.typeExpression ? tag.typeExpression.type.getText() : undefined;
        const description = tagCommentToString(tag.comment);

        result.push({ name, type, description });
    }

    return result;
}
