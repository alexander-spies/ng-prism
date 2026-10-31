import { CssSelector } from '@angular/compiler';

export interface SelectorElement {
    tag: string;
    /** The attributes (`name` or `name="value"`) and the classes (`class="a b"`) of the selector part, separated by a space. */
    attributes: string;
}

/** The parts of a selector list; a selector that Angular cannot parse has none. */
function selectorParts(selector: string): CssSelector[] {
    try {
        return CssSelector.parse(selector);
    } catch {
        return [];
    }
}

/** `*` and a missing element both fit any tag. */
function elementOf(part: CssSelector): string | null {
    return part.element && part.element !== '*' ? part.element : null;
}

/** The attributes of a part, then its classes as one `class` attribute. */
function attributeList(part: CssSelector): string[] {
    const attributes: string[] = [];

    // `attrs` is a flat list of name and value pairs; an attribute without a value has ''.
    for (let i = 0; i < part.attrs.length; i += 2) {
        const [name, value] = [part.attrs[i], part.attrs[i + 1]];

        attributes.push(value ? `${name}="${value.replace(/"/g, '&quot;')}"` : name);
    }
    if (part.classNames.length > 0) {
        attributes.push(`class="${part.classNames.join(' ')}"`);
    }
    return attributes;
}

/**
 * The element and the attributes a directive's selector asks for, to render the directive on a host element.
 *
 * Of a selector list it takes the first part whose element is `tag` or missing; without a `tag`, the first part
 * and its element, or `div` when it names none. `:not()` is ignored. `null` when no part fits `tag`, or when the
 * selector does not parse.
 */
export function selectorElement(selector: string, tag?: string): SelectorElement | null {
    const parts = selectorParts(selector);
    const part = tag === undefined ? parts[0] : parts.find((candidate) => (elementOf(candidate) ?? tag) === tag);

    if (!part) return null;
    return { tag: tag ?? elementOf(part) ?? 'div', attributes: attributeList(part).join(' ') };
}

/** The first attribute of the first part of `selector`, as far as there is one: the least that makes a directive apply when its selector fits no host. */
export function firstSelectorAttribute(selector: string): string {
    const part = selectorParts(selector)[0];

    return (part && attributeList(part)[0]) || '';
}
