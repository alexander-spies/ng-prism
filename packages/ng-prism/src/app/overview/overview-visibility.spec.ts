import type { Type } from '@angular/core';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { overviewCellCount, showsOverview } from './overview-visibility.js';

function makeComp(config: Partial<ShowcaseConfig> = {}): RuntimeComponent {
    return {
        type: class {} as Type<unknown>,
        meta: {
            className: 'ButtonComponent',
            filePath: '/button.ts',
            showcaseConfig: { title: 'Button', ...config },
            inputs: [],
            outputs: [],
            componentMeta: {
                selector: 'lib-button',
                standalone: true,
                isDirective: false
            }
        }
    };
}

describe('showsOverview', () => {
    it('is false when the component declares no variants', () => {
        expect(showsOverview(makeComp())).toBe(false);
    });

    it('is false for a single variant, since one cell says nothing', () => {
        const comp = makeComp({ variants: [{ name: 'Default' }] });

        expect(showsOverview(comp)).toBe(false);
    });

    it('is true from two variants on', () => {
        const comp = makeComp({
            variants: [{ name: 'Primary' }, { name: 'Secondary' }]
        });

        expect(showsOverview(comp)).toBe(true);
    });

    it('shows the Overview for one variant with a state', () => {
        const comp = makeComp({
            variants: [{ name: 'Default' }],
            states: [{ name: 'Hover', pseudo: { hover: true } }]
        });

        expect(showsOverview(comp)).toBe(true);
    });

    it('is false for a renderPage component regardless of variant count', () => {
        const comp = makeComp({
            renderPage: 'Button Patterns',
            variants: [{ name: 'Primary' }, { name: 'Secondary' }]
        });

        expect(showsOverview(comp)).toBe(false);
    });
});

describe('overviewCellCount', () => {
    it('counts one variant with one state as two cells', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            variants: [{ name: 'Default' }],
            states: [{ name: 'Hover', pseudo: { hover: true } }]
        };

        expect(overviewCellCount(config)).toBe(2);
    });

    it('counts an opted-out variant once', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            variants: [{ name: 'Primary' }, { name: 'Ghost', states: false }],
            states: [
                { name: 'Hover', pseudo: { hover: true } },
                { name: 'Focus', pseudo: { focus: true } }
            ]
        };

        expect(overviewCellCount(config)).toBe(4);
    });

    it('counts the implicit Default row when there are states but no variants', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            states: [
                { name: 'Hover', pseudo: { hover: true } },
                { name: 'Focus', pseudo: { focus: true } }
            ]
        };

        expect(overviewCellCount(config)).toBe(3);
    });

    it('counts one cell for a component without variants and states', () => {
        expect(overviewCellCount({ title: 'Button' })).toBe(1);
    });

    it('counts the variants alone when there are no states', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            variants: [{ name: 'Primary' }, { name: 'Secondary' }, { name: 'Ghost' }]
        };

        expect(overviewCellCount(config)).toBe(3);
    });
});
