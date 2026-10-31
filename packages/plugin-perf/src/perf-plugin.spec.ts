import type { ScannedComponent } from '@ng-prism/core/plugin';
import { perfPlugin } from './perf-plugin.js';

jest.mock('./bundle/bundle-scanner.js');

describe('perfPlugin', () => {
    it('should return a plugin with the correct name', () => {
        const plugin = perfPlugin();

        expect(plugin.name).toBe('@ng-prism/plugin-perf');
    });

    it('should register one panel', () => {
        const plugin = perfPlugin();

        expect(plugin.panels).toHaveLength(1);
    });

    it('should define the panel with correct properties', () => {
        const plugin = perfPlugin();
        const panel = plugin.panels![0];

        expect(panel.id).toBe('perf');
        expect(panel.label).toBe('Performance');
        expect(panel.position).toBeUndefined();
        expect(panel.loadComponent).toBeDefined();
    });

    it('should have an onComponentScanned hook', () => {
        const plugin = perfPlugin();

        expect(plugin.onComponentScanned).toBeDefined();
    });

    it('should not require panel providers', () => {
        const plugin = perfPlugin();
        const panel = plugin.panels![0];

        expect(panel.providers).toBeUndefined();
    });

    it('accepts maxTreeDepth without a notice', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            expect(perfPlugin({ bundle: { maxTreeDepth: 3 } }).name).toBe('@ng-prism/plugin-perf');
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it('names every deprecated option that is set', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            perfPlugin({ thresholds: { bundleWarnKb: 30 }, bundle: { excludeImports: ['rxjs'] }, render: { bufferSize: 10 }, memory: { gcDelayMs: 5 } });

            expect(warn.mock.calls.map(([message]) => message)).toEqual(
                ['thresholds', 'bundle.excludeImports', 'render', 'memory'].map(
                    (option) => `⚠ ng-prism: perfPlugin() option "${option}" is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.`
                )
            );
        } finally {
            warn.mockRestore();
        }
    });

    describe('onComponentScanned', () => {
        it('leaves a part untouched and scans no bundle for it', async () => {
            const { scanBundle } = require('./bundle/bundle-scanner.js');

            const plugin = perfPlugin();
            const component: ScannedComponent = {
                className: 'SelectOptionComponent',
                filePath: '/src/select-option.ts',
                showcaseConfig: { title: 'SelectOption' },
                inputs: [],
                outputs: [],
                componentMeta: { selector: 'x', standalone: true, isDirective: false },
                parentClassName: 'SelectComponent'
            };

            const result = await plugin.onComponentScanned!(component);

            expect(result).toBeUndefined();
            expect(scanBundle).not.toHaveBeenCalled();
        });
    });
});
