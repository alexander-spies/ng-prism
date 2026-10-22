import type { NgPrismConfig, NgPrismPlugin } from '../../plugin/plugin.types.js';
import { describeDeprecatedOptions } from './deprecated-options.js';

class SomeComponent {}

describe('describeDeprecatedOptions', () => {
    it('finds nothing in a config without deprecated options', () => {
        const config: NgPrismConfig = { title: 'Lib', plugins: [{ name: 'notes', panels: [{ id: 'notes', label: 'Notes', placement: 'addon' }] }] };

        expect(describeDeprecatedOptions(config, 'ng-prism.config.ts')).toEqual([]);
    });

    it('names every deprecated config option that is set, whatever its value', () => {
        const config: NgPrismConfig = { ui: { header: SomeComponent }, themeStylesheet: 'theme.css', headless: false, appComponent: SomeComponent };

        expect(describeDeprecatedOptions(config, 'prism.config.ts')).toEqual(
            ['ui', 'themeStylesheet', 'headless', 'appComponent'].map(
                (option) => `prism.config.ts sets "${option}", which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.`
            )
        );
    });

    it("names a plugin's wrapComponent and the panels that set position", () => {
        const plugin: NgPrismPlugin = {
            name: 'legacy',
            wrapComponent: SomeComponent,
            panels: [
                { id: 'a', label: 'A', position: 'bottom' },
                { id: 'b', label: 'B' }
            ]
        };

        expect(describeDeprecatedOptions({ plugins: [plugin] }, 'ng-prism.config.ts')).toEqual([
            'plugin "legacy" sets wrapComponent, which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.',
            'plugin "legacy" sets position on panel "a", which is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.'
        ]);
    });

    it('names every deprecated theme token an override sets, with what replaces it', () => {
        const config: NgPrismConfig = {
            theme: { '--prism-mark-critical': '#dc2626', '--prism-primary': '#e11d48' },
            darkTheme: { '--prism-spectrum': 'linear-gradient(red, blue)' }
        };

        expect(describeDeprecatedOptions(config, 'ng-prism.config.ts')).toEqual([
            'ng-prism.config.ts sets --prism-mark-critical in "theme": --prism-mark-critical is deprecated since 22.7.0 and will be removed in 23.0.0. Until then its value is carried over to --prism-danger; override --prism-danger instead.',
            'ng-prism.config.ts sets --prism-spectrum in "darkTheme": --prism-spectrum is deprecated since 22.7.0 and will be removed in 23.0.0. Nothing reads it any more; override --prism-brand-gradient instead.'
        ]);
    });
});
