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
 * ng-prism leaves in `CompositionCase.template`. Nothing else is rewritten.
 */
export function generateCompositionSnippet(caseTemplate: string, attributes: string[]): string {
    const written = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';

    return caseTemplate.split(COMPOSITION_SUBJECT_SLOT).join(written);
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

    const attributes = subjectAttributes(inputs, values, explicitKeys);
    const contentHtml = resolveContentHtml(content);

    if (!contentHtml) {
        if (attributes.length === 0) {
            return `<${selector} />`;
        }
        const singleLine = `<${selector} ${attributes.join(' ')} />`;

        if (singleLine.length <= 80) {
            return singleLine;
        }
        const indented = attributes.map((attr) => `  ${attr}`).join('\n');

        return `<${selector}\n${indented} />`;
    }

    const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    const openTag = `<${selector}${attrStr}>`;
    const closeTag = `</${selector}>`;
    const singleLine = `${openTag}${contentHtml}${closeTag}`;

    if (singleLine.length <= 80) {
        return singleLine;
    }

    if (attributes.length <= 2) {
        return `${openTag}\n  ${contentHtml}\n${closeTag}`;
    }

    const indented = attributes.map((attr) => `  ${attr}`).join('\n');

    return `<${selector}\n${indented}>\n  ${contentHtml}\n${closeTag}`;
}

function directiveSelectorToAttr(selector: string): string {
    const match = selector.match(/^\[([^\]]+)]$/);

    return match ? match[1] : selector;
}

/**
 * The element a string host starts with and its attributes as written. A host may carry content and an end tag
 * (`<button class="btn">Hover me</button>`): the showcase renders all of it, the snippet only needs the element to put
 * the directive on.
 */
function parseHostStringSimple(host: string): { tag: string; attrs: string } {
    const match = host.match(/^\s*<\s*([a-zA-Z][\w-]*)([^>]*?)\s*\/?\s*>/);

    if (!match) return { tag: 'div', attrs: '' };
    return { tag: match[1], attrs: match[2].trim() };
}

function generateDirectiveSnippet(
    selector: string,
    inputs: InputMeta[],
    values: Record<string, unknown>,
    explicitKeys: ReadonlySet<string> | undefined,
    content: string | Record<string, string> | undefined,
    host: string | DirectiveHost
): string {
    const directiveAttr = directiveSelectorToAttr(selector);

    let tag: string;
    const hostAttrs: string[] = [];

    if (typeof host === 'string') {
        const parsed = parseHostStringSimple(host);

        tag = parsed.tag;
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
    const projectedContent = content ?? (typeof values[PRISM_CONTENT_INPUT] === 'string' ? (values[PRISM_CONTENT_INPUT] as string) : undefined);
    // An input aliased to the directive's own selector already puts the directive on the host.
    const selectorAttrs = attributes.some((a) => a.startsWith(`${directiveAttr}=`) || a.startsWith(`[${directiveAttr}]=`)) ? [] : [directiveAttr];
    const allAttrs = [...hostAttrs, ...selectorAttrs, ...attributes].join(' ');
    // A void element takes no content and no end tag: `<input>` and `<input />` are valid, `<input>text</input>` is not.
    const contentHtml = VOID_ELEMENTS.has(tag.toLowerCase()) ? undefined : resolveContentHtml(projectedContent);

    if (!contentHtml) {
        if (!allAttrs) return `<${tag} />`;
        const singleLine = `<${tag} ${allAttrs} />`;

        if (singleLine.length <= 80) return singleLine;
        const indented = [...hostAttrs, ...selectorAttrs, ...attributes].map((a) => `  ${a}`).join('\n');

        return `<${tag}\n${indented} />`;
    }

    const openTag = `<${tag} ${allAttrs}>`;
    const closeTag = `</${tag}>`;
    const singleLine = `${openTag}${contentHtml}${closeTag}`;

    if (singleLine.length <= 80) return singleLine;

    const allAttrsList = [...hostAttrs, ...selectorAttrs, ...attributes];

    if (allAttrsList.length <= 2) {
        return `${openTag}\n  ${contentHtml}\n${closeTag}`;
    }

    const indented = allAttrsList.map((a) => `  ${a}`).join('\n');

    return `<${tag}\n${indented}>\n  ${contentHtml}\n${closeTag}`;
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
