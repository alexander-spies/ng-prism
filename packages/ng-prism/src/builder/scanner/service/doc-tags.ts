import ts from 'typescript';
import type { ApiDocTags } from '../../../plugin/service.types.js';

/**
 * The block that documents a node: the last `/** *\/` above it, as long as it
 * sits right on top of the node and says something. TypeScript also attaches a
 * block that floats a few lines above, such as a section banner, and one that
 * is only a ruler (`/** ===== *\/`); neither describes the node.
 */
function readDocBlock(node: ts.Node): ts.JSDoc | undefined {
    const blocks = (node as ts.Node & { jsDoc?: ts.JSDoc[] }).jsDoc;
    const block = blocks?.[blocks.length - 1];

    if (!block) return undefined;

    const sourceFile = node.getSourceFile();
    const blockEnd = sourceFile.getLineAndCharacterOfPosition(block.end).line;
    const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;

    if (nodeStart - blockEnd > 1) return undefined;

    const stripped = block.getText(sourceFile).replace(/[/*\s]/g, '');

    if (stripped.length === 0 || /^[*=\-_#~]+$/.test(stripped)) return undefined;

    return block;
}

function commentText(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string | undefined {
    return ts.getTextOfJSDocComment(comment)?.trim() || undefined;
}

/** The comment text of a node without its tags, as written: line breaks and markdown stay. */
export function readDescription(node: ts.Node): string | undefined {
    return commentText(readDocBlock(node)?.comment);
}

/** The tags of a node. `@version` and tags without a place in {@link ApiDocTags} are not read. */
export function readDocTags(node: ts.Node): ApiDocTags {
    const result: ApiDocTags = {};

    for (const tag of readDocBlock(node)?.tags ?? []) {
        const comment = commentText(tag.comment);

        switch (tag.tagName.text) {
            case 'deprecated':
                result.deprecated = comment ?? true;
                break;
            case 'since':
                if (comment) result.since = comment;
                break;
            case 'default':
                if (comment) result.default = comment;
                break;
            case 'see': {
                const reference = readSeeReference(tag);

                if (reference) result.see = [...(result.see ?? []), reference];
                break;
            }
            case 'example':
                if (comment) result.example = [...(result.example ?? []), comment];
                break;
        }
    }

    return result;
}

/** Whether a node has a doc block of its own, tags only or not. */
export function isDocumented(node: ts.Node): boolean {
    return readDocBlock(node) !== undefined;
}

/** Whether a node carries an `@internal` tag. */
export function isInternal(node: ts.Node): boolean {
    return readDocBlock(node)?.tags?.some((tag) => tag.tagName.text === 'internal') ?? false;
}

/** The `@param` descriptions of a function-like node, by parameter name. */
export function readParamDescriptions(node: ts.Node): Map<string, string> {
    const result = new Map<string, string>();

    for (const tag of readDocBlock(node)?.tags ?? []) {
        if (!ts.isJSDocParameterTag(tag) || !ts.isIdentifier(tag.name)) continue;

        // `@param name - text` is the TSDoc spelling; the dash is not part of the text.
        const description = commentText(tag.comment)?.replace(/^-\s+/, '');

        if (description) result.set(tag.name.text, description);
    }

    return result;
}

/**
 * What a `@see` points at: the target of a `{@link}`, a name, or a URL. The
 * parser reads a URL as a name followed by `://…` and leaves a stray `*` of the
 * next line behind, so the tag is read from the source instead of from its parts.
 */
function readSeeReference(tag: ts.JSDocTag): string | undefined {
    const body = tag
        .getSourceFile()
        .text.slice(tag.tagName.end, tag.end)
        .split('\n')
        .map((line) => line.replace(/^\s*\*?\s*/, ''))
        .join(' ')
        .trim();

    return /^\{@link(?:code|plain)?\s+([^\s}|]+)/.exec(body)?.[1] ?? (body.split(/\s+/)[0] || undefined);
}
