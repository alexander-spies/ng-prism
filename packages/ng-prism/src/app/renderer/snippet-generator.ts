import type { DirectiveHost } from '../../decorator/showcase.types.js';
import type { InputMeta } from '../../plugin/plugin.types.js';

export interface SnippetDirectiveOptions {
    host?: string | DirectiveHost;
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

export function generateSnippet(
    selector: string,
    inputs: InputMeta[],
    values: Record<string, unknown>,
    explicitKeys?: ReadonlySet<string>,
    content?: string | Record<string, string>,
    directiveOptions?: SnippetDirectiveOptions
): string {
    if (directiveOptions?.host) {
        return generateDirectiveSnippet(selector, inputs, values, explicitKeys, content, directiveOptions.host);
    }

    const attributes: string[] = [];
    const processed = new Set<string>();

    for (const input of inputs) {
        processed.add(input.name);
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

function parseHostStringSimple(host: string): { tag: string; attrs: string } {
    const match = host.trim().match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*\/?\s*>$/);

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

    const attributes: string[] = [];
    const processed = new Set<string>(['__prismContent__']);

    for (const input of inputs) {
        processed.add(input.name);
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

    const projectedContent = content ?? (typeof values['__prismContent__'] === 'string' ? (values['__prismContent__'] as string) : undefined);
    // An input aliased to the directive's own selector already puts the directive on the host.
    const selectorAttrs = attributes.some((a) => a.startsWith(`${directiveAttr}=`) || a.startsWith(`[${directiveAttr}]=`)) ? [] : [directiveAttr];
    const allAttrs = [...hostAttrs, ...selectorAttrs, ...attributes].join(' ');
    const contentHtml = resolveContentHtml(projectedContent);

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
