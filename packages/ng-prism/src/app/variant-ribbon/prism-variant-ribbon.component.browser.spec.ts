import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ApplicationRef, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { ShowcaseState, Variant } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPseudoStateService } from '../services/prism-pseudo-state.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismVariantRibbonComponent } from './prism-variant-ribbon.component.js';

/**
 * Classic-decorator doubles for the ribbon's children, whose signal inputs the
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

jest.mock('../shared/prism-tabs.component.js', () => {
    const { Component, EventEmitter, Input, Output } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'prism-tabs', standalone: true, template: '' })
    class MockPrismTabsComponent {
        @Input() items: unknown[] = [];
        @Input() active: string | null = null;
        @Input() ariaLabel: string | null = null;
        @Output() activeChange = new EventEmitter<string | null>();
    }

    return { PrismTabsComponent: MockPrismTabsComponent };
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

const TWO_VARIANTS: Variant[] = [{ name: 'Primary' }, { name: 'Secondary' }];

function createComponent(variants: Variant[] | undefined): RuntimeComponent {
    return {
        type: class {} as unknown as RuntimeComponent['type'],
        meta: {
            className: 'Comp',
            filePath: '/test.ts',
            showcaseConfig: { title: 'Test', variants, states: STATES },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'test', standalone: true, isDirective: false }
        }
    };
}

describe('PrismVariantRibbonComponent', () => {
    let renderer: PrismRendererService;
    let pseudoState: PrismPseudoStateService;

    /** `null` renders a component that declares no `variants`. */
    async function render(variants: Variant[] | null = TWO_VARIANTS): Promise<ComponentFixture<PrismVariantRibbonComponent>> {
        const comp = createComponent(variants ?? undefined);

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [{ provide: PRISM_MANIFEST, useValue: { components: [comp] } }] });
        await resolveComponentResources(readAppResource);
        renderer = TestBed.inject(PrismRendererService);
        pseudoState = TestBed.inject(PrismPseudoStateService);
        TestBed.inject(PrismNavigationService).select(comp);
        TestBed.inject(ApplicationRef).tick();

        const fixture = TestBed.createComponent(PrismVariantRibbonComponent);

        fixture.detectChanges();
        return fixture;
    }

    function chip(fixture: ComponentFixture<PrismVariantRibbonComponent>): HTMLButtonElement | null {
        return fixture.nativeElement.querySelector('.variant-ribbon-state');
    }

    it('shows no state chip while no state is active', async () => {
        const fixture = await render();

        expect(fixture.nativeElement.querySelector('prism-tabs')).not.toBeNull();
        expect(chip(fixture)).toBeNull();
    });

    it('shows the active state as a button that names what it clears', async () => {
        const fixture = await render();

        renderer.selectState(1);
        fixture.detectChanges();

        const button = chip(fixture);

        expect(button?.tagName).toBe('BUTTON');
        expect(button?.getAttribute('type')).toBe('button');
        expect(button?.textContent?.trim()).toBe('Focus visible');
        expect(button?.getAttribute('aria-label')).toBe('Clear state Focus visible');
    });

    it('clears the state when the chip is clicked', async () => {
        const fixture = await render();

        renderer.selectState(1);
        fixture.detectChanges();
        chip(fixture)?.click();
        fixture.detectChanges();

        expect(renderer.activeStateIndex()).toBeNull();
        expect(chip(fixture)).toBeNull();
    });

    it('drops the chip with the state when the next variant is picked', async () => {
        const fixture = await render();

        renderer.selectState(0);
        fixture.detectChanges();
        fixture.nativeElement.querySelector('button[aria-label="Next variant"]').click();
        fixture.detectChanges();

        expect(renderer.activeVariantIndex()).toBe(1);
        expect(chip(fixture)).toBeNull();
    });

    // The Playground already names the state as not applicable there; a chip would claim it is shown.
    it('shows no chip on a variant that opted out with states: false', async () => {
        const fixture = await render([{ name: 'Full width', states: false }]);

        renderer.selectState(1);
        fixture.detectChanges();

        expect(renderer.activeStateIndex()).toBe(1);
        expect(chip(fixture)).toBeNull();
    });

    it('marks a state that does not fit the variant and says why', async () => {
        const fixture = await render();

        renderer.selectState(1);
        pseudoState.canvasFit.set({ fits: false, reason: '.x matches nothing' });
        fixture.detectChanges();

        expect(chip(fixture)?.classList).toContain('is-na');
        expect(chip(fixture)?.getAttribute('title')).toBe('Clear state Focus visible (not applied: .x matches nothing)');
    });

    // Without variants the ribbon has no tabs and stays away, unless it has a state to show.
    it('shows the chip alone for a component without variants', async () => {
        const fixture = await render(null);

        expect(fixture.nativeElement.querySelector('.variant-ribbon')).toBeNull();

        renderer.selectState(0);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('prism-tabs')).toBeNull();
        expect(fixture.nativeElement.querySelector('button[aria-label="Next variant"]')).toBeNull();
        expect(chip(fixture)?.textContent?.trim()).toBe('Hover');
    });
});
