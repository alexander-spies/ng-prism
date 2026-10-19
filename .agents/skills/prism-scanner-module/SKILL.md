---
name: prism-scanner-module
description: Creates or extends scanner modules in packages/ng-prism/src/builder/scanner/. Triggers on "add scanner", "new extractor", "extend scanner", "add extraction", "scanner module".
---

# Scanner Module — Development Guide

Add or extend TypeScript Compiler API scanner modules under `packages/ng-prism/src/builder/scanner/`.

## Architecture

The scanner pipeline:

```
entry-point.scanner  →  component.scanner  →  manifest.generator
        ↓                      ↓
  resolves exports      uses input.extractor
  from the entry file   uses ast-utils
  (builder option
   `entryPoint`, e.g.
   public-api.ts)
```

**Orchestrator:** `scanner.ts` connects everything. It exports `createScanner(options: CreateScannerOptions): Scanner` — a factory that returns the scanner, not a bare `scan()` function.

## Existing Modules

| Module                     | Purpose                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ast-utils.ts`             | Static AST evaluation utilities                                                                                             |
| `class-hierarchy.ts`       | Walk a class's `extends` chain so inherited inputs are found (`getClassHierarchy`)                                          |
| `entry-point.scanner.ts`   | Resolve exports from entry point                                                                                            |
| `component.scanner.ts`     | Find @Showcase components, extract config                                                                                   |
| `input.extractor.ts`       | Extract `input()`/`output()`/`model()` metadata (and legacy `@Input()`/`@Output()`)                                         |
| `manifest.generator.ts`    | Generate prism-manifest.ts source code                                                                                      |
| `pseudo-states.ts`         | Read and validate a variant's forced pseudo states (`readPseudoStates`)                                                     |
| `showcase-diagnostics.ts`  | Word the warnings for `@Showcase` values the scan had to drop                                                               |
| `entry-point-discovery.ts` | Find a library's secondary entry points and its primary entry file (`discoverSecondaryEntryPoints`, `findPrimaryEntryFile`) |
| `scanner.ts`               | Orchestrator — exports `createScanner(options)`, which returns a `Scanner`                                                  |
| `index.ts`                 | Public surface of the scanner (re-exports the functions and their types)                                                    |

## Module Template

```typescript
// packages/ng-prism/src/builder/scanner/my-feature.ts
import ts from 'typescript';

export function myFeature(classDecl: ts.ClassDeclaration, checker: ts.TypeChecker): MyResult[] {
    const results: MyResult[] = [];

    for (const member of classDecl.members) {
        if (!ts.isPropertyDeclaration(member)) continue;
        // ... extraction logic
    }

    return results;
}
```

## Test Template

```typescript
// packages/ng-prism/src/builder/scanner/my-feature.spec.ts
import path from 'node:path';
import ts from 'typescript';
import { resolveEntryPointExports } from './entry-point.scanner.js';
import { myFeature } from './my-feature.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('myFeature', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);
        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    it('should ...', () => {
        // resolve alias → get class declaration → call myFeature
    });
});
```

## Key Patterns

### Resolve alias symbols

```typescript
let sym = exports.find((s) => s.name === className)!;
if (sym.flags & ts.SymbolFlags.Alias) {
    sym = checker.getAliasedSymbol(sym);
}
const classDecl = sym.declarations!.find(ts.isClassDeclaration)!;
```

### Use ast-utils

```typescript
import { findDecorator, getDecoratorArgument, evaluateExpression, getJsDocComment } from './ast-utils.js';

const decorator = findDecorator(classDecl, 'Input');
const arg = getDecoratorArgument(decorator);
const value = evaluateExpression(arg);
const doc = getJsDocComment(member, checker);
```

### Type mapping

```typescript
const tsType = checker.getTypeAtLocation(member);

if (tsType.flags & ts.TypeFlags.StringLike) {
    /* string */
}
if (tsType.flags & ts.TypeFlags.NumberLike) {
    /* number */
}
if (tsType.flags & ts.TypeFlags.BooleanLike) {
    /* boolean */
}
if (tsType.isUnion()) {
    /* union — check for string literals */
}
if (checker.isArrayType(tsType)) {
    /* array */
}
```

## Conventions

- Use `.js` extensions in imports
- Test fixtures in `__fixtures__/`
- Export new modules from `index.ts`
- Add types to `plugin.types.ts` if they're part of the public API
- Tests use shared compiler options and shared fixture files
- Run tests: `npx nx test ng-prism -- --testPathPatterns=<module>`

## Checklist

- [ ] Module file created with clear, single-purpose function
- [ ] Spec file with comprehensive tests
- [ ] Fixtures added/updated if needed
- [ ] Exported from `index.ts`
- [ ] Types added to `plugin.types.ts` if public
- [ ] Tests pass: `npx nx test ng-prism`
- [ ] Build passes: `npx nx build ng-prism`
- [ ] Lint passes: `npx nx run-many -t lint` (runs with `--max-warnings 0`, so a warning fails it)
