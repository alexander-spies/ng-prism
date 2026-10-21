import type { ApiSetupEntry, ApiTypeDoc, ServiceApi } from '@ng-prism/core/plugin';
import { activeTocId, buildServiceToc, paramSegments, setupSignature, splitReachedFrom, typeSegments } from './service-page.model.js';

function typeDoc(name: string, id = name): ApiTypeDoc {
    return { id, name, kind: 'interface', importPath: 'fixture/toast', tags: {}, properties: [] };
}

function makeApi(overrides: Partial<ServiceApi> = {}): ServiceApi {
    return { tags: {}, properties: [], methods: [], setup: [], types: [], ...overrides };
}

describe('buildServiceToc', () => {
    it('orders the toc and skips empty sections', () => {
        const api = makeApi({
            setup: [{ name: 'provideToast', kind: 'function', importPath: 'fixture/toast', tags: {}, params: [] }],
            methods: [{ name: 'show', params: [], returnType: { text: 'void' }, tags: {} }],
            types: [typeDoc('ToastOptions'), typeDoc('ToastRef')]
        });

        expect(buildServiceToc(api).map((entry) => entry.id)).toEqual(['usage', 'setup', 'methods', 'types', 'type-ToastOptions', 'type-ToastRef']);
    });

    it('lists every section with a label and puts the types one level down', () => {
        const api = makeApi({
            tags: { example: ['inject(ToastService)'] },
            properties: [{ name: 'count', type: { text: 'number' }, readonly: true, tags: {} }],
            setup: [{ name: 'provideToast', kind: 'function', importPath: 'fixture/toast', tags: {}, params: [] }],
            methods: [{ name: 'show', params: [], returnType: { text: 'void' }, tags: {} }],
            types: [typeDoc('Item', 'Item@lib/b')]
        });

        expect(buildServiceToc(api)).toEqual([
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
        expect(buildServiceToc(makeApi())).toEqual([{ id: 'usage', label: 'Usage', level: 1 }]);
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
