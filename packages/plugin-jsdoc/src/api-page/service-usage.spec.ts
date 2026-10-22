import type { ApiSetupEntry, ScannedService } from '@ng-prism/core/plugin';
import { generateServiceUsage } from './service-usage.js';

const PROVIDE_TOAST: ApiSetupEntry = {
    name: 'provideToast',
    kind: 'function',
    importPath: 'fixture/toast',
    tags: {},
    params: [{ name: 'config', type: { text: 'ToastConfig', links: ['ToastConfig'] }, optional: true, defaultValue: '{}' }],
    returnType: { text: 'Provider' }
};

const TOAST_LABELS: ApiSetupEntry = {
    name: 'TOAST_LABELS',
    kind: 'token',
    importPath: 'fixture/toast',
    tags: {},
    tokenType: { text: 'InjectionToken<ToastLabels>', links: ['ToastLabels'] }
};

function makeService(overrides: Partial<ScannedService> = {}, setup: ApiSetupEntry[] = [PROVIDE_TOAST, TOAST_LABELS]): ScannedService {
    return {
        className: 'ToastService',
        filePath: '/lib/toast.service.ts',
        importPath: 'fixture/toast',
        showcaseConfig: { title: 'Toast Service' },
        provision: 'auto',
        api: { tags: {}, properties: [], methods: [], setup, types: [] },
        ...overrides
    };
}

const AUTO_USAGE = [
    "import { ToastService, provideToast, TOAST_LABELS } from 'fixture/toast';",
    '',
    '// app.config.ts',
    'providers: [provideToast(), { provide: TOAST_LABELS, useValue: … }]',
    '',
    '// in a component or service',
    'private readonly toastService = inject(ToastService);'
].join('\n');

describe('generateServiceUsage', () => {
    it('writes import, setup and inject for an auto service', () => {
        expect(generateServiceUsage(makeService())).toBe(AUTO_USAGE);
    });

    it('omits the app.config block without setup', () => {
        expect(generateServiceUsage(makeService({}, []))).toBe(
            ["import { ToastService } from 'fixture/toast';", '', '// in a component or service', 'private readonly toastService = inject(ToastService);'].join('\n')
        );
    });

    it('uses (…) for a setup function with a required parameter', () => {
        const required: ApiSetupEntry = { ...PROVIDE_TOAST, params: [{ name: 'config', type: { text: 'ToastConfig' }, optional: false }] };

        expect(generateServiceUsage(makeService({}, [required]))).toContain('providers: [provideToast(…)]');
    });

    it('calls a setup function without parameters with ()', () => {
        const bare: ApiSetupEntry = { ...PROVIDE_TOAST, params: [] };

        expect(generateServiceUsage(makeService({}, [bare]))).toContain('providers: [provideToast()]');
    });

    it('treats a rest parameter as optional', () => {
        const rest: ApiSetupEntry = { ...PROVIDE_TOAST, params: [{ name: 'features', type: { text: 'ToastFeature[]' }, optional: false, rest: true }] };

        expect(generateServiceUsage(makeService({}, [rest]))).toContain('providers: [provideToast()]');
    });

    it('adds a providers entry for a manual service without setup', () => {
        const manual = makeService({ className: 'ManualService', importPath: 'fixture/services', provision: 'manual' }, []);

        expect(generateServiceUsage(manual)).toBe(
            [
                "import { ManualService } from 'fixture/services';",
                '',
                '// the component that uses it',
                '@Component({ …, providers: [ManualService] })',
                'export class MyComponent {',
                '    private readonly manualService = inject(ManualService);',
                '}'
            ].join('\n')
        );
    });

    it('leaves the providers entry out for a manual service with a setup function', () => {
        expect(generateServiceUsage(makeService({ provision: 'manual' }))).toBe(AUTO_USAGE);
    });

    it('keeps the providers entry for a manual service whose setup has tokens only, as a token never provides it', () => {
        const manual = makeService({ className: 'ManualService', provision: 'manual' }, [TOAST_LABELS]);

        expect(generateServiceUsage(manual)).toBe(
            [
                "import { ManualService, TOAST_LABELS } from 'fixture/toast';",
                '',
                '// app.config.ts',
                'providers: [{ provide: TOAST_LABELS, useValue: … }]',
                '',
                '// the component that uses it',
                '@Component({ …, providers: [ManualService] })',
                'export class MyComponent {',
                '    private readonly manualService = inject(ManualService);',
                '}'
            ].join('\n')
        );
    });

    it('groups imports by entry point', () => {
        const usage = generateServiceUsage(makeService({}, [{ ...PROVIDE_TOAST, importPath: 'fixture/toast/config' }, TOAST_LABELS]));

        expect(usage.split('\n').slice(0, 3)).toEqual([
            "import { ToastService, TOAST_LABELS } from 'fixture/toast';",
            "import { provideToast } from 'fixture/toast/config';",
            ''
        ]);
    });

    it('leaves the service out of the imports when its entry point is unknown', () => {
        const usage = generateServiceUsage(makeService({ importPath: undefined }));

        expect(usage.split('\n')[0]).toBe("import { provideToast, TOAST_LABELS } from 'fixture/toast';");
    });
});
