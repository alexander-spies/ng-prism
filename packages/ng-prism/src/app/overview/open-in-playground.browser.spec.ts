import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ShowcaseState } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { openInPlayground } from './open-in-playground.js';

const STATES: ShowcaseState[] = [
    { name: 'Hover', pseudo: { hover: true } },
    { name: 'Focus visible', pseudo: { 'focus-visible': true } }
];

function createComponent(): RuntimeComponent {
    return {
        type: class {} as unknown as RuntimeComponent['type'],
        meta: {
            className: 'Comp',
            filePath: '/test.ts',
            showcaseConfig: { title: 'Test', variants: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], states: STATES },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'test', standalone: true, isDirective: false }
        }
    };
}

/** The real renderer service, so the reset `selectVariant()` does is part of what these tests see. */
function setup() {
    const comp = createComponent();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PRISM_MANIFEST, useValue: { components: [comp] } }] });

    const renderer = TestBed.inject(PrismRendererService);

    TestBed.inject(PrismNavigationService).select(comp);
    TestBed.inject(ApplicationRef).tick();

    return { renderer, panels: { activeViewId: signal('overview') } };
}

describe('openInPlayground with the renderer service', () => {
    it('shows exactly the cell: its variant in its state', () => {
        const { renderer, panels } = setup();

        openInPlayground(renderer, panels, 2, 1);

        expect(renderer.activeVariantIndex()).toBe(2);
        expect(renderer.activeStateIndex()).toBe(1);
        expect(panels.activeViewId()).toBe('renderer');
    });

    it('replaces a state the Playground held with the one of the cell', () => {
        const { renderer, panels } = setup();

        renderer.selectState(0);
        openInPlayground(renderer, panels, 1, null);

        expect(renderer.activeVariantIndex()).toBe(1);
        expect(renderer.activeStateIndex()).toBeNull();
    });

    // The cell meant this combination, not this state on every variant.
    it('lets the next variant change clear the state of the cell', () => {
        const { renderer, panels } = setup();

        openInPlayground(renderer, panels, 2, 1);
        renderer.selectVariant(0);

        expect(renderer.activeVariantIndex()).toBe(0);
        expect(renderer.activeStateIndex()).toBeNull();
    });
});
