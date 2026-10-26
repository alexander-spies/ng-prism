import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ApplicationRef, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { ShowcaseState } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPseudoStateService } from '../services/prism-pseudo-state.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismCanvasToolbarComponent } from './prism-canvas-toolbar.component.js';

/**
 * Classic-decorator doubles for the rail's children, whose signal inputs the
 * JIT compiler of these specs cannot see (see `project_jit_test_limitation`
 * and `prism-canvas-pin-row.component.browser.spec.ts`). `jest.mock` is hoisted
 * above the imports, so the factories `require` what they need.
 */
jest.mock('../icons/prism-icon.component.js', () => {
    const { Component, Input } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'prism-icon', standalone: true, template: '' })
    class MockPrismIconComponent {
        @Input() name = '';
        @Input() size = 16;
    }

    return { PrismIconComponent: MockPrismIconComponent };
});

jest.mock('../shared/prism-icon-button.component.js', () => {
    const { Component, Input } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'button[prismIconButton]', standalone: true, template: '<ng-content />' })
    class MockPrismIconButtonComponent {
        @Input() size = 'md';
        @Input() pressed: boolean | null = null;
    }

    return { PrismIconButtonComponent: MockPrismIconButtonComponent };
});

/** Finds a `templateUrl`/`styleUrl` anywhere under `src/app`, since each component resolves it against its own folder. */
async function readAppResource(url: string): Promise<string> {
    const name = basename(url);
    const appRoot = join(__dirname, '..');
    const entries = await readdir(appRoot, { recursive: true });
    const match = entries.find((entry) => basename(entry) === name);

    if (!match) throw new Error(`Resource not found under ${appRoot}: ${url}`);
    return readFile(join(appRoot, match), 'utf-8');
}

const STATES: ShowcaseState[] = [
    { name: 'Hover', pseudo: { hover: true } },
    { name: 'Focus visible', pseudo: { 'focus-visible': '.x' } }
];

const COMP: RuntimeComponent = {
    type: class {} as unknown as RuntimeComponent['type'],
    meta: {
        className: 'Comp',
        filePath: '/test.ts',
        showcaseConfig: { title: 'Test', variants: [{ name: 'Primary' }, { name: 'Secondary' }], states: STATES },
        inputs: [],
        outputs: [],
        componentMeta: { selector: 'test', standalone: true, isDirective: false }
    }
};

describe('PrismCanvasToolbarComponent: tools menu trigger', () => {
    let fixture: ComponentFixture<PrismCanvasToolbarComponent>;
    let renderer: PrismRendererService;
    let pseudoState: PrismPseudoStateService;

    beforeEach(async () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [{ provide: PRISM_MANIFEST, useValue: { components: [COMP] } }] });
        await resolveComponentResources(readAppResource);
        renderer = TestBed.inject(PrismRendererService);
        pseudoState = TestBed.inject(PrismPseudoStateService);
        TestBed.inject(PrismNavigationService).select(COMP);
        TestBed.inject(ApplicationRef).tick();

        fixture = TestBed.createComponent(PrismCanvasToolbarComponent);
        fixture.detectChanges();
    });

    /** Runs the effects too: the pseudo-state service clears its toggles in one. */
    function settle(): void {
        TestBed.inject(ApplicationRef).tick();
        fixture.detectChanges();
    }

    function trigger(): HTMLButtonElement {
        return fixture.nativeElement.querySelector('button[popovertarget="prism-tools"]');
    }

    function dot(): Element | null {
        return trigger().querySelector('.prism-toolrail__dot');
    }

    it('carries no indicator while the menu holds nothing', () => {
        expect(dot()).toBeNull();
        expect(trigger().getAttribute('aria-label')).toBe('Canvas, state, zoom and width');
        expect(trigger().getAttribute('title')).toBe('Canvas, state, zoom and width');
    });

    it('marks an active state, and names it', () => {
        renderer.selectState(1);
        settle();

        expect(dot()).not.toBeNull();
        expect(trigger().getAttribute('aria-label')).toBe('Canvas, state, zoom and width (Focus visible active)');
    });

    it('marks a forced pseudo state', () => {
        pseudoState.toggle('hover');
        settle();

        expect(dot()).not.toBeNull();
        expect(trigger().getAttribute('aria-label')).toBe('Canvas, state, zoom and width (pseudo states toggled)');
    });

    it('names both when a state and a toggle are set', () => {
        renderer.selectState(0);
        settle();
        pseudoState.toggle('active');
        settle();

        expect(trigger().getAttribute('aria-label')).toBe('Canvas, state, zoom and width (Hover active, pseudo states toggled)');
    });

    it('drops the indicator when the variant change clears the state and the toggles', () => {
        renderer.selectState(1);
        settle();
        pseudoState.toggle('hover');
        settle();
        expect(dot()).not.toBeNull();

        renderer.selectVariant(1);
        settle();

        expect(dot()).toBeNull();
        expect(trigger().getAttribute('aria-label')).toBe('Canvas, state, zoom and width');
    });
});
