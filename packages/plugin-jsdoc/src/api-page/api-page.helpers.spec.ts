import type { ApiSetupEntry, ApiTypeDoc, ComponentApi, PipeApi, ScannedComponent, ScannedPipe, ScannedService, ServiceApi } from '@ng-prism/core/plugin';
import {
    activeTocId,
    buildApiPageToc,
    buildPartsToc,
    declaredParamSegments,
    documentsParams,
    isTypeAnchor,
    paramSegments,
    partAnchor,
    partScope,
    scopedAnchor,
    setupSignature,
    splitReachedFrom,
    typeAnchor,
    typeSegments
} from './api-page.helpers.js';
import { componentApiPage, partPages, pipePage, servicePage } from './api-page.model.js';

function typeDoc(name: string, id = name): ApiTypeDoc {
    return { id, name, kind: 'interface', importPath: 'fixture/toast', tags: {}, properties: [] };
}

function makeService(overrides: Partial<ServiceApi> = {}): ScannedService {
    return {
        className: 'ToastService',
        filePath: '/lib/toast.service.ts',
        importPath: 'fixture/toast',
        showcaseConfig: { title: 'Toast Service' },
        provision: 'auto',
        api: { tags: {}, properties: [], methods: [], setup: [], types: [], ...overrides }
    };
}

function makePipe(overrides: Partial<PipeApi> = {}): ScannedPipe {
    return {
        className: 'TimeAgoPipe',
        filePath: '/lib/time-ago.pipe.ts',
        importPath: 'test-lib',
        showcaseConfig: { title: 'Time Ago' },
        pipeName: 'timeAgo',
        pure: true,
        api: { tags: {}, transform: [], setup: [], types: [], ...overrides }
    };
}

function makeComponent(api: Partial<ComponentApi> = {}, overrides: Partial<ScannedComponent> = {}): ScannedComponent {
    return {
        className: 'TabsComponent',
        filePath: '/lib/tabs.component.ts',
        importPath: 'test-lib',
        showcaseConfig: { title: 'Tabs' },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'sg-tabs', standalone: true, isDirective: false },
        api: { tags: {}, inputTypes: {}, outputTypes: {}, modelChanges: [], methods: [], types: [], ...api },
        ...overrides
    };
}

describe('buildApiPageToc', () => {
    it('orders the toc and skips empty sections', () => {
        const service = makeService({
            setup: [{ name: 'provideToast', kind: 'function', importPath: 'fixture/toast', tags: {}, params: [] }],
            methods: [{ name: 'show', params: [], returnType: { text: 'void' }, tags: {} }],
            types: [typeDoc('ToastOptions'), typeDoc('ToastRef')]
        });

        expect(buildApiPageToc(servicePage(service)).map((entry) => entry.id)).toEqual(['usage', 'setup', 'methods', 'types', 'type-ToastOptions', 'type-ToastRef']);
    });

    it('lists every section with a label and puts the types one level down', () => {
        const service = makeService({
            tags: { example: ['inject(ToastService)'] },
            properties: [{ name: 'count', type: { text: 'number' }, readonly: true, tags: {} }],
            setup: [{ name: 'provideToast', kind: 'function', importPath: 'fixture/toast', tags: {}, params: [] }],
            methods: [{ name: 'show', params: [], returnType: { text: 'void' }, tags: {} }],
            types: [typeDoc('Item', 'Item@lib/b')]
        });

        expect(buildApiPageToc(servicePage(service))).toEqual([
            { id: 'usage', label: 'Usage', level: 1 },
            { id: 'setup', label: 'Setup', level: 1 },
            { id: 'examples', label: 'Examples', level: 1 },
            { id: 'properties', label: 'Properties', level: 1 },
            { id: 'methods', label: 'Methods', level: 1 },
            { id: 'types', label: 'Types', level: 1 },
            { id: 'type-Item@lib/b', label: 'Item', level: 2 }
        ]);
    });

    it('always lists the usage', () => {
        expect(buildApiPageToc(servicePage(makeService()))).toEqual([{ id: 'usage', label: 'Usage', level: 1 }]);
        expect(buildApiPageToc(pipePage(makePipe()))).toEqual([{ id: 'usage', label: 'Usage', level: 1 }]);
    });

    it('lists the transform signatures of a pipe between examples and types', () => {
        const pipe = makePipe({
            tags: { example: ['{{ date | timeAgo }}'] },
            transform: [{ name: 'transform', params: [], returnType: { text: 'string' }, tags: {} }],
            setup: [{ name: 'provideTimeAgo', kind: 'function', importPath: 'test-lib', tags: {}, params: [] }],
            types: [typeDoc('TimeAgoOptions')]
        });
        const toc = buildApiPageToc(pipePage(pipe));

        expect(toc.map((entry) => entry.id)).toEqual(['usage', 'setup', 'examples', 'transform', 'types', 'type-TimeAgoOptions']);
        expect(toc.find((entry) => entry.id === 'transform')).toEqual({ id: 'transform', label: 'Transform', level: 1 });
    });

    it('lists the inputs and outputs of a component between examples and methods', () => {
        const component = makeComponent(
            { methods: [{ name: 'select', params: [], returnType: { text: 'void' }, tags: {} }], types: [typeDoc('X')] },
            { inputs: [{ name: 'tabs', type: 'array', required: true }], outputs: [{ name: 'tabSelected' }] }
        );
        const toc = buildApiPageToc(componentApiPage(component));

        expect(toc.map((entry) => entry.id)).toEqual(['usage', 'inputs', 'outputs', 'methods', 'types', 'type-X']);
        expect(toc.slice(1, 3)).toEqual([
            { id: 'inputs', label: 'Inputs', level: 1 },
            { id: 'outputs', label: 'Outputs', level: 1 }
        ]);
    });

    it('lists the outputs of a component that only has a model', () => {
        const component = makeComponent(
            { modelChanges: [{ input: 'value', event: 'valueChange', type: { text: 'string' } }] },
            { inputs: [{ name: 'value', type: 'string', required: false }] }
        );

        expect(buildApiPageToc(componentApiPage(component)).map((entry) => entry.id)).toEqual(['usage', 'inputs', 'outputs']);
    });

    it('skips the inputs and outputs of a component that has none', () => {
        expect(buildApiPageToc(componentApiPage(makeComponent())).map((entry) => entry.id)).toEqual(['usage']);
    });
});

describe('buildApiPageToc with a scope', () => {
    it('builds the parent TOC unchanged without a scope', () => {
        const service = servicePage(makeService({ methods: [{ name: 'show', params: [], returnType: { text: 'void' }, tags: {} }], types: [typeDoc('ToastRef')] }));

        expect(buildApiPageToc(service, '')).toEqual(buildApiPageToc(service));
        expect(buildApiPageToc(service).map((entry) => entry.id)).toEqual(['usage', 'methods', 'types', 'type-ToastRef']);
    });

    it('scopes every id, the types included', () => {
        const service = servicePage(
            makeService({ methods: [{ name: 'show', params: [], returnType: { text: 'void' }, tags: {} }], types: [typeDoc('Item', 'Item@lib/b')] })
        );

        expect(buildApiPageToc(service, partScope(0))).toEqual([
            { id: 'part-0-usage', label: 'Usage', level: 1 },
            { id: 'part-0-methods', label: 'Methods', level: 1 },
            { id: 'part-0-types', label: 'Types', level: 1 },
            { id: 'part-0-type-Item@lib/b', label: 'Item', level: 2 }
        ]);
    });
});

describe('buildPartsToc', () => {
    const option = makeComponent(
        {},
        {
            className: 'OptionComponent',
            inputs: [{ name: 'value', type: 'string', required: true }],
            outputs: [{ name: 'picked' }],
            componentMeta: { selector: 'lib-option', standalone: true, isDirective: false },
            showcaseConfig: { title: 'Option', partOf: 'lib-select' }
        }
    );
    const group = makeComponent(
        { types: [typeDoc('GroupLabel')], methods: [{ name: 'collapse', params: [], returnType: { text: 'void' }, tags: {} }] },
        {
            className: 'OptionGroupComponent',
            componentMeta: { selector: 'lib-option-group', standalone: true, isDirective: false },
            showcaseConfig: { title: 'Option group', partOf: 'lib-select' }
        }
    );

    it('lists each part and its sections, without types', () => {
        expect(buildPartsToc(partPages([{ meta: option }])).map((entry) => [entry.id, entry.level])).toEqual([
            ['part-0', 1],
            ['part-0-usage', 2],
            ['part-0-inputs', 2],
            ['part-0-outputs', 2]
        ]);
    });

    it('leaves out the Types section and the type cards of a part that has types', () => {
        expect(buildPartsToc(partPages([{ meta: group }])).map((entry) => entry.id)).toEqual(['part-0', 'part-0-usage', 'part-0-methods']);
    });

    it('titles the entry of a part and flags it, and leaves the sections unflagged', () => {
        const toc = buildPartsToc(partPages([{ meta: option }]));

        expect(toc[0]).toEqual({ id: 'part-0', label: 'Option', level: 1, part: true });
        expect(toc.slice(1)).toEqual([
            { id: 'part-0-usage', label: 'Usage', level: 2 },
            { id: 'part-0-inputs', label: 'Inputs', level: 2 },
            { id: 'part-0-outputs', label: 'Outputs', level: 2 }
        ]);
        expect(toc.slice(1).some((entry) => 'part' in entry)).toBe(false);
    });

    it('keeps the order of the parts', () => {
        expect(
            buildPartsToc(partPages([{ meta: group }, { meta: option }]))
                .filter((entry) => entry.part)
                .map((entry) => entry.label)
        ).toEqual(['Option group', 'Option']);
    });

    it('is empty without parts', () => {
        expect(buildPartsToc([])).toEqual([]);
    });
});

describe('partAnchor', () => {
    const option = makeComponent(
        {},
        {
            className: 'OptionComponent',
            componentMeta: { selector: 'lib-option', standalone: true, isDirective: false },
            showcaseConfig: { title: 'Option', partOf: 'lib-select' }
        }
    );
    const parts = partPages([{ meta: option }]);

    it('names the block of the part by its class name', () => {
        expect(partAnchor(parts, 'OptionComponent')).toBe('part-0');
    });

    it('gives two parts of one class name, from different files, a block each, and names the first', () => {
        const twins = partPages([{ meta: option }, { meta: { ...option, filePath: '/lib/other/option.component.ts' } }]);

        expect(twins.map((part) => part.scope)).toEqual(['part-0', 'part-1']);
        expect(partAnchor(twins, 'OptionComponent')).toBe('part-0');
    });

    it('is null for no part, and for a class that is not a part of the page', () => {
        expect(partAnchor(parts, null)).toBeNull();
        expect(partAnchor(parts, 'OptionGroupComponent')).toBeNull();
        expect(partAnchor([], 'OptionComponent')).toBeNull();
    });
});

describe('anchors', () => {
    it('scopes an id only when there is a scope', () => {
        expect(scopedAnchor('', 'usage')).toBe('usage');
        expect(scopedAnchor('part-0', 'usage')).toBe('part-0-usage');
    });

    it('names the scope of a part by its position', () => {
        expect(partScope(0)).toBe('part-0');
    });

    it("scopes a part's type anchors so they never collide with the parent's", () => {
        expect(typeAnchor('SelectOption')).toBe('type-SelectOption');
        expect(typeAnchor('SelectOption', partScope(0))).toBe('part-0-type-SelectOption');
    });

    it('tells the anchor of a type card from every other anchor', () => {
        expect(isTypeAnchor('type-SelectOption')).toBe(true);
        expect(isTypeAnchor('type-Item@lib/b')).toBe(true);
        expect(isTypeAnchor('part-0-type-SelectOption')).toBe(true);
        expect(isTypeAnchor('part-0-inputs')).toBe(false);
        expect(isTypeAnchor('part-0')).toBe(false);
        expect(isTypeAnchor('types')).toBe(false);
        expect(isTypeAnchor('inputs')).toBe(false);
        expect(isTypeAnchor('part-type-inputs')).toBe(false);
    });
});

describe('typeSegments', () => {
    it('links the documented types in the text', () => {
        expect(typeSegments({ text: 'readonly ToastRef[]', links: ['ToastRef'] })).toEqual([
            { text: 'readonly ' },
            { text: 'ToastRef', link: 'type-ToastRef' },
            { text: '[]' }
        ]);
    });

    it('returns the text as one segment without links', () => {
        expect(typeSegments({ text: 'number | null' })).toEqual([{ text: 'number | null' }]);
    });

    it('links every occurrence and only whole identifiers', () => {
        expect(typeSegments({ text: 'Map<ToastRef, ToastRefs>', links: ['ToastRef'] })).toEqual([
            { text: 'Map<' },
            { text: 'ToastRef', link: 'type-ToastRef' },
            { text: ', ToastRefs>' }
        ]);
    });

    it('links a name to the id a name collision gave its type', () => {
        expect(typeSegments({ text: 'Item[]', links: ['Item@lib/b'] })).toEqual([{ text: 'Item', link: 'type-Item@lib/b' }, { text: '[]' }]);
    });

    it('prefers the id that is the name itself when two ids share the name', () => {
        expect(typeSegments({ text: 'Item', links: ['Item@lib/b', 'Item'] })).toEqual([{ text: 'Item', link: 'type-Item' }]);
    });

    it('leaves a type imported under another name unlinked', () => {
        expect(typeSegments({ text: 'OtherItem', links: ['Item@lib/b'] })).toEqual([{ text: 'OtherItem' }]);
    });

    it('links to the card of the scope it is given', () => {
        expect(typeSegments({ text: 'readonly ToastRef[]', links: ['ToastRef'] }, 'part-0')).toEqual([
            { text: 'readonly ' },
            { text: 'ToastRef', link: 'part-0-type-ToastRef' },
            { text: '[]' }
        ]);
    });
});

describe('splitReachedFrom', () => {
    it('splits the code at the end from the words before it', () => {
        expect(splitReachedFrom('parameter of show()')).toEqual({ text: 'parameter of ', code: 'show()' });
        expect(splitReachedFrom('via options.action')).toEqual({ text: 'via ', code: 'options.action' });
    });

    it('keeps text without a space as it is', () => {
        expect(splitReachedFrom('somewhere')).toEqual({ text: 'somewhere' });
    });
});

describe('paramSegments', () => {
    it('writes an optional parameter with ? and links its type', () => {
        expect(paramSegments({ name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: true, defaultValue: '{}' })).toEqual([
            { text: 'config?: ' },
            { text: 'ToastConfig', link: 'type-ToastConfig' }
        ]);
    });

    it('writes a rest parameter with ...', () => {
        expect(paramSegments({ name: 'features', type: { text: 'Feature[]' }, optional: false, rest: true })).toEqual([{ text: '...features: Feature[]' }]);
    });

    it('links its type to the card of the scope it is given', () => {
        expect(paramSegments({ name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: false }, 'part-0')).toEqual([
            { text: 'config: ' },
            { text: 'ToastConfig', link: 'part-0-type-ToastConfig' }
        ]);
    });
});

describe('declaredParamSegments', () => {
    it('writes a parameter with a default as its declaration does, without the ?', () => {
        expect(declaredParamSegments({ name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: true, defaultValue: '{}' })).toEqual([
            { text: 'config: ' },
            { text: 'ToastConfig', link: 'type-ToastConfig' },
            { text: ' = {}' }
        ]);
    });

    it('links its type to the card of the scope it is given', () => {
        expect(declaredParamSegments({ name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: true, defaultValue: '{}' }, 'part-0')).toEqual([
            { text: 'config: ' },
            { text: 'ToastConfig', link: 'part-0-type-ToastConfig' },
            { text: ' = {}' }
        ]);
    });

    it('writes a parameter without a default like a signature does', () => {
        expect(declaredParamSegments({ name: 'hint', type: { text: 'string' }, optional: true })).toEqual([{ text: 'hint?: string' }]);
        expect(declaredParamSegments({ name: 'features', type: { text: 'Feature[]' }, optional: false, rest: true })).toEqual([{ text: '...features: Feature[]' }]);
    });
});

describe('documentsParams', () => {
    it('is true when a parameter has a @param text or a default', () => {
        expect(documentsParams([{ name: 'a', type: { text: 'string' }, optional: false, description: 'The a.' }])).toBe(true);
        expect(documentsParams([{ name: 'b', type: { text: 'number' }, optional: true, defaultValue: '5' }])).toBe(true);
    });

    it('is false when the signature already says everything', () => {
        expect(documentsParams([{ name: 'a', type: { text: 'string' }, optional: false }])).toBe(false);
        expect(documentsParams([])).toBe(false);
        expect(documentsParams(undefined)).toBe(false);
    });
});

describe('setupSignature', () => {
    it('writes the parameters and return type of a setup function', () => {
        const entry: ApiSetupEntry = {
            name: 'provideToast',
            kind: 'function',
            importPath: 'fixture/toast',
            tags: {},
            params: [
                { name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: true },
                { name: 'debug', type: { text: 'boolean' }, optional: true }
            ],
            returnType: { text: 'Provider' }
        };

        expect(setupSignature(entry)).toEqual([{ text: '(config?: ' }, { text: 'ToastConfig', link: 'type-ToastConfig' }, { text: ', debug?: boolean): Provider' }]);
    });

    it('writes the type of a setup token', () => {
        const entry: ApiSetupEntry = {
            name: 'TOAST_LABELS',
            kind: 'token',
            importPath: 'fixture/toast',
            tags: {},
            tokenType: { text: 'InjectionToken<ToastLabels>', links: ['ToastLabels'] }
        };

        expect(setupSignature(entry)).toEqual([{ text: ': InjectionToken<' }, { text: 'ToastLabels', link: 'type-ToastLabels' }, { text: '>' }]);
    });

    it('links the types to the cards of the scope it is given', () => {
        const entry: ApiSetupEntry = {
            name: 'provideToast',
            kind: 'function',
            importPath: 'fixture/toast',
            tags: {},
            params: [{ name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: true }],
            returnType: { text: 'Provider' }
        };

        expect(setupSignature(entry, 'part-0')).toEqual([{ text: '(config?: ' }, { text: 'ToastConfig', link: 'part-0-type-ToastConfig' }, { text: '): Provider' }]);
    });
});

describe('activeTocId', () => {
    // A page 3000px tall in a view 800px high: the bottom is reached at scrollTop 2200.
    const anchors = [
        { id: 'usage', top: 40 },
        { id: 'setup', top: 300 },
        { id: 'examples', top: 700 },
        { id: 'properties', top: 1000 },
        { id: 'methods', top: 1400 },
        { id: 'types', top: 2000 },
        { id: 'type-ToastOptions', top: 2300 },
        { id: 'type-ToastRef', top: 2600 }
    ];

    function at(scrollTop: number, jumpTarget: string | null = null): string {
        return activeTocId({ anchors, scrollTop, clientHeight: 800, scrollHeight: 3000, jumpTarget });
    }

    it('activates the last section whose heading crossed the line a quarter down the view', () => {
        expect(at(800)).toBe('properties');
        expect(at(790)).toBe('examples');
    });

    it('activates the first section at the top of the page', () => {
        expect(at(0)).toBe('usage');
        expect(activeTocId({ anchors: anchors.slice(1), scrollTop: 0, clientHeight: 800, scrollHeight: 3000, jumpTarget: null })).toBe('setup');
    });

    it('activates the last entry in view at the bottom of the page', () => {
        expect(at(2200)).toBe('type-ToastRef');
    });

    it('keeps the jump target at the bottom of the page, where it cannot reach the line', () => {
        expect(at(2200, 'types')).toBe('types');
        expect(at(2200, 'type-ToastOptions')).toBe('type-ToastOptions');
    });

    it('keeps the jump target while the jump scrolls past other sections', () => {
        expect(at(800, 'type-ToastRef')).toBe('type-ToastRef');
    });

    it('falls back to the line at the bottom when no anchor is in view', () => {
        expect(activeTocId({ anchors: anchors.slice(0, 6), scrollTop: 2200, clientHeight: 800, scrollHeight: 3000, jumpTarget: null })).toBe('types');
    });

    it('activates the usage on a page without anchors', () => {
        expect(activeTocId({ anchors: [], scrollTop: 0, clientHeight: 800, scrollHeight: 800, jumpTarget: null })).toBe('usage');
    });
});
