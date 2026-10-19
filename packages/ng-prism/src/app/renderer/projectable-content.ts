/**
 * Turns per-variant `content` into the `projectableNodes` argument of
 * `ViewContainerRef.createComponent`.
 *
 * Shared by the Playground stage and the Overview cells: both project the same
 * developer-authored content, and the slot-selector handling is the one piece
 * of that neither wants to own twice.
 *
 * `createComponent` hands `projectableNodes[i]` to the i-th `<ng-content>` of
 * the template and never looks at selectors, so the lists are ordered by the
 * component's `ngContentSelectors` (`reflectComponentType`): `default` (or a
 * plain string) goes to the `*` slot, every other key to the slot whose
 * `select` it names. A key no slot takes is dropped and reported to
 * `onUnmatchedKey`.
 */

// SAFETY: `content` originates from `@Showcase({ variants: [{ content }] })`
// in developer-authored source code. It is trusted by ng-prism's threat model
// (see SECURITY.md). Sanitization would strip the Angular component/directive
// selectors that variant content is meant to project.
export function parseContentToNodes(content: string | Record<string, string>, ngContentSelectors: readonly string[], onUnmatchedKey?: (key: string) => void): Node[][] {
    const byKey = typeof content === 'string' ? { default: content } : content;
    const slotKeys = ngContentSelectors.map((selector) => (selector.trim() === '*' ? 'default' : selector.trim()));

    for (const key of Object.keys(byKey)) {
        if (!slotKeys.includes(key)) onUnmatchedKey?.(key);
    }

    return slotKeys.map((key) => {
        const html = byKey[key];

        if (html === undefined) return [];
        return key === 'default' ? htmlToNodes(html) : namedSlotNodes(html, key);
    });
}

// SAFETY: trusted developer-authored HTML, see SECURITY.md.
function namedSlotNodes(html: string, selector: string): Node[] {
    const wrapper = document.createElement('div');

    wrapper.innerHTML = html;
    const nodes: Node[] = [];

    for (const child of Array.from(wrapper.childNodes)) {
        const el = document.createElement('div');

        // SAFETY: trusted developer-authored HTML (see SECURITY.md).
        el.innerHTML = (child as Element).outerHTML ?? child.textContent ?? '';
        const projected = el.firstChild;

        if (projected && projected instanceof Element) {
            applySelector(projected, selector);
            nodes.push(projected);
        } else if (projected) {
            const span = document.createElement('span');

            applySelector(span, selector);
            span.textContent = child.textContent;
            nodes.push(span);
        }
    }
    return nodes;
}

// SAFETY: see `parseContentToNodes` above and SECURITY.md. `html` is trusted
// developer-authored variant content from the `@Showcase` decorator.
function htmlToNodes(html: string): Node[] {
    const wrapper = document.createElement('div');

    wrapper.innerHTML = html;
    return Array.from(wrapper.childNodes);
}

function applySelector(el: Element, selector: string): void {
    const attrMatch = selector.match(/^\[([^\]=]+)]$/);

    if (attrMatch) {
        el.setAttribute(attrMatch[1], '');
    }
}
