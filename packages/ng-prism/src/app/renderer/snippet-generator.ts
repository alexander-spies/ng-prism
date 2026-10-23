import type { DirectiveHost, HostTemplate } from '../../decorator/showcase.types.js';
import type { InputMeta } from '../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT } from '../../shared/composition.js';
import { VOID_ELEMENTS } from '../../shared/void-elements.js';
import { PRISM_CONTENT_INPUT } from './input-bindings.js';

/** The value a directive's host renders its text content through: the snippet writes it as content, never as an attribute. */
const HOST_CONTENT_KEYS: ReadonlySet<string> = new Set([PRISM_CONTENT_INPUT]);

export interface SnippetDirectiveOptions {
    host?: string | DirectiveHost | HostTemplate;
}

function escapeAttrValue(value: unknown): string {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function pushAttribute(attributes: string[], name: string, value: unknown): void {
    if (typeof value === 'string') {
        attributes.push(`${name}="${escapeAttrValue(value)}"`);
    } else if (typeof value === 'boolean') {
        attributes.push(`[${name}]="${value}"`);
    } else if (typeof value === 'number') {
        attributes.push(`[${name}]="${value}"`);
    } else if (typeof value === 'object' || Array.isArray(value)) {
        attributes.push(`[${name}]="yourData"`);
    } else {
        attributes.push(`[${name}]="${escapeAttrValue(value)}"`);
    }
}

/**
 * The attributes that put the current values on the subject element. A value that equals its default is left out unless
 * the variant sets it (`explicitKeys`); `skip` holds the member names of inputs that are not written at all, such as
 * the ones a composition does not bind.
 */
export function subjectAttributes(inputs: InputMeta[], values: Record<string, unknown>, explicitKeys?: ReadonlySet<string>, skip?: ReadonlySet<string>): string[] {
    const attributes: string[] = [];
    const processed = new Set<string>(skip);

    for (const input of inputs) {
        processed.add(input.name);
        if (skip?.has(input.name)) continue;
        const value = values[input.name];

        if (value === undefined) continue;
        if (input.defaultValue !== undefined && value === input.defaultValue && !explicitKeys?.has(input.name)) continue;
        // Only a guess, and only sound when no default is known: a boolean input
        // that defaults to `true` has to show its explicit `false`.
        if (input.defaultValue === undefined && typeof value === 'boolean' && !value) continue;

        pushAttribute(attributes, input.alias ?? input.name, value);
    }

    for (const [name, value] of Object.entries(values)) {
        if (processed.has(name)) continue;
        if (value === undefined) continue;
        if (typeof value === 'boolean' && !value) continue;
        pushAttribute(attributes, name, value);
    }

    return attributes;
}

/**
 * The composition of a case as its author wrote it, with `attributes` on the subject element in place of the slot
 * ng-prism leaves in `CompositionCase.template`. Only a bare attribute of the subject that one of them gives a value
 * (`libTooltip`, which the selector asks for) is left out, as `attributes` writes it again.
 */
export function generateCompositionSnippet(caseTemplate: string, attributes: string[]): string {
    const written = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
    const names = attributes.map((attribute) => attribute.split('=')[0].replace(/^\[(.*)\]$/, '$1'));
    const parts = caseTemplate.split(COMPOSITION_SUBJECT_SLOT);

    // The slot ends the subject's start tag, so each part but the last ends with one.
    return parts.map((part, index) => (index < parts.length - 1 ? withoutBareAttributes(part, names) : part)).join(written);
}

/** `text` without the bare attributes `names` in the start tag it ends with. */
function withoutBareAttributes(text: string, names: readonly string[]): string {
    const start = text.lastIndexOf('<');

    if (start < 0) return text;

    const startTag = names.reduce((tag, name) => tag.replace(new RegExp(`\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`), ''), text.slice(start));

    return text.slice(0, start) + startTag;
}

export function generateSnippet(
    selector: string,
    inputs: InputMeta[],
    values: Record<string, unknown>,
    explicitKeys?: ReadonlySet<string>,
    content?: string | Record<string, string>,
    directiveOptions?: SnippetDirectiveOptions
): string {
    const host = directiveOptions?.host;

    // A `{ template }` host is not shown yet: the snippet is the directive's selector, as without a host.
    if (host && !(typeof host === 'object' && 'template' in host)) {
        return generateDirectiveSnippet(selector, inputs, values, explicitKeys, content, host);
    }

    // A directive without a host renders on the element of its selector, with its text content in `__prismContent__`.
    const attributes = subjectAttributes(inputs, values, explicitKeys, HOST_CONTENT_KEYS);
    const element = selectorToElement(selector);
    const selectorAttributes = unwrittenSelectorAttributes(element.attributes, attributes);

    return renderElement(element.tag, [...selectorAttributes, ...attributes], resolveContentHtml(content ?? hostContentValue(values)));
}

function hostContentValue(values: Record<string, unknown>): string | undefined {
    const value = values[PRISM_CONTENT_INPUT];

    return typeof value === 'string' ? value : undefined;
}

/** One part of a selector list: its element, if it names one, and its attributes and classes as the markup writes them. */
interface SelectorPart {
    tag?: string;
    attributes: string[];
}

/** The parts of a selector list. `:not()` is ignored. */
function selectorParts(selector: string): SelectorPart[] {
    return selector
        .replace(/:not\([^)]*\)/g, '')
        .split(',')
        .map((part) => {
            const text = part.trim();
            const tag = text.match(/^[a-zA-Z][\w-]*/)?.[0];
            const attributes: string[] = [];
            const classNames: string[] = [];

            for (const [, name, value, className] of text.slice(tag?.length ?? 0).matchAll(/\[([^\]=]+)(?:=["']?([^\]"']*)["']?)?\]|\.([\w-]+)/g)) {
                if (className) {
                    classNames.push(className);
                } else {
                    attributes.push(value ? `${name}="${escapeAttrValue(value)}"` : name);
                }
            }
            if (classNames.length > 0) attributes.push(`class="${classNames.join(' ')}"`);

            return { tag, attributes };
        });
}

/**
 * The element and the attributes a component's selector asks for: `button[libBtn]` is `<button libBtn>`. Of a selector
 * list only the first part counts, and a selector without an element is a `div`, as when the styleguide renders it.
 */
function selectorToElement(selector: string): { tag: string; attributes: string[] } {
    const [first] = selectorParts(selector);

    return { tag: first.tag ?? 'div', attributes: first.attributes };
}

/**
 * The attributes of a directive's selector that put it on a host element `tag`: those of the first part of a selector
 * list that names `tag` or no element, as the generated wrapper takes them. When no part fits, the first part's.
 */
function selectorAttributesOnHost(selector: string, tag: string): string[] {
    const parts = selectorParts(selector);
    const fitting = parts.find((part) => (part.tag ?? tag).toLowerCase() === tag.toLowerCase()) ?? parts[0];

    return fitting.attributes;
}

/** The attributes of a selector that no written attribute sets yet: an input aliased to one of them gives it its value. */
function unwrittenSelectorAttributes(selectorAttributes: string[], written: string[]): string[] {
    return selectorAttributes.filter((attribute) => {
        const name = attribute.split('=')[0];

        return !written.some((w) => w.startsWith(`${name}=`) || w.startsWith(`[${name}]=`));
    });
}

/**
 * One element, on a single line when it fits in 80 characters. A void element takes no content and no end tag
 * (`<input>` and `<input />` are valid, `<input>text</input>` is not). Only void and custom elements may close
 * themselves: Angular rejects `<button />`, so any other element without content gets its end tag.
 */
function renderElement(tag: string, attributes: string[], contentHtml: string | undefined): string {
    const attrStr = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
    const indented = attributes.map((attr) => `  ${attr}`).join('\n');
    const content = VOID_ELEMENTS.has(tag.toLowerCase()) ? undefined : contentHtml;

    if (!content) {
        const selfClosing = VOID_ELEMENTS.has(tag.toLowerCase()) || tag.includes('-');
        const end = selfClosing ? ' />' : `></${tag}>`;
        const singleLine = `<${tag}${attrStr}${end}`;

        if (attributes.length === 0 || singleLine.length <= 80) return singleLine;
        return `<${tag}\n${indented}${end}`;
    }

    const openTag = `<${tag}${attrStr}>`;
    const closeTag = `</${tag}>`;
    const singleLine = `${openTag}${content}${closeTag}`;

    if (singleLine.length <= 80) return singleLine;
    if (attributes.length <= 2) return `${openTag}\n  ${content}\n${closeTag}`;
    return `<${tag}\n${indented}>\n  ${content}\n${closeTag}`;
}

/**
 * The element a string host starts with, its attributes as written, and the content between its start and end tag
 * (`<button class="btn">Hover me</button>`): that content is what the host renders when a variant sets none.
 */
function parseHostStringSimple(host: string): { tag: string; attrs: string; content?: string } {
    const start = host.match(/^\s*<\s*([a-zA-Z][\w-]*)([^>]*?)\s*\/?\s*>/);

    if (!start) return { tag: 'div', attrs: '' };
    const [opening, tag, attrs] = start;
    const content = host.slice(opening.length).match(new RegExp(`^([\\s\\S]*?)<\\/\\s*${tag}\\s*>\\s*$`, 'i'))?.[1];

    return { tag, attrs: attrs.trim(), content };
}

function generateDirectiveSnippet(
    selector: string,
    inputs: InputMeta[],
    values: Record<string, unknown>,
    explicitKeys: ReadonlySet<string> | undefined,
    content: string | Record<string, string> | undefined,
    host: string | DirectiveHost
): string {
    let tag: string;
    let hostContent: string | undefined;
    const hostAttrs: string[] = [];

    if (typeof host === 'string') {
        const parsed = parseHostStringSimple(host);

        tag = parsed.tag;
        hostContent = parsed.content;
        if (parsed.attrs) hostAttrs.push(parsed.attrs);
    } else {
        tag = host.selector;
        if (host.inputs) {
            for (const [k, v] of Object.entries(host.inputs)) {
                hostAttrs.push(`${k}="${escapeAttrValue(v)}"`);
            }
        }
    }

    const attributes = subjectAttributes(inputs, values, explicitKeys, HOST_CONTENT_KEYS);
    // The variant's content, else the content of the host: the generated host's `__prismContent__` defaults to it.
    const projectedContent = content ?? hostContentValue(values) ?? hostContent;
    // An input aliased to an attribute of the directive's selector already puts the directive on the host.
    const selectorAttrs = unwrittenSelectorAttributes(selectorAttributesOnHost(selector, tag), attributes);

    return renderElement(tag, [...hostAttrs, ...selectorAttrs, ...attributes], resolveContentHtml(projectedContent));
}

function resolveContentHtml(content?: string | Record<string, string>): string | undefined {
    if (!content) return undefined;
    if (typeof content === 'string') return content;

    const parts: string[] = [];

    for (const [selector, html] of Object.entries(content)) {
        if (selector === 'default') {
            parts.push(html);
        } else {
            const attr = selector.replace(/^\[|\]$/g, '');

            parts.push(`<ng-container ${attr}>${html}</ng-container>`);
        }
    }
    return parts.join('\n  ');
}
