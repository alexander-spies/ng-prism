import { TestBed } from '@angular/core/testing';
import { MOBILE_ATTRIBUTE, MOBILE_MEDIA_QUERY, NAV_TOGGLE_ID } from './mobile-layout.js';
import { PrismMobileLayoutService } from './prism-mobile-layout.service.js';

/** A `MediaQueryList` whose `matches` the test flips, notifying its `change` listeners like a real one. */
function installMatchMedia(matches: boolean) {
    const listeners = new Set<(event: { matches: boolean }) => void>();
    const query = {
        matches,
        media: '',
        addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
        flip(next: boolean) {
            query.matches = next;
            listeners.forEach((listener) => listener({ matches: next }));
        }
    };
    const matchMedia = jest.fn((media: string) => {
        query.media = media;
        return query;
    });

    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia });
    return { query, matchMedia };
}

function setHeight(px: number): void {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: px });
}

function create(): PrismMobileLayoutService {
    const service = TestBed.inject(PrismMobileLayoutService);

    TestBed.tick();
    return service;
}

describe('PrismMobileLayoutService', () => {
    beforeEach(() => setHeight(844));

    afterEach(() => {
        TestBed.resetTestingModule();
        document.documentElement.removeAttribute(MOBILE_ATTRIBUTE);
        document.body.innerHTML = '';
        delete (window as { matchMedia?: unknown }).matchMedia;
        jest.restoreAllMocks();
    });

    it('should ask for the one breakpoint definition', () => {
        const { matchMedia } = installMatchMedia(false);

        create();

        expect(matchMedia).toHaveBeenCalledWith(MOBILE_MEDIA_QUERY);
    });

    it('should mirror the breakpoint onto the root element', () => {
        const { query } = installMatchMedia(true);
        const service = create();

        expect(service.mobile()).toBe(true);
        expect(document.documentElement.hasAttribute(MOBILE_ATTRIBUTE)).toBe(true);

        query.flip(false);
        TestBed.tick();

        expect(service.mobile()).toBe(false);
        expect(document.documentElement.hasAttribute(MOBILE_ATTRIBUTE)).toBe(false);
    });

    it('should start with the panel folded away on a short screen', () => {
        setHeight(430);
        installMatchMedia(true);

        expect(create().panelCollapsed()).toBe(true);
    });

    it('should start with the panel open on a tall screen', () => {
        installMatchMedia(true);

        expect(create().panelCollapsed()).toBe(false);
    });

    it('should fold the panel away when a short screen switches to the phone layout', () => {
        setHeight(430);
        const { query } = installMatchMedia(false);
        const service = create();

        query.flip(true);
        TestBed.tick();

        expect(service.panelCollapsed()).toBe(true);
    });

    it('should close the navigation when the desktop layout returns', () => {
        const { query } = installMatchMedia(true);
        const service = create();

        service.toggleNav();
        expect(service.navOpen()).toBe(true);

        query.flip(false);
        TestBed.tick();

        expect(service.navOpen()).toBe(false);
    });

    /** The ☰ button that held focus disappears with the phone layout; the desktop sidebar takes focus over. */
    it('should hand focus over to the desktop sidebar when the layout switches with the navigation open', () => {
        const { query } = installMatchMedia(true);
        const service = create();

        service.toggleNav();
        query.flip(false);
        TestBed.tick();

        expect(service.takeFocusHandoff()).toBe(true);
        expect(service.takeFocusHandoff()).toBe(false);
    });

    it('should not take focus anywhere when the layout switches with the navigation closed', () => {
        const { query } = installMatchMedia(true);
        const service = create();

        query.flip(false);
        TestBed.tick();

        expect(service.takeFocusHandoff()).toBe(false);
    });

    it('should hand focus back to the toggle when the navigation closes', () => {
        installMatchMedia(true);
        const toggle = document.createElement('button');

        toggle.id = NAV_TOGGLE_ID;
        document.body.appendChild(toggle);
        const service = create();

        service.toggleNav();
        service.closeNav();

        expect(service.navOpen()).toBe(false);
        expect(document.activeElement).toBe(toggle);
    });

    /** iOS Safari does not focus a tapped button, so the toggle, now ✕, would otherwise not hold focus while the list is open. */
    it('should put focus on the toggle when the navigation opens', () => {
        installMatchMedia(true);
        const toggle = document.createElement('button');

        toggle.id = NAV_TOGGLE_ID;
        document.body.appendChild(toggle);
        const service = create();

        service.toggleNav();

        expect(service.navOpen()).toBe(true);
        expect(document.activeElement).toBe(toggle);
    });

    it('should keep a dragged height and open the panel', () => {
        installMatchMedia(true);
        const service = create();

        service.onPanelTab('controls', 'controls');
        service.setPanelHeight(500);

        expect(service.panelHeight()).toBe(500);
        expect(service.panelCollapsed()).toBe(false);
    });

    it('should clamp a dragged height when the phone turns', () => {
        installMatchMedia(true);
        const service = create();

        service.setPanelHeight(500);
        setHeight(390);
        window.dispatchEvent(new Event('resize'));

        expect(service.viewportHeight()).toBe(390);
        expect(service.panelHeight()).toBe(292);
    });

    /** Review Focus 2: dragged to the top, then turned, the canvas still has its 96px. */
    it('should keep the canvas visible when the phone turns after a drag to the top', () => {
        installMatchMedia(true);
        const service = create();

        service.setPanelSpace(708);
        service.setPanelHeight(10_000);
        expect(service.panelHeight()).toBe(612);

        setHeight(390);
        window.dispatchEvent(new Event('resize'));
        service.setPanelSpace(254);

        expect(service.panelHeight()).toBe(158);
        expect(254 - service.panelHeight()).toBeGreaterThanOrEqual(96);
    });

    it('should fold and unfold the panel on a tap of the active tab', () => {
        installMatchMedia(true);
        const service = create();

        service.onPanelTab('controls', 'controls');
        expect(service.panelCollapsed()).toBe(true);

        service.onPanelTab('controls', 'controls');
        expect(service.panelCollapsed()).toBe(false);
    });

    it('should open a folded panel on a tap of another tab', () => {
        installMatchMedia(true);
        const service = create();

        service.onPanelTab('controls', 'controls');
        service.onPanelTab('events', 'controls');

        expect(service.panelCollapsed()).toBe(false);
    });

    it('should open a folded panel on request', () => {
        installMatchMedia(true);
        const service = create();

        service.onPanelTab('controls', 'controls');
        service.expandPanel();

        expect(service.panelCollapsed()).toBe(false);
    });

    it('should never write to localStorage', () => {
        const setItem = jest.spyOn(Storage.prototype, 'setItem');

        installMatchMedia(true);
        const service = create();

        service.toggleNav();
        service.closeNav();
        service.setPanelHeight(400);
        service.onPanelTab('controls', 'controls');
        TestBed.tick();

        expect(setItem).not.toHaveBeenCalled();
    });

    it('should stay on the desktop layout where matchMedia does not exist', () => {
        expect(() => create()).not.toThrow();
        expect(TestBed.inject(PrismMobileLayoutService).mobile()).toBe(false);
    });
});
