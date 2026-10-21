import type { ApiSetupEntry, ScannedService } from '@ng-prism/core/plugin';

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
    const blocks = [importLines(service)];

    if (api.setup.length) {
        blocks.push(['// app.config.ts', `providers: [${api.setup.map(providerEntry).join(', ')}]`]);
    }

    if (provision === 'manual' && !api.setup.length) {
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

    return blocks
        .filter((lines) => lines.length)
        .map((lines) => lines.join('\n'))
        .join('\n\n');
}

/** One line per entry point, the service's first, each naming the service before its setup entries. */
function importLines({ className, importPath, api }: ScannedService): string[] {
    const groups = new Map<string, string[]>();
    const add = (path: string, name: string) => groups.set(path, [...(groups.get(path) ?? []), name]);

    // A service the scanner could not place has no import path; there is nothing true to write for it.
    if (importPath) add(importPath, className);
    for (const entry of api.setup) add(entry.importPath, entry.name);

    return [...groups].map(([path, names]) => `import { ${names.join(', ')} } from '${path}';`);
}

function providerEntry(entry: ApiSetupEntry): string {
    if (entry.kind === 'token') return `{ provide: ${entry.name}, useValue: … }`;

    // A rest parameter can be left out as well as an optional one.
    const callableBare = (entry.params ?? []).every((param) => param.optional || param.rest);

    return `${entry.name}(${callableBare ? '' : '…'})`;
}
