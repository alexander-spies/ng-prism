import path from 'node:path';
import ts from 'typescript';
import { scanComponents } from './component.scanner.js';
import { resolveEntryPointExports } from './entry-point.scanner.js';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true
};

describe('scanComponents', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'public-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    it('should find only @Showcase-annotated components', () => {
        const components = scanComponents(exports, checker);
        const names = components.map((c) => c.className);

        expect(names).toContain('ButtonComponent');
        expect(names).toContain('CardComponent');
        expect(names).toContain('SignalButtonComponent');
        expect(names).toContain('ModelInputComponent');
        expect(names).toContain('HighlightDirective');
        expect(names).toContain('InvalidBgComponent');
        expect(names).toContain('InvalidStatusComponent');
        expect(names).toContain('SectionedComponent');
        expect(names).not.toContain('NoShowcaseComponent');
        expect(components).toHaveLength(9);
    });

    it('should extract showcase config for ButtonComponent', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.title).toBe('Button');
        expect(button.showcaseConfig.category).toBe('Inputs');
        expect(button.showcaseConfig.description).toBe('A versatile button component');
        expect(button.showcaseConfig.tags).toEqual(['form', 'action']);
    });

    it('should extract variants', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.variants).toHaveLength(2);
        expect(button.showcaseConfig.variants![0].name).toBe('Primary');
        expect(button.showcaseConfig.variants![0].inputs).toEqual({
            variant: 'primary',
            label: 'Click me'
        });
        expect(button.showcaseConfig.variants![1].name).toBe('Danger');
        expect(button.showcaseConfig.variants![1].inputs).toEqual({
            variant: 'danger',
            disabled: true
        });
    });

    it('should extract variant-level meta', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.variants![0].meta).toEqual({
            figma: 'https://www.figma.com/design/abc123/DS?node-id=12-34'
        });
        expect(button.showcaseConfig.variants![1].meta).toBeUndefined();
    });

    it('should extract component metadata (selector, standalone)', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.componentMeta.selector).toBe('my-button');
        expect(button.componentMeta.standalone).toBe(true);
    });

    it('should extract inputs and outputs', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.inputs.length).toBe(5);
        expect(button.outputs.length).toBe(2);
        expect(button.inputs[0].name).toBe('variant');
        expect(button.outputs[0].name).toBe('clicked');
    });

    it('should set filePath', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.filePath).toContain('button.component.ts');
    });

    it('should handle CardComponent with minimal config', () => {
        const components = scanComponents(exports, checker);
        const card = components.find((c) => c.className === 'CardComponent')!;

        expect(card.showcaseConfig.title).toBe('Card');
        expect(card.showcaseConfig.category).toBe('Layout');
        expect(card.showcaseConfig.variants).toBeUndefined();
        expect(card.showcaseConfig.tags).toBeUndefined();
        expect(card.inputs).toHaveLength(2);
        expect(card.outputs).toHaveLength(0);
    });

    it('should set isDirective true for directives', () => {
        const components = scanComponents(exports, checker);
        const highlight = components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight.componentMeta.isDirective).toBe(true);
        expect(highlight.componentMeta.selector).toBe('[appHighlight]');
        expect(highlight.componentMeta.standalone).toBe(true);
    });

    it('should set isDirective false for components', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.componentMeta.isDirective).toBe(false);
    });

    it('should extract inputs and outputs from directives', () => {
        const components = scanComponents(exports, checker);
        const highlight = components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight.inputs).toHaveLength(1);
        expect(highlight.inputs[0].name).toBe('highlightColor');
        expect(highlight.inputs[0].type).toBe('string');
        expect(highlight.inputs[0].defaultValue).toBe('yellow');

        expect(highlight.outputs).toHaveLength(1);
        expect(highlight.outputs[0].name).toBe('highlighted');
    });

    it('should extract host config from directive showcase', () => {
        const components = scanComponents(exports, checker);
        const highlight = components.find((c) => c.className === 'HighlightDirective')!;

        expect(highlight.showcaseConfig.host).toBe('<span class="demo-text">');
    });

    it('should warn when @Showcase class uses @Input() decorators', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        scanComponents(exports, checker);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ButtonComponent uses @Input() decorators'));

        warnSpy.mockRestore();
    });

    it('should warn and skip @Showcase classes without a title', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);

        expect(components.find((c) => c.className === 'MissingTitleComponent')).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MissingTitleComponent has @Showcase without a "title" field'));

        warnSpy.mockRestore();
    });

    it('should warn that a checker background is deprecated', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        scanComponents(exports, checker);

        // Once for the component and once for the variant that declares its own:
        // a reviewer fixing this has to find both, and only the variant warning
        // says which variant.
        const messages = warnSpy.mock.calls.map((call) => String(call[0])).filter((message) => message.includes('DeprecatedBgComponent'));

        expect(messages.filter((m) => m.includes('deprecated'))).toHaveLength(2);
        expect(messages.some((m) => m.includes('Also checker'))).toBe(true);

        warnSpy.mockRestore();
    });

    it('should keep a checker background despite deprecating it', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);
        const deprecated = components.find((c) => c.className === 'DeprecatedBgComponent')!;

        // Deprecated is not invalid. Dropping the value would change what the
        // component renders on, which is a break dressed up as a warning.
        expect(deprecated.showcaseConfig.bg).toBe('checker');
        expect(deprecated.showcaseConfig.variants?.[0].bg).toBe('checker');

        warnSpy.mockRestore();
    });

    it('should not warn for signal-based components', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        scanComponents(exports, checker);

        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('SignalButtonComponent'));
        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('HighlightDirective'));

        warnSpy.mockRestore();
    });

    it('should extract component-level bg', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.bg).toBe('dark');
    });

    it('should extract variant-level bg', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.variants![0].bg).toBe('light');
        expect(button.showcaseConfig.variants![1].bg).toBeUndefined();
    });

    it('should leave bg undefined when not declared', () => {
        const components = scanComponents(exports, checker);
        const card = components.find((c) => c.className === 'CardComponent')!;

        expect(card.showcaseConfig.bg).toBeUndefined();
    });

    it('should warn and skip invalid bg values', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);

        const invalid = components.find((c) => c.className === 'InvalidBgComponent')!;

        expect(invalid.showcaseConfig.bg).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('InvalidBgComponent declares invalid bg "rainbow"'));

        warnSpy.mockRestore();
    });

    it('should extract status from showcase config', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.status).toBe('beta');
    });

    it('should leave status undefined when not declared', () => {
        const components = scanComponents(exports, checker);
        const card = components.find((c) => c.className === 'CardComponent')!;

        expect(card.showcaseConfig.status).toBeUndefined();
    });

    it('should warn and skip invalid status values', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const components = scanComponents(exports, checker);

        const invalid = components.find((c) => c.className === 'InvalidStatusComponent')!;

        expect(invalid.showcaseConfig.status).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('InvalidStatusComponent declares invalid status "banana"'));

        warnSpy.mockRestore();
    });

    it('extracts section and sectionOrder from showcaseConfig', () => {
        const components = scanComponents(exports, checker);
        const sectioned = components.find((c) => c.className === 'SectionedComponent')!;

        expect(sectioned.showcaseConfig.section).toBe('Pipes');
        expect(sectioned.showcaseConfig.sectionOrder).toBe(5);
    });

    it('extracts categoryOrder and componentOrder from showcaseConfig', () => {
        const components = scanComponents(exports, checker);
        const sectioned = components.find((c) => c.className === 'SectionedComponent')!;

        expect(sectioned.showcaseConfig.categoryOrder).toBe(3);
        expect(sectioned.showcaseConfig.componentOrder).toBe(2);
    });

    it('counts the values it rejects as diagnostics, but not deprecations or @Input() hints', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const diagnostics: string[] = [];

        scanComponents(exports, checker, diagnostics);

        expect(diagnostics).toEqual([
            expect.stringContaining('MissingTitleComponent has @Showcase without a "title" field'),
            expect.stringContaining('InvalidBgComponent declares invalid bg "rainbow"'),
            expect.stringContaining('InvalidStatusComponent declares invalid status "banana"')
        ]);

        warnSpy.mockRestore();
    });

    it('omits section and sectionOrder when not declared', () => {
        const components = scanComponents(exports, checker);
        const button = components.find((c) => c.className === 'ButtonComponent')!;

        expect(button.showcaseConfig.section).toBeUndefined();
        expect(button.showcaseConfig.sectionOrder).toBeUndefined();
    });
});

describe('scanComponents with forced pseudo states', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];
    let warnSpy: jest.SpyInstance;

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'pseudo-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    function scan() {
        const diagnostics: string[] = [];
        const [component] = scanComponents(exports, checker, diagnostics);
        const pseudoOf = (name: string) => component.showcaseConfig.variants!.find((v) => v.name === name)!.pseudo;

        return { diagnostics, pseudoOf };
    }

    it('reads true, a selector and a list of selectors', () => {
        const { pseudoOf } = scan();

        expect(pseudoOf('Hovered')).toEqual({ hover: true });
        expect(pseudoOf('Pressed')).toEqual({ active: ['.btn', '.btn__icon'], focus: '.btn' });
    });

    it('resolves a selector from a constant', () => {
        expect(scan().pseudoOf('Focused')).toEqual({ 'focus-visible': '.btn' });
    });

    it('leaves a variant without pseudo states without the field', () => {
        expect(scan().pseudoOf('Plain')).toBeUndefined();
    });

    it('drops an unknown state and keeps the others', () => {
        const { diagnostics, pseudoOf } = scan();

        expect(pseudoOf('Unknown state')).toEqual({ hover: true });
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "Unknown state" declares unknown pseudo state "checked", expected one of: hover, active, focus, focus-visible, focus-within. Skipping.'
        );
    });

    it('drops a target that is neither true nor selectors, and the field once nothing is left', () => {
        const { diagnostics, pseudoOf } = scan();

        expect(pseudoOf('Wrong targets')).toBeUndefined();
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "Wrong targets" declares pseudo state "focus" with invalid target 42, expected true, a selector or a list of selectors. Skipping.'
        );
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "Wrong targets" declares pseudo state "hover" with invalid target false, expected true, a selector or a list of selectors. Skipping.'
        );
    });

    it('drops the entries of a selector list that are no selectors', () => {
        const { diagnostics, pseudoOf } = scan();

        expect(pseudoOf('Mixed list')).toEqual({ 'focus-within': ['.field'] });
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "Mixed list" declares pseudo state "focus-within" with 7, "" in its selector list, expected non-empty strings. Skipping them.'
        );
    });

    it('drops empty selectors and empty lists', () => {
        const { diagnostics, pseudoOf } = scan();

        expect(pseudoOf('Empty')).toBeUndefined();
        expect(diagnostics).toContainEqual('PseudoStatesComponent variant "Empty" declares pseudo state "focus" with an empty selector. Skipping.');
        expect(diagnostics).toContainEqual('PseudoStatesComponent variant "Empty" declares pseudo state "active" with an empty selector list. Skipping.');
    });

    it('drops a pseudo field that is no object', () => {
        const { diagnostics, pseudoOf } = scan();

        expect(pseudoOf('Not an object')).toBeUndefined();
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "Not an object" declares invalid pseudo "hover", expected an object mapping pseudo states to true or selectors. Skipping.'
        );
    });

    it('quotes an array or an object it rejects, so the message shows what was written', () => {
        const { diagnostics, pseudoOf } = scan();

        expect(pseudoOf('A list')).toBeUndefined();
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "A list" declares invalid pseudo ["hover","focus"], expected an object mapping pseudo states to true or selectors. Skipping.'
        );
        expect(diagnostics).toContainEqual(
            'PseudoStatesComponent variant "Object target" declares pseudo state "hover" with invalid target {}, expected true, a selector or a list of selectors. Skipping.'
        );
    });

    it('reports nothing about the valid variants', () => {
        const { diagnostics } = scan();

        expect(diagnostics.filter((d) => /"(Plain|Focused|Hovered|Pressed)"/.test(d))).toEqual([]);
        expect(diagnostics).toHaveLength(9);
    });
});

describe('scanComponents with component states', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];
    let warnSpy: jest.SpyInstance;

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'showcase-states-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    function scan() {
        const diagnostics: string[] = [];
        const components = scanComponents(exports, checker, diagnostics);
        const config = (className: string) => components.find((c) => c.className === className)!.showcaseConfig;

        return { diagnostics, config };
    }

    it('keeps every state slot so later indices stay put', () => {
        const { states } = scan().config('ShowcaseStatesComponent');

        expect(states!.map((s) => s.name)).toEqual(['Hover', 'Pressed', 'State 3', 'State 4', 'Hover', 'Empty', 'Bad']);
        expect(states![0].pseudo).toEqual({ hover: '.btn' });
        expect(states![1].pseudo).toEqual({ hover: '.btn', active: '.btn' });
        expect(states![2].pseudo).toEqual({});
        expect(states![3].pseudo).toEqual({ focus: '.btn' });
        expect(states![4].pseudo).toEqual({});
        expect(states![5].pseudo).toEqual({});
        expect(states![6].pseudo).toEqual({});
    });

    it('reports each unusable state', () => {
        const { diagnostics } = scan();
        const className = 'ShowcaseStatesComponent';

        expect(diagnostics).toContainEqual(`${className} states[2] is "oops", expected { name, pseudo }. Its column stays empty.`);
        expect(diagnostics).toContainEqual(`${className} states[3] has no name, expected a non-empty string. Calling it "State 4".`);
        expect(diagnostics).toContainEqual(`${className} state "Hover" repeats the name of states[0]; only the first one is used. Its column stays empty.`);
        expect(diagnostics).toContainEqual(`${className} state "Empty" declares no pseudo states. Its column stays empty.`);
        expect(diagnostics).toContainEqual(
            `${className} state "Bad" declares unknown pseudo state "checked", expected one of: hover, active, focus, focus-visible, focus-within. Skipping.`
        );
    });

    it('keeps states: false on a variant and drops anything else', () => {
        const { diagnostics, config } = scan();
        const variants = config('ShowcaseStatesComponent').variants!;

        expect(variants.find((v) => v.name === 'Plain')!.states).toBeUndefined();
        expect(variants.find((v) => v.name === 'Opted out')!.states).toBe(false);
        expect(variants.find((v) => v.name === 'Wrong')).not.toHaveProperty('states');
        expect(diagnostics).toContainEqual('ShowcaseStatesComponent variant "Wrong" declares invalid states true, expected false. Skipping.');
        expect(diagnostics.filter((d) => d.includes('variant "Plain"') || d.includes('variant "Opted out"'))).toEqual([]);
    });

    it('drops states on a renderPage component', () => {
        const { diagnostics, config } = scan();

        expect(config('PageStatesComponent').states).toBeUndefined();
        expect(diagnostics).toContainEqual(
            'PageStatesComponent declares states together with renderPage; a component page has no Overview to show them in. Skipping states.'
        );
    });

    it('names a state by its name in a diagnostic path', () => {
        const { diagnostics, config } = scan();
        const message = diagnostics.find((d) => d.startsWith('UnevaluableStateComponent'))!;

        expect(message).toContain('UnevaluableStateComponent › states[1] "Pressed" › pseudo.hover — "pickTarget()" (');
        expect(message).toContain('cannot be evaluated statically and was dropped.');
        expect(config('UnevaluableStateComponent').states!.map((s) => s.pseudo)).toEqual([{ hover: '.btn' }, {}]);
    });
});

describe('scanComponents with @Showcase values it cannot evaluate', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];
    let warnSpy: jest.SpyInstance;

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'unevaluable-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    function scan() {
        const diagnostics: string[] = [];
        const components = scanComponents(exports, checker, diagnostics);

        return { components, diagnostics };
    }

    it('warns with the component, the path in the config and the source location', () => {
        const message = scan().diagnostics.find((d) => d.includes('maxFileSize'))!;

        expect(message).toContain('UnevaluableShowcaseComponent › variants[1] "Auto hint" › inputs.maxFileSize — "megabytes(5)" (');
        expect(message).toContain('src/builder/scanner/__fixtures__/unevaluable-showcase.component.ts:31:73) cannot be evaluated statically and was dropped.');
        expect(message).not.toContain(FIXTURES_DIR);
        expect(warnSpy).toHaveBeenCalledWith(`⚠ ng-prism: ${message}`);
    });

    it('reports exactly the @Showcase values it drops, nothing from @Component or input defaults', () => {
        const where = scan().diagnostics.map((d) => d.split(' — ')[0]);

        expect(where).toEqual([
            'UnevaluableShowcaseComponent › meta',
            'UnevaluableShowcaseComponent › variants[0] "Plain" › inputs.validator',
            'UnevaluableShowcaseComponent › variants[1] "Auto hint" › inputs.maxFileSize',
            'UnevaluableShowcaseComponent › variants[2]',
            'TopLevelSpreadComponent › @Showcase',
            'UnevaluableRootComponent › @Showcase',
            expect.stringMatching(/^DeprecatedProvidersComponent declares @Showcase providers/),
            'ConstantShowcaseComponent › variants[1] "Retry" › inputs.retries',
            expect.stringMatching(/^ConstConfigProvidersComponent declares @Showcase providers \(.*indirect-providers\.component\.ts:17:11\)/),
            expect.stringMatching(/^SpreadProvidersComponent declares @Showcase providers \(.*indirect-providers\.component\.ts:9:\d+\)/)
        ]);
    });

    it('resolves constants, enum members and spread constants, also from other files', () => {
        const component = scan().components.find((c) => c.className === 'ConstantShowcaseComponent')!;

        expect(component.showcaseConfig.meta).toEqual({ a11y: { accept: ['color-contrast'] }, figma: 'https://www.figma.com/design/abc123/DS' });
        expect(component.showcaseConfig.variants![0].inputs).toEqual({ maxFileSize: 5242880, maxFiles: 3, size: 'm' });
    });

    it('names the reference behind a value it had to drop', () => {
        const message = scan().diagnostics.find((d) => d.includes('inputs.retries'))!;

        expect(message).toContain(
            'constant-showcase.component.ts:21:36) cannot be evaluated statically and was dropped: retries is declared with let; only const declarations can be read.'
        );
    });

    it('does not resolve @Component fields it never reads', () => {
        const looked: string[] = [];
        const recording = new Proxy(checker, {
            get(target, property, receiver) {
                if (property === 'getSymbolAtLocation') {
                    return (node: ts.Node) => {
                        looked.push(node.getText());
                        return target.getSymbolAtLocation(node);
                    };
                }
                const member = Reflect.get(target, property, receiver);

                return typeof member === 'function' ? member.bind(target) : member;
            }
        });

        scanComponents(exports, recording, []);

        expect(looked).not.toContain('ChildComponent');
        expect(looked).toContain('SELECTOR');
    });

    it('resolves a constant selector in @Component', () => {
        const component = scan().components.find((c) => c.className === 'ConstantShowcaseComponent')!;

        expect(component.componentMeta.selector).toBe('constant-showcase');
    });

    it('warns once about deprecated providers instead of once per provider', () => {
        const messages = scan().diagnostics.filter((d) => d.startsWith('DeprecatedProvidersComponent'));

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain('deprecated-providers.component.ts:17:5), which are deprecated and will be removed in 23.0.0');
        expect(messages[0]).toContain('defineConfig({ appProviders })');
    });

    it('drops only the value it cannot evaluate', () => {
        const component = scan().components.find((c) => c.className === 'UnevaluableShowcaseComponent')!;

        expect(component.showcaseConfig.meta).toEqual({ figma: 'https://www.figma.com/design/abc123/DS' });
        expect(component.showcaseConfig.variants!.map((v) => v.inputs)).toEqual([{ label: 'Plain' }, { label: 'Auto hint' }]);
    });

    it('says when a value is a function that can never reach the manifest', () => {
        const message = scan().diagnostics.find((d) => d.includes('validator'))!;

        expect(message).toContain('"(value: string) => value.length > 0" (');
        expect(message).toContain(':30:63) is a runtime value (function, class or instance) and cannot be part of the static manifest; it was dropped.');
    });

    it('keeps a component whose @Showcase spreads at the top level', () => {
        const { components, diagnostics } = scan();
        const component = components.find((c) => c.className === 'TopLevelSpreadComponent')!;

        expect(component.showcaseConfig.title).toBe('Top-level spread');
        expect(diagnostics).toContainEqual(expect.stringContaining('TopLevelSpreadComponent › @Showcase — "...sharedShowcase()" ('));
    });

    it('skips a component whose whole @Showcase argument cannot be evaluated, and says so', () => {
        const { components, diagnostics } = scan();

        expect(components.find((c) => c.className === 'UnevaluableRootComponent')).toBeUndefined();
        expect(diagnostics).toContainEqual(
            expect.stringMatching(
                /UnevaluableRootComponent › @Showcase — "buildShowcase\(\)" \(.*:11:11\) cannot be evaluated statically, so the component is skipped\.$/
            )
        );
    });

    it('reports a loss once when a component is scanned from several entry points', () => {
        const diagnostics: string[] = [];

        scanComponents(exports, checker, diagnostics);
        scanComponents(exports, checker, diagnostics);

        expect(diagnostics).toHaveLength(10);
        expect(warnSpy.mock.calls.filter(([message]) => String(message).includes('megabytes(5)'))).toHaveLength(1);
    });
});

describe('scanComponents with base classes', () => {
    let checker: ts.TypeChecker;
    let exports: ts.Symbol[];
    let warnSpy: jest.SpyInstance;

    beforeAll(() => {
        const entryFile = path.join(FIXTURES_DIR, 'inheritance-api.ts');
        const result = resolveEntryPointExports([{ entryFile, importPath: 'fixture' }], compilerOptions);

        checker = result.program.getTypeChecker();
        exports = result.entries[0].exports;
    });

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    function warnings(): string[] {
        return warnSpy.mock.calls.map((call) => String(call[0]));
    }

    function warningsAbout(className: string): string[] {
        return warnings().filter((message) => message.includes(`ng-prism: ${className} `));
    }

    function scanned(className: string) {
        return scanComponents(exports, checker).find((c) => c.className === className)!;
    }

    it('records inherited inputs on the scanned component', () => {
        const picker = scanned('CountryPickerComponent');

        expect(picker.inputs.map((input) => input.name)).toEqual(['label', 'showFlags', 'options', 'value', 'disabled']);
        expect(picker.outputs.map((output) => output.name)).toEqual(['blurred']);
    });

    it('records the base classes with source, nearest first', () => {
        expect(scanned('CountryPickerComponent').baseClasses).toEqual([
            { className: 'ListboxField', filePath: expect.stringMatching(/field-base\.directive\.ts$/) },
            { className: 'FieldBase', filePath: expect.stringMatching(/field-base\.directive\.ts$/) }
        ]);
    });

    // Angular does not read their inputs, but their methods are still inherited.
    it('records undecorated base classes as well', () => {
        expect(scanned('UndecoratedChildComponent').baseClasses).toEqual([{ className: 'UndecoratedBase', filePath: expect.any(String) }]);
    });

    it('leaves base classes that only exist as a declaration out of the recorded base classes', () => {
        expect(scanned('LibraryBackedComponent').baseClasses).toEqual([]);
    });

    it('warns about the inputs of a base class that only exists in a declaration file, by their public names', () => {
        scanComponents(exports, checker);

        expect(warningsAbout('LibraryBackedComponent')).toEqual([
            expect.stringMatching(/LibraryBackedComponent inherits placeholder, maxlength from LibraryField, .*library-field\.d\.ts/)
        ]);
    });

    it('warns once for each such base class up the chain', () => {
        scanComponents(exports, checker);

        expect(warningsAbout('LabelledLibraryComponent')).toEqual([
            expect.stringContaining('LabelledLibraryComponent inherits label from LibraryLabelledField'),
            expect.stringContaining('LabelledLibraryComponent inherits placeholder, maxlength from LibraryField')
        ]);
    });

    it('warns about an ambient base class in a .ts file like about a declaration file', () => {
        scanComponents(exports, checker);

        expect(warningsAbout('AmbientComponent')).toEqual([
            expect.stringMatching(/AmbientComponent inherits ambientLabel, importTyped, aliased from AmbientField, .*ambient-field\.ts/)
        ]);
        expect(warningsAbout('ModuleAmbientComponent')).toEqual([expect.stringContaining('ModuleAmbientComponent inherits moduleLabel from ModuleField')]);
    });

    it('does not warn about a declaration-file base class without inputs', () => {
        scanComponents(exports, checker);

        expect(warningsAbout('LoggingComponent')).toEqual([]);
    });

    // The Angular compiler writes ɵdir for every decorated class, so a compiled class without it is undecorated.
    it('does not warn about a compiled base class without a directive definition', () => {
        scanComponents(exports, checker);

        expect(warningsAbout('UndecoratedLibraryComponent')).toEqual([]);
    });

    it('does not warn about base classes it can read, or about mixins', () => {
        scanComponents(exports, checker);

        for (const className of ['CountryPickerComponent', 'ColorPickerComponent', 'UndecoratedChildComponent', 'MiddleChildComponent', 'MixinComponent']) {
            expect(warningsAbout(className)).toEqual([]);
        }
    });

    it('names the base class an @Input() decorator comes from', () => {
        scanComponents(exports, checker);

        expect(warningsAbout('LegacyChildComponent')).toEqual([expect.stringContaining('LegacyChildComponent inherits @Input() decorators from LegacyBase')]);
    });

    it('warns once per base class, however many entry points export the component', () => {
        const notices = new Set<string>();

        scanComponents(exports, checker, [], notices);
        scanComponents(exports, checker, [], notices);

        expect(warningsAbout('LibraryBackedComponent')).toHaveLength(1);
        expect(warningsAbout('LegacyChildComponent')).toHaveLength(1);
    });

    // strictShowcase fails the build on diagnostics, and a base class in a
    // package is nothing the author of the component can fix.
    it('keeps the warnings out of the diagnostics', () => {
        const diagnostics: string[] = [];

        scanComponents(exports, checker, diagnostics);

        expect(diagnostics).toEqual([]);
    });
});
