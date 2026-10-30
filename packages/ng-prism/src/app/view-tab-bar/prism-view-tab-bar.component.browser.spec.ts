import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { PrismHeadCompactState } from '../component-head/head-compact.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismViewTabBarComponent } from './prism-view-tab-bar.component.js';

/** Classic-decorator doubles for children with signal inputs (see `prism-variant-ribbon.component.browser.spec.ts`). */
jest.mock('../shared/prism-segmented.component.js', () => {
    const { Component, EventEmitter, Input, Output } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'prism-segmented', standalone: true, template: '' })
    class MockPrismSegmentedComponent {
        @Input() options: unknown[] = [];
        @Input() value: string | null = null;
        @Input() ariaLabel: string | null = null;
        @Output() valueChange = new EventEmitter<string | null>();
    }

    return { PrismSegmentedComponent: MockPrismSegmentedComponent };
});

jest.mock('../icons/prism-icon.component.js', () => {
    const { Component, Input } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'prism-icon', standalone: true, template: '' })
    class MockPrismIconComponent {
        @Input() name = '';
        @Input() size = 16;
    }

    return { PrismIconComponent: MockPrismIconComponent };
});

async function readAppResource(url: string): Promise<string> {
    const name = basename(url);
    const appRoot = join(__dirname, '..');
    const entries = await readdir(appRoot, { recursive: true });
    const match = entries.find((entry) => basename(entry) === name);

    if (!match) throw new Error(`Resource not found under ${appRoot}: ${url}`);
    return readFile(join(appRoot, match), 'utf-8');
}

const API: PanelDefinition = { id: 'jsdoc', label: 'API', placement: 'view' };

describe('PrismViewTabBarComponent', () => {
    const activeViewId = signal('renderer');

    async function render(compact: boolean | null): Promise<ComponentFixture<PrismViewTabBarComponent>> {
        activeViewId.set('renderer');
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PrismPanelService, useValue: { visibleViewPanels: signal([API]), activeViewId } },
                { provide: PrismNavigationService, useValue: { activeTarget: signal('component') } },
                ...(compact === null ? [] : [{ provide: PrismHeadCompactState, useValue: { compact: signal(compact) } }])
            ]
        });
        await resolveComponentResources(readAppResource);
        const fixture = TestBed.createComponent(PrismViewTabBarComponent);

        fixture.detectChanges();
        return fixture;
    }

    function trigger(fixture: ComponentFixture<PrismViewTabBarComponent>): HTMLButtonElement | null {
        return fixture.nativeElement.querySelector('button[aria-haspopup="menu"]');
    }

    function items(fixture: ComponentFixture<PrismViewTabBarComponent>): HTMLButtonElement[] {
        return [...fixture.nativeElement.querySelectorAll('[role="menu"] [role="menuitemradio"]')];
    }

    it('keeps the segmented switcher while the head has room', async () => {
        const fixture = await render(false);

        expect(fixture.nativeElement.querySelector('prism-segmented')).not.toBeNull();
        expect(trigger(fixture)).toBeNull();
    });

    it('keeps the segmented switcher outside a component head', async () => {
        const fixture = await render(null);

        expect(fixture.nativeElement.querySelector('prism-segmented')).not.toBeNull();
        expect(trigger(fixture)).toBeNull();
    });

    it('turns into a menu named after the active view in a compact head', async () => {
        const fixture = await render(true);

        expect(fixture.nativeElement.querySelector('prism-segmented')).toBeNull();
        expect(trigger(fixture)?.textContent?.trim()).toBe('Playground');
        expect(items(fixture).map((item) => [item.textContent?.trim(), item.getAttribute('aria-checked')])).toEqual([
            ['Playground', 'true'],
            ['API', 'false']
        ]);
    });

    it('switches the view from the menu', async () => {
        const fixture = await render(true);

        items(fixture)[1].click();
        fixture.detectChanges();

        expect(activeViewId()).toBe('jsdoc');
        expect(trigger(fixture)?.textContent?.trim()).toBe('API');
    });

    /** The visible text is only the view's name; the accessible name says what the button switches. */
    it('names the menu trigger after what it switches', async () => {
        const fixture = await render(true);

        expect(trigger(fixture)?.getAttribute('aria-label')).toBe('View: Playground');

        items(fixture)[1].click();
        fixture.detectChanges();

        expect(trigger(fixture)?.getAttribute('aria-label')).toBe('View: API');
    });
});
