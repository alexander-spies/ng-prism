import type { ApiMethod, ApiSetupEntry, ApiTypeDoc, ScannedPipe, ScannedService } from '@ng-prism/core/plugin';
import { pipePage, servicePage } from './api-page.model.js';
import { generatePipeUsage } from './pipe-usage.js';
import { generateServiceUsage } from './service-usage.js';

const SETUP: ApiSetupEntry = { name: 'provideToast', kind: 'function', importPath: 'fixture/toast', tags: {}, params: [] };
const METHOD: ApiMethod = { name: 'show', params: [], returnType: { text: 'void' }, tags: {} };
const TYPE: ApiTypeDoc = { id: 'ToastRef', name: 'ToastRef', kind: 'interface', importPath: 'fixture/toast', tags: {}, properties: [] };

function makeService(overrides: Partial<ScannedService> = {}, api: Partial<ScannedService['api']> = {}): ScannedService {
    return {
        className: 'ToastService',
        filePath: '/lib/toast.service.ts',
        importPath: 'fixture/toast',
        showcaseConfig: { title: 'Toast Service' },
        provision: 'auto',
        api: { tags: {}, properties: [], methods: [], setup: [], types: [], ...api },
        ...overrides
    };
}

function makePipe(overrides: Partial<ScannedPipe> = {}, api: Partial<ScannedPipe['api']> = {}): ScannedPipe {
    return {
        className: 'TimeAgoPipe',
        filePath: '/lib/time-ago.pipe.ts',
        importPath: 'test-lib',
        showcaseConfig: { title: 'Time Ago' },
        pipeName: 'timeAgo',
        pure: true,
        api: { tags: {}, transform: [], setup: [], types: [], ...api },
        ...overrides
    };
}

describe('servicePage', () => {
    it('shows the chips of the service page', () => {
        expect(servicePage(makeService({}, { tags: { since: '1.2.0' } })).chips).toEqual([
            { label: 'Since', value: '1.2.0' },
            { label: 'Provided in', value: 'root/automatically' },
            { label: 'Entry point', value: 'fixture/toast' }
        ]);
    });

    it('puts the deprecation first, with its message when it has one', () => {
        expect(servicePage(makeService({}, { tags: { deprecated: 'Use NoticeService.' } })).chips[0]).toEqual({
            label: 'Deprecated',
            value: 'Use NoticeService.',
            deprecated: true
        });
        expect(servicePage(makeService({}, { tags: { deprecated: true } })).chips[0]).toEqual({ label: 'Deprecated', deprecated: true });
    });

    it('says a manual service goes into providers and leaves out what is unknown', () => {
        expect(servicePage(makeService({ provision: 'manual', importPath: undefined })).chips).toEqual([{ label: 'Provided in', value: 'providers' }]);
    });

    it('hands over the sections of the service API', () => {
        const property = { name: 'count', type: { text: 'number' }, readonly: true, tags: {} };
        const service = makeService(
            {},
            {
                description: 'Shows toasts.',
                tags: { see: ['NoticeService'], example: ['inject(ToastService)'] },
                properties: [property],
                methods: [METHOD],
                setup: [SETUP],
                types: [TYPE]
            }
        );

        expect(servicePage(service)).toStrictEqual({
            kind: 'service',
            className: 'ToastService',
            description: 'Shows toasts.',
            chips: expect.any(Array),
            see: ['NoticeService'],
            usage: generateServiceUsage(service),
            setup: [SETUP],
            examples: ['inject(ToastService)'],
            properties: [property],
            methods: [METHOD],
            types: [TYPE]
        });
    });
});

describe('pipePage', () => {
    it('shows the template name and purity first', () => {
        expect(pipePage(makePipe({}, { tags: { since: '2.0.0' } })).chips).toEqual([
            { label: 'Pipe', value: 'timeAgo' },
            { label: 'Pure' },
            { label: 'Since', value: '2.0.0' },
            { label: 'Entry point', value: 'test-lib' }
        ]);
    });

    it('says when a pipe is impure', () => {
        expect(pipePage(makePipe({ pure: false })).chips).toContainEqual({ label: 'Impure' });
    });

    it('leaves the purity out when it could not be read', () => {
        expect(pipePage(makePipe({ pure: undefined, importPath: undefined })).chips).toEqual([{ label: 'Pipe', value: 'timeAgo' }]);
    });

    it('puts the deprecation first, as on a service page', () => {
        expect(pipePage(makePipe({}, { tags: { deprecated: true } })).chips[0]).toEqual({ label: 'Deprecated', deprecated: true });
    });

    it('hands over the transform signatures and no members', () => {
        const pipe = makePipe({}, { description: 'Relative time.', tags: { example: ['{{ date | timeAgo }}'] }, transform: [METHOD], setup: [SETUP], types: [TYPE] });

        expect(pipePage(pipe)).toStrictEqual({
            kind: 'pipe',
            className: 'TimeAgoPipe',
            description: 'Relative time.',
            chips: expect.any(Array),
            see: [],
            usage: generatePipeUsage(pipe),
            setup: [SETUP],
            examples: ['{{ date | timeAgo }}'],
            transform: [METHOD],
            types: [TYPE]
        });
    });
});
