import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PrismMobileLayoutService } from '../../services/prism-mobile-layout.service.js';
import { PrismPanelService } from '../../services/prism-panel.service.js';
import { PRISM_MANIFEST } from '../../tokens/prism-tokens.js';
import { PrismPanelHostComponent } from './prism-panel-host.component.js';

/** A classic-decorator double for the tab bar, whose signal inputs the JIT compiler of these specs cannot see. */
jest.mock('../../shared/prism-tabs.component.js', () => {
    const { Component, EventEmitter, Input, Output } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'prism-tabs', standalone: true, template: '' })
    class MockPrismTabsComponent {
        @Input() items: unknown[] = [];
        @Input() active: string | null = null;
        @Input() ariaLabel: string | null = null;
        @Input() panelIdPrefix: string | null = null;
        @Output() activeChange = new EventEmitter<string | null>();
        @Output() tabClick = new EventEmitter<string>();
    }

    return { PrismTabsComponent: MockPrismTabsComponent };
});

async function readAppResource(url: string): Promise<string> {
    const name = basename(url);
    const appRoot = join(__dirname, '..', '..');
    const entries = await readdir(appRoot, { recursive: true });
    const match = entries.find((entry) => basename(entry) === name);

    if (!match) throw new Error(`Resource not found under ${appRoot}: ${url}`);
    return readFile(join(appRoot, match), 'utf-8');
}

describe('PrismPanelHostComponent: folding on a phone', () => {
    let fixture: ComponentFixture<PrismPanelHostComponent>;
    let mobileLayout: { mobile: ReturnType<typeof signal<boolean>>; panelCollapsed: ReturnType<typeof signal<boolean>>; onPanelTab: jest.Mock; expandPanel: jest.Mock };

    beforeEach(async () => {
        mobileLayout = { mobile: signal(true), panelCollapsed: signal(true), onPanelTab: jest.fn(), expandPanel: jest.fn() };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PRISM_MANIFEST, useValue: { components: [] } },
                { provide: PrismMobileLayoutService, useValue: mobileLayout }
            ]
        });
        await resolveComponentResources(readAppResource);
        // No panel by that id: the host renders none, which these tests do not need.
        TestBed.inject(PrismPanelService).activePanelId.set('none');
        fixture = TestBed.createComponent(PrismPanelHostComponent);
        fixture.detectChanges();
    });

    function tabs(): { activeChange: { emit(id: string | null): void }; tabClick: { emit(id: string): void } } {
        return fixture.debugElement.query(By.css('prism-tabs')).componentInstance;
    }

    it('hands a click on a tab to the phone layout, with the tab that was active', () => {
        tabs().tabClick.emit('controls');

        expect(mobileLayout.onPanelTab).toHaveBeenCalledWith('controls', 'none');
    });

    /** Arrow keys select a tab without a click: activeChange is all the tab bar reports. */
    it('opens a folded panel when another tab becomes active by keyboard', () => {
        tabs().activeChange.emit('events');

        expect(mobileLayout.expandPanel).toHaveBeenCalled();
    });

    it('leaves the desktop layout alone', () => {
        mobileLayout.mobile.set(false);
        tabs().tabClick.emit('controls');
        tabs().activeChange.emit('events');

        expect(mobileLayout.onPanelTab).not.toHaveBeenCalled();
        expect(mobileLayout.expandPanel).not.toHaveBeenCalled();
    });
});
