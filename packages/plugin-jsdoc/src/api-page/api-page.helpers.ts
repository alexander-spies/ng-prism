import type { ApiParam, ApiSetupEntry, ApiTypeRef } from '@ng-prism/core/plugin';
import type { ApiPageModel } from './api-page.model.js';

/** One entry of the API page's "On this page" list. `id` names the section, `level` 2 is a type below "Types". */
export interface TocEntry {
    id: string;
    label: string;
    level: 1 | 2;
}

/** A piece of a type as written; `link` is the TOC id of the documented type the piece names. */
export interface TypeSegment {
    text: string;
    link?: string;
}

/** The TOC id of a documented type's card. */
export function typeAnchor(typeId: string): string {
    return `type-${typeId}`;
}

/**
 * The sections of an API page in the order the page shows them. Usage is
 * always there, being generated; any other section only when it has content.
 * A component or directive has inputs, outputs and methods, a service
 * properties and methods, a pipe its transform signatures.
 */
export function buildApiPageToc(page: ApiPageModel): TocEntry[] {
    const sections: [id: string, label: string, present: boolean][] = [
        ['usage', 'Usage', true],
        ['setup', 'Setup', page.setup.length > 0],
        ['examples', 'Examples', page.examples.length > 0],
        ['inputs', 'Inputs', !!page.inputs?.length],
        ['outputs', 'Outputs', !!page.outputs?.length],
        ['properties', 'Properties', !!page.properties?.length],
        ['methods', 'Methods', !!page.methods?.length],
        ['transform', 'Transform', !!page.transform?.length],
        ['types', 'Types', page.types.length > 0]
    ];
    const toc: TocEntry[] = sections.filter(([, , present]) => present).map(([id, label]) => ({ id, label, level: 1 }));

    for (const type of page.types) toc.push({ id: typeAnchor(type.id), label: type.name, level: 2 });
    return toc;
}

/** How far down the view, as a share of its height, a section's heading has to come to make the section active. */
const ACTIVATION_LINE = 0.25;

/** Where the page is scrolled to, and where each anchor of the "On this page" list sits on it. */
export interface ScrollSpyState {
    /** The TOC id of each anchor in page order, with its offset from the top of the scrolled content. */
    anchors: readonly { id: string; top: number }[];
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
    /** The entry a jump is heading for, for as long as the jump lasts. */
    jumpTarget: string | null;
}

/**
 * The entry the "On this page" list marks. During a jump, the one the reader
 * jumped to, whatever the jump scrolls past. Otherwise the last section whose
 * heading has come up to a line a quarter down the view, except at the bottom
 * of the page: the sections there can never come up to the line, so the last
 * one in view is active.
 */
export function activeTocId({ anchors, scrollTop, clientHeight, scrollHeight, jumpTarget }: ScrollSpyState): string {
    if (jumpTarget) return jumpTarget;

    if (scrollTop + clientHeight >= scrollHeight - 1) {
        const inView = anchors.filter((anchor) => anchor.top >= scrollTop && anchor.top < scrollTop + clientHeight).at(-1);

        if (inView) return inView.id;
    }

    const line = scrollTop + clientHeight * ACTIVATION_LINE;

    return (anchors.filter((anchor) => anchor.top <= line).at(-1) ?? anchors[0])?.id ?? 'usage';
}

const IDENTIFIER = /[A-Za-z_$][\w$]*/g;

/**
 * Cut a type as written into plain text and the names of documented types, so
 * the page can turn those names into links to their cards.
 *
 * `ref.links` holds type ids, and an id is the type's name, or
 * `${name}@${importPath}` when two reachable types share a name. An identifier
 * in the text is matched against the name part of each id, the id that is the
 * name itself first. Known limitation: a type imported under another name
 * (`import { Item as OtherItem }`) appears in the text by its local name, which
 * no id carries, so it stays unlinked.
 */
export function typeSegments(ref: ApiTypeRef): TypeSegment[] {
    const links = ref.links ?? [];
    const segments: TypeSegment[] = [];
    let plain = '';
    let last = 0;

    for (const match of ref.text.matchAll(IDENTIFIER)) {
        const name = match[0];
        const id = links.find((candidate) => candidate === name) ?? links.find((candidate) => candidate.split('@')[0] === name);

        if (!id) continue;

        plain += ref.text.slice(last, match.index);
        if (plain) segments.push({ text: plain });
        segments.push({ text: name, link: typeAnchor(id) });
        plain = '';
        last = match.index + name.length;
    }

    plain += ref.text.slice(last);
    if (plain || !segments.length) segments.push({ text: plain });
    return segments;
}

/** A parameter as a signature writes it, `config?: ToastConfig` or `...features: Feature[]`, with its type linked. */
export function paramSegments(param: ApiParam): TypeSegment[] {
    return joinSegments(`${param.rest ? '...' : ''}${param.name}${param.optional ? '?' : ''}: `, typeSegments(param.type));
}

/**
 * A parameter as its declaration writes it, default included:
 * `config: ToastConfig = {}`. A default makes the parameter optional, so it
 * goes without the `?`; one without a default reads as in a signature.
 */
export function declaredParamSegments(param: ApiParam): TypeSegment[] {
    if (param.defaultValue === undefined) return paramSegments(param);
    return joinSegments(`${param.rest ? '...' : ''}${param.name}: `, typeSegments(param.type), ` = ${param.defaultValue}`);
}

/** Whether a parameter list says more than its signature: a `@param` text or a default. */
export function documentsParams(params: readonly ApiParam[] | undefined): boolean {
    return !!params?.some((param) => param.description || param.defaultValue !== undefined);
}

/**
 * What follows a setup entry's name on its signature line: the parameters and
 * the return type of a function, the type of a token.
 */
export function setupSignature(entry: ApiSetupEntry): TypeSegment[] {
    if (entry.kind === 'token') return entry.tokenType ? joinSegments(': ', typeSegments(entry.tokenType)) : [];

    const params = (entry.params ?? []).flatMap((param, index) => (index ? [', ', paramSegments(param)] : [paramSegments(param)]));

    return joinSegments('(', ...params, ')', ...(entry.returnType ? [': ', typeSegments(entry.returnType)] : []));
}

/** Concatenate text and segments, merging neighbouring plain text into one segment. */
function joinSegments(...parts: (string | TypeSegment[])[]): TypeSegment[] {
    const joined: TypeSegment[] = [];

    for (const segment of parts.flatMap((part) => (typeof part === 'string' ? [{ text: part }] : part))) {
        const previous = joined.at(-1);

        if (!segment.text) continue;
        if (previous && !previous.link && !segment.link) previous.text += segment.text;
        else joined.push({ ...segment });
    }

    return joined;
}

/**
 * Split a type's `reachedFrom` (`parameter of show()`, `via options.action`)
 * into its words and the code they end in, so the page can set the code apart.
 */
export function splitReachedFrom(reachedFrom: string): { text: string; code?: string } {
    const space = reachedFrom.lastIndexOf(' ');

    if (space < 0) return { text: reachedFrom };
    return { text: reachedFrom.slice(0, space + 1), code: reachedFrom.slice(space + 1) };
}
