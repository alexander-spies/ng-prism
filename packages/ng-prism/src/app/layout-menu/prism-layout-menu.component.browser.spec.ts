import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { PrismMobileLayoutService } from '../services/prism-mobile-layout.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismLayoutMenuComponent } from './prism-layout-menu.component.js';

/** Classic-decorator doubles for children with signal inputs (see `prism-variant-ribbon.component.browser.spec.ts`). */
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

async function readAppResource(url: string): Promise<string> {
    const name = basename(url);
    const appRoot = join(__dirname, '..');
    const entries = await readdir(appRoot, { recursive: true });
    const match = entries.find((entry) => basename(entry) === name);

    if (!match) throw new Error(`Resource not found under ${appRoot}: ${url}`);
    return readFile(join(appRoot, match), 'utf-8');
}

describe('PrismLayoutMenuComponent', () => {
    async function openMenu(mobile: boolean): Promise<ComponentFixture<PrismLayoutMenuComponent>> {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PrismMobileLayoutService, useValue: { mobile: signal(mobile) } },
                { provide: PRISM_CONFIG, useValue: { buildInfo: { version: '1.2.0', gitHash: 'abcdef123456' } } }
            ]
        });
        await resolveComponentResources(readAppResource);
        const fixture = TestBed.createComponent(PrismLayoutMenuComponent);

        fixture.detectChanges();
        (fixture.nativeElement.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        return fixture;
    }

    function labels(fixture: ComponentFixture<PrismLayoutMenuComponent>): string[] {
        return [...fixture.nativeElement.querySelectorAll('[role="menu"] button')].map((b: Element) => b.querySelector('.layout-menu__label')?.textContent?.trim() ?? '');
    }

    function buildInfo(fixture: ComponentFixture<PrismLayoutMenuComponent>): string | null {
        return fixture.nativeElement.querySelector('.layout-menu__info')?.textContent?.trim() ?? null;
    }

    afterEach(() => localStorage.clear());

    it('offers the three layout switches on the desktop layout, and nothing else', async () => {
        const fixture = await openMenu(false);

        expect(labels(fixture)).toEqual(['Show sidebar', 'Show variant rail', 'Show addons panel']);
        expect(buildInfo(fixture)).toBeNull();
    });

    it('drops the sidebar switch on a phone, where ☰ opens the navigation', async () => {
        const fixture = await openMenu(true);

        expect(labels(fixture)).not.toContain('Show sidebar');
        expect(labels(fixture)).toContain('Show variant rail');
        expect(labels(fixture)).toContain('Show addons panel');
    });

    it('takes over the theme switch on a phone', async () => {
        const fixture = await openMenu(true);
        const theme = TestBed.inject(PrismThemeService);
        const toggle = jest.spyOn(theme, 'toggle');
        const item = [...fixture.nativeElement.querySelectorAll('[role="menu"] button')].find((b: Element) => b.textContent?.includes('Switch to light mode')) as
            HTMLButtonElement | undefined;

        expect(theme.isDark()).toBe(true);
        expect(item).toBeDefined();
        item?.click();
        expect(toggle).toHaveBeenCalledTimes(1);
    });

    it('shows the build info on a phone', async () => {
        const fixture = await openMenu(true);

        expect(buildInfo(fixture)).toBe('v1.2.0 · abcdef1');
    });
});
