import type { ApiSetupEntry, ScannedService } from '@ng-prism/core/plugin';

/** A name an import line brings in, and the module it comes from. */
export interface UsageImport {
    name: string;
    from: string;
}

/**
 * The snippet that shows how to bring a service into an application: the
 * imports, the `providers` entries its setup asks for, and the `inject()` call.
 *
 * It is generated from the scanned API, not taken from the author, so it says
 * nothing about values: a setup function's arguments and a token's value are
 * left as `…` for the reader to fill in.
 */
export function generateServiceUsage(service: ScannedService): string {
    const { className, provision, api } = service;
    const variable = className.charAt(0).toLowerCase() + className.slice(1);
    const blocks = [importLines(service, setupImports(api.setup)), setupBlock(api.setup)];

    // A setup function of a service provided by hand normally provides it; a token never does.
    if (provision === 'manual' && !api.setup.some((entry) => entry.kind === 'function')) {
        blocks.push([
            '// the component that uses it',
            `@Component({ …, providers: [${className}] })`,
            'export class MyComponent {',
            `    private readonly ${variable} = inject(${className});`,
            '}'
        ]);
    } else {
        blocks.push(['// in a component or service', `private readonly ${variable} = inject(${className});`]);
    }

    return joinUsageBlocks(blocks);
}

/**
 * One line per entry point, the class's first, each naming the class before
 * the `extra` names it shares a module with. Shared with the pipe and the
 * component snippet.
 */
export function importLines({ className, importPath }: { className: string; importPath?: string }, extra: UsageImport[] = []): string[] {
    const groups = new Map<string, string[]>();
    const add = (path: string, name: string) => groups.set(path, [...(groups.get(path) ?? []), name]);

    // A class the scanner could not place has no import path; there is nothing true to write for it.
    if (importPath) add(importPath, className);
    for (const { name, from } of extra) add(from, name);

    return [...groups].map(([path, names]) => `import { ${names.join(', ')} } from '${path}';`);
}

/** What the setup entries of a service or pipe import. Shared with the pipe snippet. */
export function setupImports(setup: ApiSetupEntry[]): UsageImport[] {
    return setup.map(({ name, importPath }) => ({ name, from: importPath }));
}

/** The `app.config.ts` block with one `providers` entry per setup entry, or nothing without setup. Shared with the pipe snippet. */
export function setupBlock(setup: ApiSetupEntry[]): string[] {
    if (!setup.length) return [];
    return ['// app.config.ts', `providers: [${setup.map(providerEntry).join(', ')}]`];
}

/** The blocks of a snippet, each a list of lines, with a blank line between them; an empty block is left out. */
export function joinUsageBlocks(blocks: string[][]): string {
    return blocks
        .filter((lines) => lines.length)
        .map((lines) => lines.join('\n'))
        .join('\n\n');
}

function providerEntry(entry: ApiSetupEntry): string {
    if (entry.kind === 'token') return `{ provide: ${entry.name}, useValue: … }`;

    // A rest parameter can be left out as well as an optional one.
    const callableBare = (entry.params ?? []).every((param) => param.optional || param.rest);

    return `${entry.name}(${callableBare ? '' : '…'})`;
}
