import ts from 'typescript';

/**
 * Whether the generated module can import `name` by name, `import { name } from '…'`: an identifier and no reserved
 * word, which also rules out `default`.
 */
export function isImportableName(name: string): boolean {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, name);
    const token = scanner.scan();

    if (scanner.getTokenEnd() !== name.length) return false;
    if (token === ts.SyntaxKind.Identifier) return true;

    const isReserved =
        (token >= ts.SyntaxKind.FirstReservedWord && token <= ts.SyntaxKind.LastReservedWord) ||
        (token >= ts.SyntaxKind.FirstFutureReservedWord && token <= ts.SyntaxKind.LastFutureReservedWord) ||
        token === ts.SyntaxKind.AwaitKeyword;

    // A contextual keyword such as `type` or `from` is a name like any other.
    return token >= ts.SyntaxKind.FirstKeyword && token <= ts.SyntaxKind.LastKeyword && !isReserved;
}

/** The key of `{ name, from }` in the map of {@link ManifestImports.names}. */
export function importKey(from: string, name: string): string {
    return `${from}#${name}`;
}

/** The identifier `name` from `from` has in the generated module: `localNames` holds the ones that differ from `name`. */
export function localName(localNames: ReadonlyMap<string, string>, from: string, name: string): string {
    return localNames.get(importKey(from, name)) ?? name;
}

/**
 * What the generated manifest imports, and the identifier each class has in it. Two classes of the same name from
 * different modules, such as an explicit import next to a library class of another entry point, would be one
 * identifier twice: the later one is imported under an alias, `Name__2`.
 */
export class ManifestImports {
    private readonly modules = new Map<string, Map<string, string>>();
    private readonly taken: Set<string>;

    /** `reserved`: identifiers the module declares or imports itself, which no class may take. */
    constructor(reserved: Iterable<string>) {
        this.taken = new Set(reserved);
    }

    /** A class the manifest refers to by its own name, which is never renamed: one of the showcased components. */
    keep(from: string, name: string): void {
        this.module(from).set(name, name);
        this.taken.add(name);
    }

    /** Import `name` from `from` and return the identifier it has: the name itself, or an alias when another class took it. */
    local(from: string, name: string): string {
        const module = this.module(from);
        let local = module.get(name);

        if (local === undefined) {
            local = this.free(name);
            module.set(name, local);
            this.taken.add(local);
        }
        return local;
    }

    /** The identifier of each imported class that is not its own name, by {@link importKey}. */
    names(): ReadonlyMap<string, string> {
        const names = new Map<string, string>();

        for (const [from, module] of this.modules) {
            for (const [name, local] of module) {
                if (local !== name) names.set(importKey(from, name), local);
            }
        }
        return names;
    }

    /**
     * One `import` statement per module, in the order the modules were first used. The module is written as a JSON
     * string, which is a valid one whatever it holds; the names are the scan's, which only lets identifiers through.
     */
    lines(): string[] {
        return [...this.modules].map(([from, module]) => {
            const specifiers = [...module].map(([name, local]) => (local === name ? name : `${name} as ${local}`));

            return `import { ${specifiers.join(', ')} } from ${JSON.stringify(from)};`;
        });
    }

    private module(from: string): Map<string, string> {
        let module = this.modules.get(from);

        if (!module) {
            module = new Map();
            this.modules.set(from, module);
        }
        return module;
    }

    private free(name: string): string {
        let local = name;

        for (let n = 2; this.taken.has(local); n++) {
            local = `${name}__${n}`;
        }
        return local;
    }
}
