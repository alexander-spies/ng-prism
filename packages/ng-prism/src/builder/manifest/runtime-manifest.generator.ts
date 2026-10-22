import type { DirectiveHost } from '../../decorator/showcase.types.js';
import type { StyleguidePage } from '../../plugin/page.types.js';
import type { ScannedPipe } from '../../plugin/pipe.types.js';
import type { InputMeta, ScannedComponent } from '../../plugin/plugin.types.js';
import type { ScannedService } from '../../plugin/service.types.js';
import { parseHostString } from './host-parser.js';

export interface RuntimeManifestOptions {
    components: ScannedComponent[];
    /** Written as data: a service's class is never imported into the styleguide. */
    services?: ScannedService[];
    /** Written as data too: a pipe's class is never imported into the styleguide. */
    pipes?: ScannedPipe[];
    libraryImportPath: string;
    pages?: StyleguidePage[];
    meta?: Record<string, unknown>;
}

function inputTypeAnnotation(input: InputMeta): string {
    if (input.type === 'union' && input.values) {
        return input.values.map((v) => `'${v}'`).join(' | ');
    }
    if (input.type === 'boolean') return 'boolean';
    if (input.type === 'number') return 'number';
    if (input.type === 'string') return 'string';
    if (input.type === 'array') return 'unknown[]';
    if (input.type === 'object') return 'Record<string, unknown>';
    return 'unknown';
}

function formatInputDeclaration(input: InputMeta): string {
    if (input.required) {
        const typeAnnotation = inputTypeAnnotation(input);

        return `input.required<${typeAnnotation}>()`;
    }

    const def = input.defaultValue !== undefined ? JSON.stringify(input.defaultValue) : "''";
    const needsAnnotation = input.type === 'union' && input.values;

    if (needsAnnotation) {
        const typeAnnotation = inputTypeAnnotation(input);

        return `input<${typeAnnotation}>(${def})`;
    }
    return `input(${def})`;
}

function directiveSelector(selector: string): string {
    const match = selector.match(/^\[([^\]]+)]$/);

    return match ? match[1] : selector;
}

function isBindableInput(input: InputMeta): boolean {
    if (input.type === 'string' || input.type === 'number' || input.type === 'boolean' || input.type === 'union') {
        return true;
    }
    return input.defaultValue !== undefined;
}

function generateWrapperClass(comp: ScannedComponent): string {
    const wrapperName = `${comp.className}__PrismHost`;
    const host = comp.showcaseConfig.host;
    const directiveAttr = directiveSelector(comp.componentMeta.selector);
    const bindableInputs = comp.inputs.filter(isBindableInput);

    let tag: string;
    let attrs: string;
    let importsArray: string;
    let hostContentDefault = '';

    if (typeof host === 'string') {
        const parsed = parseHostString(host);

        tag = parsed?.tag ?? 'div';
        attrs = parsed?.attrs ? ` ${parsed.attrs}` : '';
        hostContentDefault = parsed?.content ?? '';
        importsArray = `[${comp.className}]`;
    } else if (host && typeof host === 'object') {
        const hostObj = host as DirectiveHost;

        tag = hostObj.selector;
        const staticInputs = Object.entries(hostObj.inputs ?? {})
            .map(([k, v]) => ` ${k}="${String(v)}"`)
            .join('');

        attrs = staticInputs;
        importsArray = `[${comp.className}, ${hostObj.import.name}]`;
    } else {
        tag = 'div';
        attrs = '';
        importsArray = `[${comp.className}]`;
    }

    // The wrapper declares its inputs and outputs under the member names and binds the directive's public ones.
    const inputBindings = bindableInputs.map((i) => ` [${i.alias ?? i.name}]="${i.name}()"`).join('');

    const outputBindings = comp.outputs.map((o) => ` (${o.alias ?? o.name})="${o.name}.emit($event)"`).join('');

    const template = `<${tag}${attrs} ${directiveAttr}${inputBindings}${outputBindings}>{{ __prismContent__() }}</${tag}>`;

    const members: string[] = [];

    for (const i of bindableInputs) {
        members.push(`  ${i.name} = ${formatInputDeclaration(i)};`);
    }
    for (const o of comp.outputs) {
        members.push(`  ${o.name} = output();`);
    }
    members.push(`  __prismContent__ = input(${JSON.stringify(hostContentDefault)});`);

    const lines = [`@Component({`, `  standalone: true,`, `  imports: ${importsArray},`, `  template: \`${template}\`,`, `})`, `class ${wrapperName} {`, ...members, `}`];

    return lines.join('\n');
}

function groupComponentsByImportPath(components: ScannedComponent[], fallbackImportPath: string): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const comp of components) {
        const path = comp.importPath ?? fallbackImportPath;
        const list = groups.get(path);

        if (list) {
            list.push(comp.className);
        } else {
            groups.set(path, [comp.className]);
        }
    }
    return groups;
}

export function generateRuntimeManifest(options: RuntimeManifestOptions): string {
    const { components, services, pipes, libraryImportPath, pages, meta } = options;

    const directives = components.filter((c) => c.componentMeta.isDirective);
    const hasDirectives = directives.length > 0;

    const lines: string[] = ['// AUTO-GENERATED by ng-prism. Do not edit!', "import type { RuntimeManifest } from '@ng-prism/core/plugin';"];

    if (hasDirectives) {
        lines.push("import { Component, input, output } from '@angular/core';");
    }

    if (components.length > 0) {
        const groups = groupComponentsByImportPath(components, libraryImportPath);

        for (const comp of directives) {
            const host = comp.showcaseConfig.host;

            if (host && typeof host === 'object' && 'import' in host) {
                const hostObj = host as DirectiveHost;
                const existing = groups.get(hostObj.import.from);

                if (existing) {
                    if (!existing.includes(hostObj.import.name)) {
                        existing.push(hostObj.import.name);
                    }
                } else {
                    groups.set(hostObj.import.from, [hostObj.import.name]);
                }
            }
        }

        for (const [path, classNames] of groups) {
            lines.push(`import { ${classNames.join(', ')} } from '${path}';`);
        }
    }

    if (hasDirectives) {
        lines.push('');
        for (const comp of directives) {
            lines.push(generateWrapperClass(comp));
            lines.push('');
        }
    }

    lines.push('');
    lines.push('export const PRISM_RUNTIME_MANIFEST: RuntimeManifest = {');
    lines.push('  components: [');

    for (const comp of components) {
        const typeName = comp.componentMeta.isDirective ? `${comp.className}__PrismHost` : comp.className;

        lines.push('    {');
        lines.push(`      type: ${typeName},`);
        lines.push(`      meta: ${formatMeta(comp, 6)},`);
        lines.push('    },');
    }

    lines.push('  ],');

    pushDataEntries(lines, 'services', services);
    pushDataEntries(lines, 'pipes', pipes);

    if (pages && pages.length > 0) {
        lines.push(
            `  pages: ${JSON.stringify(pages, null, 2)
                .split('\n')
                .map((l, i) => (i === 0 ? l : '  ' + l))
                .join('\n')},`
        );
    }

    if (meta && Object.keys(meta).length > 0) {
        const metaJson = JSON.stringify(meta, null, 2)
            .split('\n')
            .map((l, i) => (i === 0 ? l : '  ' + l))
            .join('\n');

        lines.push(`  meta: ${metaJson},`);
    }

    lines.push('};');
    lines.push('');

    return lines.join('\n');
}

/** A service or a pipe is `{ meta }` and nothing else: the styleguide never imports its class. Writes no line when there is none. */
function pushDataEntries(lines: string[], key: 'services' | 'pipes', items: ScannedService[] | ScannedPipe[] | undefined): void {
    if (!items || items.length === 0) return;

    lines.push(`  ${key}: [`);

    for (const item of items) {
        lines.push('    {');
        lines.push(`      meta: ${formatObject(item as unknown as Record<string, unknown>, 6)},`);
        lines.push('    },');
    }

    lines.push('  ],');
}

function json(value: unknown): string {
    return JSON.stringify(value);
}

function indent(depth: number): string {
    return ' '.repeat(depth);
}

/** `'aria-label'` and content slots like `'[card-header]'` are only valid keys in quotes. */
function formatKey(key: string): string {
    return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function formatMeta(comp: ScannedComponent, baseIndent: number): string {
    const inner = baseIndent + 2;
    const lines = [
        `${indent(inner)}className: ${json(comp.className)},`,
        `${indent(inner)}filePath: ${json(comp.filePath)},`,
        // The entry point the class is imported from; a plugin's API page names it, e.g. in a usage snippet.
        ...(comp.importPath ? [`${indent(inner)}importPath: ${json(comp.importPath)},`] : []),
        `${indent(inner)}showcaseConfig: ${formatObject(comp.showcaseConfig as unknown as Record<string, unknown>, inner)},`,
        `${indent(inner)}inputs: ${formatArray(comp.inputs, inner)},`,
        `${indent(inner)}outputs: ${formatArray(comp.outputs, inner)},`,
        `${indent(inner)}componentMeta: ${formatObject(comp.componentMeta, inner)},`
    ];

    if (comp.api) {
        lines.push(`${indent(inner)}api: ${formatObject(comp.api as unknown as Record<string, unknown>, inner)},`);
    }

    if (comp.meta && Object.keys(comp.meta).length > 0) {
        lines.push(`${indent(inner)}meta: ${formatObject(comp.meta as Record<string, unknown>, inner)},`);
    }

    return `{\n${lines.join('\n')}\n${indent(baseIndent)}}`;
}

function formatObject(obj: Record<string, unknown>, baseIndent: number): string {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);

    if (entries.length === 0) return '{}';

    const inner = baseIndent + 2;
    const lines = entries.map(([key, value]) => {
        const formatted = Array.isArray(value)
            ? formatArray(value, inner)
            : typeof value === 'object' && value !== null
              ? formatObject(value as Record<string, unknown>, inner)
              : json(value);

        return `${indent(inner)}${formatKey(key)}: ${formatted},`;
    });

    return `{\n${lines.join('\n')}\n${indent(baseIndent)}}`;
}

function formatArray(arr: unknown[], baseIndent: number): string {
    if (arr.length === 0) return '[]';

    const inner = baseIndent + 2;
    const items = arr.map((item) => {
        const formatted = typeof item === 'object' && item !== null && !Array.isArray(item) ? formatObject(item as Record<string, unknown>, inner) : json(item);

        return `${indent(inner)}${formatted},`;
    });

    return `[\n${items.join('\n')}\n${indent(baseIndent)}]`;
}
