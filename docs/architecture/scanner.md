# How the Scanner Works

The ng-prism scanner uses the TypeScript Compiler API to extract `@Showcase` metadata, component structure, and input/output types from library source files at build time, with no runtime reflection.

## Entry

The scanner is created via `createScanner()` in `src/builder/scanner/scanner.ts`:

```typescript
const scanner = createScanner({
    entryPoint: 'packages/my-lib/src/index.ts'
});
const manifest = scanner.scan();
```

Each `scan()` call creates or reuses a `ts.Program`, resolves all exports from the entry point, and passes them to `scanComponents()`.

## Incremental Builds: the `createScanner()` Factory

`createScanner()` is a stateful factory. It retains the previous `ts.Program` reference between calls. When TypeScript creates a new program via `ts.createProgram(files, opts, oldProgram)`, it reuses `SourceFile` objects for files that have not changed. On file saves during watch mode, only the changed files are re-parsed.

```typescript
export function createScanner(options: CreateScannerOptions): Scanner {
    let previousProgram: ts.Program | undefined;

    return {
        scan() {
            const { program, exports } = resolveEntryPointExports(
                options.entryPoint,
                compilerOptions,
                previousProgram // ← reused on next scan
            );
            previousProgram = program;
            // ...
        }
    };
}
```

## Entry Point Discovery

The pipeline accepts either a directory or a file as `entryPoint`. Both lead to the same discovery of secondary entry points; a file is first resolved upward to its containing library. They differ only for a library without secondary entry points: a file is then scanned directly, a directory yields no entry point at all.

### Directory entryPoint

If `entryPoint` is a directory, `discoverSecondaryEntryPoints()` walks it recursively looking for `ng-package.json` files. For each `ng-package.json` that does not have a `dest` field (i.e. a secondary entry point, since `dest` is conventionally only set on the primary), the scanner reads `lib.entryFile` (default: `public-api.ts`) and derives the import path from the relative directory name.

```
packages/my-lib/
  public-api.ts                  ← primary (ng-package.json with `dest`, ignored by discovery)
  atoms/ng-package.json          → 'my-lib/atoms'
  molecules/ng-package.json      → 'my-lib/molecules'
```

Each secondary entry point gets its own `Scanner` instance stored in `PrismPipelineState.scanners`. Only the entry points whose files changed are re-scanned.

### File entryPoint (auto-detected library root)

If `entryPoint` is a `.ts` file, the pipeline walks upward to find the nearest `ng-package.json` and treats that directory as the library root. The same discovery logic then runs, so secondary entry points are still picked up automatically:

```
entryPoint = "projects/my-lib/public-api.ts"
            ↓ walk upward, find ng-package.json
libraryRoot = "projects/my-lib"
            ↓ discoverSecondaryEntryPoints()
[my-lib/atoms, my-lib/molecules, ...]
```

If no `ng-package.json` is found above the file, or if discovery returns no entries (e.g. for a primary-only library without secondaries), the pipeline falls back to scanning the configured file directly, which preserves back-compat for non-ng-packagr setups. A directory `entryPoint` has no such fallback: for a primary-only library the manifest stays empty, without a warning. `ng add` writes the library directory, so such a library needs its `entryPoint` changed to the barrel file.

## How Decorators Are Extracted

`component.scanner.ts` iterates over exported symbols, calls `findDecorator()` for each class declaration, and checks for `@Showcase`, `@Component`, and `@Directive` decorators.

**`findDecorator(node, name)`** in `ast-utils.ts` walks the node's decorator list and matches by identifier name. It supports both call-expression decorators (`@Component({...})`) and plain identifier decorators.

**`evaluateStatic(node, { report, checker })`** in `ast-utils.ts` folds an AST node into a JavaScript value without running anything. It handles string, numeric and boolean literals, `null`, `undefined`, and array and object literals, including computed keys that fold to a string or number. On top of that it folds:

- arithmetic (`+ - * / % **`) on numbers, and `+` as concatenation once either side is a string and the other a primitive
- template literals whose placeholders fold to primitives
- unary `-` and `+` on numbers, and `!` on anything it can fold
- type-only wrappers, which it sees through: `as`, `as const`, `satisfies`, `<T>x` and the non-null `!`

With the program's `TypeChecker` it also resolves references, which the scanner already holds from `scanComponents(exports, checker)`:

- An identifier or shorthand property whose symbol, after following imports with `getAliasedSymbol`, is a `const` with an initializer folds to that initializer. `let`, `var` and a `const` without an initializer (`declare const`, a compiled package's `.d.ts`) do not.
- An enum member folds to `checker.getConstantValue()` of its declaration. Asking the declaration matters: for an access like `Size.Medium` the checker only answers for `const enum`s.
- A property or element access folds by reading from the folded object, unless the access names a declaration of its own, as `tokens.MAX_FILES` on a namespace import does. If folding the object dropped anything the read depends on, the access fails instead of reading a wrong value: the property itself, something a spread might have supplied, or, in an array, an earlier element whose removal moved the later ones and `length`.
- A spread of a folded object or array merges into the literal around it, later keys winning. A later property that fails removes the key the spread set, since the source overrides it.
- Keys are defined as own properties, and `__proto__: x`, which sets a prototype in JavaScript, is dropped. A hole in a sparse array keeps its slot as `undefined`.

A set of the declarations being folded stops a constant that refers back to itself. Members inside a constant are folded like any others, so a constant costs only its unreadable members, and their issues point into the constant's own file. Each constant is folded once per `evaluateStatic` call; its issues are replayed at every reference's path, and every reference gets its own `structuredClone` of the value, so no two parts of a config share an object.

A `const` is read as its initializer says. Runtime mutation (`OPTIONS.push(...)`) is invisible to static evaluation.

A calculation whose result JSON cannot carry (`1 / 0`, `0 / 0`) counts as unfoldable, since `Infinity` and `NaN` would reach the manifest as `null`. Conditions, comparisons and logical operators are left out on purpose: the evaluator folds values, it does not interpret code.

Whatever it cannot fold costs only the member that holds it: an object keeps its other properties, an array its other elements, and a spread, a shorthand property or an unreadable computed key drops just itself. Each drop goes to `report` as an `UnevaluableIssue`:

- `path`: where the value sat, e.g. `['variants', 3, 'inputs', 'maxFileSize']`, with array indices as written in the source
- `node`: the expression, spread or property that could not be folded
- `reason`: `runtime-value` for functions, classes and instances, which no static evaluation can capture; `unsupported` for everything else
- `cause`: the innermost reference that failed, if one did, with its kind (`let`, `var`, `no-value`, `cycle`, `runtime-value`). Operands and placeholders fold silently, so this is how `5 * MB` can still say that `MB` is a `let`.

Only a root that cannot be folded at all comes back as the `UNEVALUABLE` sentinel, a symbol that keeps it distinct from an `undefined` written on purpose.

All three callers pass the checker. They treat a drop differently:

| Caller                               | Entry point                               | On a dropped value                                                                                                                                        |
| ------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@Showcase` config                   | `evaluateStatic` with a reporter          | Warns (see [Diagnostics](#diagnostics))                                                                                                                   |
| `@Component` / `@Directive` metadata | `evaluateExpression`                      | Nothing. Only the `selector` and `standalone` properties are evaluated, so `imports: [FooComponent]` is never resolved                                    |
| Input defaults                       | `evaluateDefault` in `input.extractor.ts` | Nothing, but the whole default goes: the renderer applies `defaultValue` to the component, so the readable part of a default would overwrite the real one |

### Diagnostics

`describeUnevaluable()` in `showcase-diagnostics.ts` turns each `@Showcase` issue into a message: the component, the path (a variant is named by its index and its `name`), the source text, and its `file:line:column` relative to the working directory so terminals and editors can link it.

`scanComponents()` prints each message once as a warning and collects it in a `diagnostics` array. The values it rejects after evaluation (an invalid `bg`, `status` or `canvasLayout`, an unknown `pseudo` state or a `pseudo` target that is neither `true` nor a selector, a missing `title`) go through the same channel, and so does the deprecated `providers` field, as one message for the whole field instead of one per provider. A deprecated `bg: 'checker'` stays a plain warning, because nothing is lost. `createScanner().scan()` shares one array across all entry points, so a component exported from several of them warns once, and returns it as `ScanResult.diagnostics`. The pipeline throws on a non-empty array when [`strictShowcase`](api/ng-prism-config.md#strictshowcase) is on, before plugin hooks run and before a manifest is written.

## Input and Output Extraction

`extractInputs()` and `extractOutputs()` in `input.extractor.ts` walk the members of the class and of every base class it extends.

### Base classes

`getClassHierarchy()` in `class-hierarchy.ts` follows the `extends` clause through the checker, so a base class in the same file, in another file or in another library behind a path mapping is found the same way, through default exports, renamed re-exports, namespace imports and parentheses as well. It returns the class itself first and then each base class with source, nearest first, and marks which of them Angular takes inputs and outputs from: the class itself and every base class with `@Directive()` or `@Component()`. Angular passes over an undecorated base class, and the extractors skip its inputs and outputs too.

The extractors keep the first input or output they see under a name, which lets a subclass that redeclares an input win over its base class. Static members are skipped, since an input is always an instance field. A field a more derived class initializes without declaring it an input (`override title = 'child'`, or an `input()` in an undecorated class in between) leaves the inherited input in place, as Angular does, but the component starts out with the value of the most derived initializer. That value becomes `defaultValue`, read the same way as a default (`input()` and `model()` contribute the value passed to them); if it cannot be read, the input has no default rather than the base class's.

A generic base class declares some inputs in terms of its type parameters. For an input whose type argument, declared type or default mentions one of them, the type comes from the property as the showcased class sees it: the signal's call signature returns the instantiated value type, `Country[]` where the source says `T[]`, and an `@Input()` property has that type directly. Without a type argument the type of the default counts as well, so `model(this.initial)` with `initial: T` resolves too. `rawType` is then the printed type. Every other input is resolved as before: from the source text of its type argument, alias names included, or from the type of its default.

The hierarchy is computed once per component and passed to both extractors. `scanComponents()` also records the base classes with source on `ScannedComponent.baseClasses` (class name and file, nearest first) for plugins that need to read what a component inherits, such as plugin-jsdoc for the tags of inherited members. The field only exists at build time; the manifest does not carry it.

Two kinds of base class are not read:

- **Declarations.** A base class from an npm package only exists as a `.d.ts`, where `options = input.required<…>()` has turned into `readonly options: InputSignal<…>`. No call is left to read `required` or a default from. The same goes for a `declare class` in a `.ts` file and for a class inside `declare module` or `declare namespace`. If such a class declares inputs, `scanComponents()` warns with their names and the location. The names come from the input map the Angular compiler writes into `ɵdir` or `ɵcmp`, which covers `@Input()` inputs and gives the public name of an aliased one. The compiler writes that field for every decorated class, so a `.d.ts` class without it is undecorated, Angular inherits nothing from it, and there is no warning. A `declare class` written by hand has no such map either, so there the properties whose type resolves to `InputSignal`, `InputSignalWithTransform` or `ModelSignal` stand in for it, import types and aliases included. The walk continues past the class, and each such class up the chain gets its own warning.
- **Mixins.** In `extends withTracking(Base)` the base is a call, and what it returns has no class declaration to read members from. The walk ends there.

These warnings, and the one about `@Input()` decorators, which names the base class a decorator comes from, are not [diagnostics](#diagnostics), so `strictShowcase` does not fail the build over a class the component's author cannot change. A `notices` set shared across entry points prints each of them once.

In watch mode, `startWatcher()` only watches the directory of the entry point (and the config file). A base class in another library behind a path mapping is read on every scan, but editing it does not trigger one; the next change inside the watched directory, or a restart, picks it up.

### Signal inputs: `input()` and `model()`

Detected by checking whether the property initializer is a call expression whose callee is `input`, `input.required`, `model`, or `model.required`.

- **Required check:** `isSignalInputRequired()` looks for the `.required` property access.
- **Type resolution:** If the call has a type argument (`input<string>()`), `checker.getTypeFromTypeNode()` resolves it. If there is a default value argument (`input('hello')`), `checker.getTypeAtLocation()` infers the type from the argument.

### Decorator inputs: `@Input()`

Detected by `findDecorator(member, 'Input')`. The `required` field is read from `@Input({ required: true })`.

### Type mapping

`mapType()` converts a `ts.Type` to the `InputMeta.type` enum:

| TypeScript type                     | Normalized `type` | Notes                                |
| ----------------------------------- | ----------------- | ------------------------------------ |
| `string` / string literal           | `'string'`        |                                      |
| `number`                            | `'number'`        |                                      |
| `boolean`                           | `'boolean'`       | Includes `true \| false` union       |
| `'a' \| 'b'` (string literals only) | `'union'`         | `values` array populated             |
| Array types                         | `'array'`         | Detected via `checker.isArrayType()` |
| Object / interface                  | `'object'`        | `ts.TypeFlags.Object`                |
| Everything else                     | `'unknown'`       |                                      |

`rawType` is the original TypeScript type string produced by `checker.typeToString()`, used by plugins and displayed in the JSDoc panel.

### Directive detection

A class is considered a directive (`isDirective: true`) if it has `@Directive` but not `@Component`.

## Output

`scanComponents()` returns an array of `ScannedComponent` objects. Each includes:

- `className`, `filePath`
- `showcaseConfig`: the evaluated `@Showcase` argument
- `inputs`, `outputs`: extracted metadata arrays
- `componentMeta`: `{ selector, standalone, isDirective }`
- `importPath`: set by the pipeline for secondary entry points
