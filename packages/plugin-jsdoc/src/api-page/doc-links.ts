import type { ApiTypeDoc } from '@ng-prism/core/plugin';
import { typeAnchor } from './api-page.helpers.js';

/** A `{@link}` tag: the target ends at a space, a bar or the brace, the text follows after a bar or after a space. */
const LINK_TAG = /\{@(?:link|linkcode|linkplain)\s+([^\s|}]+)\s*(?:\|\s*)?([^}]*)\}/g;

/** A Markdown code span: a run of backticks up to the next run of the same length. */
const CODE_SPAN = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;

const URL_TARGET = /^[a-z][a-z\d+.-]*:/i;

/** Marks the button of a link, so the page can find it in rendered `innerHTML` that Angular does not bind. */
export const TYPE_LINK_ATTRIBUTE = 'data-prism-type-link';

/**
 * The TOC anchor of the type card a doc reference names: by id, then by name;
 * `X.y` and `X#y` name `X`. A page holds two types of one name only under
 * different ids, so an exact id is what tells them apart. The anchor is in
 * `scope`, the one of the part's block when the doc is a part's.
 */
export function typeLinkTarget(types: readonly ApiTypeDoc[], target: string, scope = ''): string | undefined {
    const named = (name: string) => (types.find((type) => type.id === name) ?? types.find((type) => type.name === name))?.id;
    const id = named(target) ?? named(target.split(/[.#]/, 1)[0]);

    return id === undefined ? undefined : typeAnchor(id, scope);
}

/**
 * Rewrites `{@link}`, `{@linkcode}` and `{@linkplain}` into what the Markdown renderer shows: a button to the type card
 * `resolve` names, a Markdown link for a URL target, inline code (or the link text) otherwise. Code spans stay as written.
 */
export function resolveDocLinks(text: string, resolve: (target: string) => string | undefined): string {
    let result = '';
    let end = 0;

    for (const span of text.matchAll(CODE_SPAN)) {
        result += rewriteLinks(text.slice(end, span.index), resolve) + span[0];
        end = span.index + span[0].length;
    }

    return result + rewriteLinks(text.slice(end), resolve);
}

function rewriteLinks(text: string, resolve: (target: string) => string | undefined): string {
    return text.replace(LINK_TAG, (_tag, target: string, linkText: string) => {
        const label = linkText.trim();

        if (URL_TARGET.test(target)) return `[${label || target}](${target})`;

        const anchor = resolve(target);

        if (anchor === undefined) return label || `\`${target}\``;

        return `<button type="button" class="prism-jsdoc-api-page__ref" ${TYPE_LINK_ATTRIBUTE}="${escapeHtml(anchor)}">${escapeHtml(label || target)}</button>`;
    });
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
