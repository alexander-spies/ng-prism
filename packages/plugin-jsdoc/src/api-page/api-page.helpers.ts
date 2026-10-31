import type { ApiParam, ApiSetupEntry, ApiTypeRef } from '@ng-prism/core/plugin';
import type { ApiPageModel, ApiPagePart } from './api-page.model.js';

/**
 * One entry of the API page's "On this page" list. `id` names the section, `level` 2 is a type below "Types", or a
 * section of a part below the part's own entry, which is flagged with `part`.
 */
export interface TocEntry {
    id: string;
    label: string;
    level: 1 | 2;
    /** The entry of a part: the heading of its block, which its sections follow. */
    part?: true;
}

/** A piece of a type as written; `link` is the TOC id of the documented type the piece names. */
export interface TypeSegment {
    text: string;
    link?: string;
}

/**
 * An anchor id inside a scope: `scope-id`, or the id itself without a scope. The API page of a part shares one scroll
 * host with its parent's page and the pages of the other parts, so every id on it carries the scope of its part.
 */
export function scopedAnchor(scope: string, id: string): string {
    return scope ? `${scope}-${id}` : id;
}

/**
 * The scope of a part's block, by the position of the part on the page rather than its class: two parts from different
 * files can share a class name. The scope holds no hyphen after `part-`, which {@link isTypeAnchor} relies on.
 */
export function partScope(index: number): string {
    return `part-${index}`;
}

/** The TOC id of the block of the part `key` names (see `partKeys`), `null` when the page has no such part. */
export function partAnchor(parts: readonly ApiPagePart[], key: string | null): string | null {
    return parts.find((part) => part.key === key)?.scope ?? null;
}

/** Where the page jumps for `activePart`: the block, on the page of a class. */
export interface PartJump {
    page: string;
    anchor: string;
}

/**
 * The jump to the block of the part `key` names on the page of `page`, `null` when the page has no such part. Two jumps
 * are the same when {@link samePartJump} says so: the page goes to the block once per jump.
 */
export function partJump(page: string, parts: readonly ApiPagePart[], key: string | null): PartJump | null {
    const anchor = partAnchor(parts, key);

    return anchor ? { page, anchor } : null;
}

/**
 * Whether two jumps go to the same block. The page is part of it because a block's anchor goes by the position of the
 * part: the parts of two components at the same position share one, and going from one to the other (back and forward
 * between their links) is a jump all the same. The parts themselves are not: a manifest update during `serve` hands
 * over new ones, which must not send the reader back to the block.
 */
export function samePartJump(a: PartJump | null, b: PartJump | null): boolean {
    return a?.page === b?.page && a?.anchor === b?.anchor;
}

/** The TOC id of a documented type's card, in the scope of the page that shows it. */
export function typeAnchor(typeId: string, scope = ''): string {
    return scopedAnchor(scope, `type-${typeId}`);
}

const TYPE_ANCHOR = /^(?:part-[^-]+-)?type-/;

/** Whether a TOC id is the anchor of a type card, in the page's own scope or in a part's. */
export function isTypeAnchor(id: string): boolean {
    return TYPE_ANCHOR.test(id);
}

/** The section of the types: its heading, and a card per type below it. */
const TYPES_SECTION = 'types';

/** The sections of an API page in the order the page shows them, by their unscoped id; the ones without content are left out. */
function pageSections(page: ApiPageModel): { id: string; label: string }[] {
    const sections: [id: string, label: string, present: boolean][] = [
        ['usage', 'Usage', true],
        ['setup', 'Setup', page.setup.length > 0],
        ['examples', 'Examples', page.examples.length > 0],
        ['inputs', 'Inputs', !!page.inputs?.length],
        ['outputs', 'Outputs', !!page.outputs?.length],
        ['properties', 'Properties', !!page.properties?.length],
        ['methods', 'Methods', !!page.methods?.length],
        ['transform', 'Transform', !!page.transform?.length],
        [TYPES_SECTION, 'Types', page.types.length > 0]
    ];

    return sections.filter(([, , present]) => present).map(([id, label]) => ({ id, label }));
}

/**
 * The sections of an API page in the order the page shows them. Usage is
 * always there, being generated; any other section only when it has content.
 * A component or directive has inputs, outputs and methods, a service
 * properties and methods, a pipe its transform signatures. Every id is in
 * `scope`, the one of a part's block, or unscoped for the page itself.
 */
export function buildApiPageToc(page: ApiPageModel, scope = ''): TocEntry[] {
    const toc: TocEntry[] = pageSections(page).map(({ id, label }) => ({ id: scopedAnchor(scope, id), label, level: 1 }));

    for (const type of page.types) toc.push({ id: typeAnchor(type.id, scope), label: type.name, level: 2 });
    return toc;
}

/**
 * The "Parts" group of the "On this page" list: for each part an entry that
 * names the part by its title, then the sections of its page one level down.
 * The Types section and its cards stay out, as the parent's list is the place
 * for those; the part's block still has them.
 */
export function buildPartsToc(parts: readonly ApiPagePart[]): TocEntry[] {
    return parts.flatMap(({ scope, title, page }): TocEntry[] => [
        { id: scope, label: title, level: 1, part: true },
        ...pageSections(page)
            .filter(({ id }) => id !== TYPES_SECTION)
            .map(({ id, label }): TocEntry => ({ id: scopedAnchor(scope, id), label, level: 2 }))
    ]);
}

/**
 * The entry of the "On this page" list that stands for the anchor `id`: the anchor's own, or for one without an entry
 * (a part's Types section and its cards) the last listed anchor before it on the page, the part's last listed section.
 * `anchorIds` are the TOC ids of all anchors in page order, `listed` those the list has. `id` itself when nothing
 * listed comes before it.
 */
export function listedTocId(anchorIds: readonly string[], listed: ReadonlySet<string>, id: string): string {
    if (listed.has(id)) return id;

    return (
        anchorIds
            .slice(0, Math.max(anchorIds.indexOf(id), 0))
            .filter((anchor) => listed.has(anchor))
            .at(-1) ?? id
    );
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
export function typeSegments(ref: ApiTypeRef, scope = ''): TypeSegment[] {
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
        segments.push({ text: name, link: typeAnchor(id, scope) });
        plain = '';
        last = match.index + name.length;
    }

    plain += ref.text.slice(last);
    if (plain || !segments.length) segments.push({ text: plain });
    return segments;
}

/** A parameter as a signature writes it, `config?: ToastConfig` or `...features: Feature[]`, with its type linked. */
export function paramSegments(param: ApiParam, scope = ''): TypeSegment[] {
    return joinSegments(`${param.rest ? '...' : ''}${param.name}${param.optional ? '?' : ''}: `, typeSegments(param.type, scope));
}

/**
 * A parameter as its declaration writes it, default included:
 * `config: ToastConfig = {}`. A default makes the parameter optional, so it
 * goes without the `?`; one without a default reads as in a signature.
 */
export function declaredParamSegments(param: ApiParam, scope = ''): TypeSegment[] {
    if (param.defaultValue === undefined) return paramSegments(param, scope);
    return joinSegments(`${param.rest ? '...' : ''}${param.name}: `, typeSegments(param.type, scope), ` = ${param.defaultValue}`);
}

/** Whether a parameter list says more than its signature: a `@param` text or a default. */
export function documentsParams(params: readonly ApiParam[] | undefined): boolean {
    return !!params?.some((param) => param.description || param.defaultValue !== undefined);
}

/**
 * What follows a setup entry's name on its signature line: the parameters and
 * the return type of a function, the type of a token.
 */
export function setupSignature(entry: ApiSetupEntry, scope = ''): TypeSegment[] {
    if (entry.kind === 'token') return entry.tokenType ? joinSegments(': ', typeSegments(entry.tokenType, scope)) : [];

    const params = (entry.params ?? []).flatMap((param, index) => (index ? [', ', paramSegments(param, scope)] : [paramSegments(param, scope)]));

    return joinSegments('(', ...params, ')', ...(entry.returnType ? [': ', typeSegments(entry.returnType, scope)] : []));
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
