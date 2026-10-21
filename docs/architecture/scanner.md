# How the Scanner Works

The ng-prism scanner uses the TypeScript Compiler API to extract `@Showcase` metadata, component structure, and input/output types from library source files at build time, with no runtime reflection.

## Entry

The scanner is created via `createScanner()` in `src/builder/scanner/scanner.ts`:

```typescript
const scanner = createScanner({
    entryPoints: [{ entryFile: 'packages/my-lib/src/public-api.ts', importPath: 'my-lib' }]
});
const { components, services, diagnostics } = scanner.scan();
```

Each `scan()` call creates a `ts.Program` with every entry file as a root, resolves the exports of each entry point, and passes them to `scanComponents()` and to `scanServices()`. A `@Showcase` class goes to exactly one of the two, see [Services](#services).

## Incremental Builds: the `createScanner()` Factory

`createScanner()` is a stateful factory. Between calls it keeps the previous `ts.Program` and a source-file cache (`source-file-cache.ts`), and passes both to `ts.createProgram(files, opts, host, oldProgram)`.

TypeScript only takes a `SourceFile` over from the old program when the compiler host returns the identical object. The default host reads and parses on every call, so an old program on its own saves nothing. The cache's host returns the already parsed `SourceFile` for as long as the file's mtime and size stay the same. A watch rebuild therefore parses only the files that changed, and the binding TypeScript stores on each `SourceFile` carries over with it.

```typescript
export function createScanner(options: CreateScannerOptions): Scanner {
    const sourceFiles = createSourceFileCache(compilerOptions);
    let previousProgram: ts.Program | undefined;

    return {
        scan() {
            const { program, entries } = resolveEntryPointExports(
                options.entryPoints,
                compilerOptions,
                previousProgram,
                sourceFiles.host // ← hands unchanged SourceFiles back to TypeScript
            );
            previousProgram = program;
            sourceFiles.prune(program);
            // ...
        }
    };
}
```

Two rules keep the scan correct:

- **Module resolutions are recomputed on every scan.** The host reports them as invalidated (`hasInvalidatedResolutions`). If they were reused, a file created after an import of it had already failed to resolve would stay invisible, because the importing file itself did not change.
- **The cache only holds files of the latest program.** After each scan it drops every file the new program no longer contains.

An edit that keeps the file size and lands within the file system's mtime resolution goes unseen. APFS and ext4 record nanoseconds, so in practice this does not happen.

Every scan still walks the exports of every entry point. Next to parsing, that walk is cheap, so its result is not cached per entry point.

## Entry Point Discovery

The pipeline accepts either a directory or a file as `entryPoint`. Both lead to the same discovery of secondary entry points; a file is first resolved upward to its containing library. After the secondary entry points comes the primary one: a file `entryPoint` is the primary entry file itself, a directory names it as `lib.entryFile` in its `ng-package.json` (ng-packagr's default `src/public_api.ts` when the field is missing). When neither yields an entry file, the pipeline warns `entryPoint "<path>" resolves to no entry file`.

### Directory entryPoint

If `entryPoint` is a directory, `discoverSecondaryEntryPoints()` walks it recursively looking for `ng-package.json` files. For each `ng-package.json` that does not have a `dest` field (i.e. a secondary entry point, since `dest` is conventionally only set on the primary), the scanner reads `lib.entryFile` (default: `public-api.ts`) and derives the import path from the relative directory name.

```
packages/my-lib/
  public-api.ts                  ← primary (ng-package.json with `dest`, scanned last)
  atoms/ng-package.json          → 'my-lib/atoms'
  molecules/ng-package.json      → 'my-lib/molecules'
```

All entry points, the primary one included, share one `Scanner` and one `ts.Program`, cached on `PrismPipelineState.scanner`. The scanner is recreated when the set of entry files changes. Every rebuild scans all of them again (see [Incremental Builds](#incremental-builds-the-createscanner-factory)).

The primary entry point is scanned last and marked `primary`. A component it re-exports from a secondary entry point keeps the secondary's import path, without the "exported by multiple entry points" notice that other duplicates get.

### File entryPoint (auto-detected library root)

If `entryPoint` is a `.ts` file, the pipeline walks upward to find the nearest `ng-package.json` and treats that directory as the library root. The same discovery logic then runs, so secondary entry points are still picked up automatically:

```
entryPoint = "projects/my-lib/public-api.ts"
            ↓ walk upward, find ng-package.json
libraryRoot = "projects/my-lib"
            ↓ discoverSecondaryEntryPoints()
[my-lib/atoms, my-lib/molecules, ...]
```

If no `ng-package.json` is found above the file, the file is the only entry point, which keeps non-ng-packagr setups working. Up to 22.5.0 the primary entry point was only scanned as this fallback: with secondary entry points it was skipped, and a directory `entryPoint` without them found no component.

## How Decorators Are Extracted

`component.scanner.ts` iterates over exported symbols, calls `findDecorator()` for each class declaration, and checks for `@Showcase`, `@Component`, and `@Directive` decorators. `findShowcasedClass()` is the common start of this and the service scan: it resolves an export to its class and returns it when it carries `@Showcase`.

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

`describeUnevaluable()` in `showcase-diagnostics.ts` turns each `@Showcase` issue into a message: the component, the path (a variant or a state is named by its index and its `name`), the source text, and its `file:line:column` relative to the working directory so terminals and editors can link it.

`scanComponents()` prints each message once as a warning and collects it in a `diagnostics` array. The values it rejects after evaluation (an invalid `bg`, `status` or `canvasLayout`, an unknown `pseudo` state or a `pseudo` target that is neither `true` nor a selector, a missing `title`) go through the same channel, and so does the deprecated `providers` field, as one message for the whole field instead of one per provider. The setup diagnostics of a service (see [Services](#services)) go through the same channel. A deprecated `bg: 'checker'` stays a plain warning, because nothing is lost. `createScanner().scan()` shares one array across all entry points, so a component exported from several of them warns once, and returns it as `ScanResult.diagnostics`. The pipeline throws on a non-empty array when [`strictShowcase`](api/ng-prism-config.md#strictshowcase) is on, before plugin hooks run and before a manifest is written.

`readShowcaseStates()` in `showcase-states.ts` reads the component-level `states` list, and it keeps every slot: a state is identified by its position (the URL parameter, the render marker and the discovery manifest all use the index), so an entry it cannot use becomes `{ name, pseudo: {} }`, an empty column in the Overview, instead of being removed and shifting the entries behind it. It reports a `states` value that is no list, an entry that is no object, a missing or empty `name` (the state is then called `State <position>`), a name that repeats an earlier state (only the first one is used), a state without `pseudo`, and whatever `readPseudoStates()` rejects inside a state's `pseudo`, worded with the state's name. An entry `evaluateStatic` could not read at all (`states: [a, buildState(), c]`) is gone from the evaluated list, so `component.scanner.ts` notes the position from the issue's path and `readShowcaseStates()` puts an empty `State <position>` slot back there; the unevaluable message already explains it, so it adds none. An empty list reads as no states and reports nothing. `states` next to `renderPage` is reported and skipped, because a component page has no Overview, and a variant's `states` that is anything but `false` is reported and removed.

## Services

A service is a class with `@Showcase` and `@Injectable` or `@Service`. `component.scanner.ts` and `service.scanner.ts` split the `@Showcase` classes between them, so a service is in `ScanResult.services` and never in `components`: the component list, `onComponentScanned` and the discovery manifest keep their contents. The code is in `builder/scanner/service/`.

### Telling a service from a component

`classifyShowcaseClass()` in `service/angular-decorators.ts` returns one of three kinds:

| Kind               | When                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `component`        | The class has `@Component` or `@Directive` (found by name, as everywhere), or neither `@Injectable` nor `@Service`                                                                   |
| `legacy-component` | `@Injectable` or `@Service` and a `@Showcase` argument that declares a field only a component can use: `variants`, `states`, `providers`, `bg`, `canvasLayout`, `host`, `renderPage` |
| `service`          | `@Injectable` or `@Service`, and none of those fields                                                                                                                                |

`findAngularCoreDecorator()` finds `Injectable` and `Service` by name and then checks through the checker that the identifier is imported from `@angular/core` under that same name, so a decorator imported under another one (`import { Injectable as Service }`) is not recognised. TypeDI and other libraries have a `@Service()` of their own, and it makes no service. The scanner never imports `Service` from `@angular/core`: Angular 20 has none, and the decorator is recognised in the source alone, so the peer dependency stays `>=20.0.0`.

The `@Showcase` argument is read from the literal and from the evaluated value, since a constant or a spread can bring in a component-only field and a field the evaluator cannot read is still in the literal. A `legacy-component` is scanned as a component, as before services existed, and `scanComponents()` prints a notice through `notify`, not `report`, so it is not a [diagnostic](#diagnostics) and `strictShowcase` does not fail over it. The exception ends in 23.0.0.

### Provision

`readProvision()` evaluates the options of the decorator and answers `auto` or `manual`. `@Service()` is `auto` unless it has `autoProvided: false`; `@Injectable` is `auto` for `providedIn` of `'root'`, `'platform'` or `'any'`. A module class, no `providedIn` and a value the evaluator cannot read are `manual`, without a warning. The `factory` of `@Service({ factory })` is a function the evaluator drops, which leaves the provision alone.

### `setup`

`setup.reader.ts` reads `setup: () => [a, b]` from the `@Showcase` object literal. The evaluator cannot fold functions, so `extractShowcaseConfig()` swallows the issue it raises for `setup`, and the reader takes over:

- The value has to be an arrow function whose body is an array literal, as an expression or as the only `return` of a block. Anything else, `as const` included, reports `describeInvalidSetup` and drops the whole field.
- Each element is resolved to its declaration through the checker, with an import followed to its source. A name or a property access qualifies; a call or a spread does not. The declaration has to be a function declaration or a `const` arrow or function expression (kind `function`), or a `const` whose type is `InjectionToken` (kind `token`). Otherwise `describeSetupEntryNotSupported` drops the entry.
- The symbol is looked up in the export index. An entry no scanned entry point exports has no import path for the usage snippet and is dropped with `describeSetupEntryNotExported`.
- Only the literal is searched. A `setup` that arrives through a spread or a constant is not found and dropped without a word.

On a component, `scanComponents()` reports `describeSetupOnComponent` and ignores the field.

### The export index

`buildExportIndex()` in `service/export-index.ts` maps every symbol the entry points export, resolved through aliases, to the import path of the first entry point that exports it. It is built from all entry points once per scan, because a setup function or a type is often exported by another entry point than the service. The same index decides which types get a card.

### Members, tags and types

`extractServiceApi()` builds the `ServiceApi` of one service from three modules:

- **`member.extractor.ts`** walks the class and its base classes, nearest first, and collects public instance properties, accessors and methods with their signatures. A member the subclass declares hides the inherited one, including an `@internal` override. Left out: `private`, `protected`, `#private`, `_`-prefixed names, lifecycle hooks, the constructor, statics and `@internal`. Methods are listed with or without JSDoc, which differs from the component scan. A getter and its setter, or the overloads of a method, are one entry; the doc block sits on one of them, and the signature shown is the documented one's, else the first. A type is the annotation as written, else `checker.typeToString`.
- **`doc-tags.ts`** reads description and tags. The doc block is the last one above the node and has to sit directly on it, line comments in between allowed; a floating banner and a ruler (`/** ===== */`) are not read. `@default`, `@since`, `@deprecated`, `@see`, `@example`, `@param` and `@internal` are understood. An override without a doc block of its own takes the doc block of the nearest base class member that has one.
- **`type-collector.ts`** documents the types the signatures reach. A reference is documented when it resolves to an interface, class, type alias or enum that the export index knows and that is not `@internal`; otherwise it stays text. Each type gets one entry, recursively through the types of its members and type arguments, and a type that refers to itself ends there. Its id is its name, or `name@importPath` when two reachable types share a name, and `reachedFrom` records where it was first met. A type imported under another name is documented under its declared name, and the local name in the text stays unlinked.

`service-api.extractor.ts` adds the setup entries: the signature and docs of a function, the type of a token, and a config table made of the properties of the first parameter's object type, or of a token's type argument, looked at through `Partial`, `Required` and `Readonly`. A class, an array or a primitive gets no table.

The shape of all of this, `ServiceApi` and the `Api*` types, is experimental until 23.0.0, see [`ServiceApi`](api/types.md#serviceapi).

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

### Aliases

An input or output declared with an alias keeps its member name as `name` and gets the alias as `alias`. The extractor reads it from the options of `input()`, `input.required()`, `model()`, `model.required()` and `output()` (`{ alias: 'x' }`), and from `@Input('x')`, `@Input({ alias: 'x' })` and `@Output('x')`. The value is evaluated statically, so a string literal or a constant counts; an alias the builder can't evaluate, or one equal to the member name, is left out. Variants and controls keep using `name`; the renderer binds `alias ?? name` with `setInput`, and the directive wrapper binds the alias on the host element.

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

`scanServices()` returns an array of `ScannedService` objects, in `ScanResult.services`:

- `className`, `filePath`, `importPath`
- `showcaseConfig`: the evaluated `@Showcase` argument, reduced to the fields that apply to services
- `provision`: `'auto'` or `'manual'`
- `api`: the extracted `ServiceApi`
