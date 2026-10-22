import { PANEL_HEIGHT, PrismLayoutService, SIDEBAR_WIDTH } from './prism-layout.service.js';

const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

function createService(): PrismLayoutService {
    return new PrismLayoutService();
}

describe('PrismLayoutService', () => {
    beforeEach(() => localStorage.clear());

    it('should default to all panels visible', () => {
        const s = createService();

        expect(s.sidebarVisible()).toBe(true);
        expect(s.addonsVisible()).toBe(true);
        expect(s.toolbarVisible()).toBe(true);
    });

    it('should toggle sidebar', () => {
        const s = createService();

        s.toggleSidebar();
        expect(s.sidebarVisible()).toBe(false);
        s.toggleSidebar();
        expect(s.sidebarVisible()).toBe(true);
    });

    it('should toggle addons', () => {
        const s = createService();

        s.toggleAddons();
        expect(s.addonsVisible()).toBe(false);
    });

    it('should toggle toolbar', () => {
        const s = createService();

        s.toggleToolbar();
        expect(s.toolbarVisible()).toBe(false);
    });

    it('should default to bottom orientation', () => {
        const s = createService();

        expect(s.addonsOrientation()).toBe('bottom');
    });

    it('should cycle orientation between bottom and right', () => {
        const s = createService();

        s.toggleOrientation();
        expect(s.addonsOrientation()).toBe('right');
        s.toggleOrientation();
        expect(s.addonsOrientation()).toBe('bottom');
    });

    /**
     * One set of bounds for drag, keyboard and restore. The resizer directive
     * and the service used to clamp to different ranges, so a width restored
     * from storage could sit where no drag could have put it.
     */
    it('declares one set of bounds and defaults for the two resizable regions', () => {
        expect(SIDEBAR_WIDTH).toEqual({ min: 200, max: 360, default: 280 });
        expect(PANEL_HEIGHT).toEqual({ min: 200, max: 560, default: 300 });
    });

    it('should clamp sidebar width to its bounds', () => {
        const s = createService();

        expect(s.sidebarWidth()).toBe(280);
        s.setSidebarWidth(50);
        expect(s.sidebarWidth()).toBe(200);
        s.setSidebarWidth(9999);
        expect(s.sidebarWidth()).toBe(360);
        s.setSidebarWidth(320);
        expect(s.sidebarWidth()).toBe(320);
    });

    it('should clamp panel height to its bounds', () => {
        const s = createService();

        expect(s.panelHeight()).toBe(300);
        s.setPanelHeight(20);
        expect(s.panelHeight()).toBe(200);
        s.setPanelHeight(9999);
        expect(s.panelHeight()).toBe(560);
    });

    it('should keep working when storage refuses to write', () => {
        const s = createService();
        const setItem = localStorage.setItem;

        localStorage.setItem = () => {
            throw new Error('QuotaExceededError');
        };
        try {
            expect(() => s.setSidebarWidth(300)).not.toThrow();
            expect(s.sidebarWidth()).toBe(300);
        } finally {
            localStorage.setItem = setItem;
        }
    });

    it('should clamp panel width to [200, 600]', () => {
        const s = createService();

        s.setPanelWidth(50);
        expect(s.panelWidth()).toBe(200);
        s.setPanelWidth(9999);
        expect(s.panelWidth()).toBe(600);
    });

    it('should persist state to localStorage on mutation', () => {
        const s = createService();

        s.toggleSidebar();
        s.setSidebarWidth(340);
        const stored = JSON.parse(localStorage.getItem('ng-prism-layout')!);

        expect(stored.sidebarVisible).toBe(false);
        expect(stored.sidebarWidth).toBe(340);
    });

    it('should restore state from localStorage on construction', () => {
        localStorage.setItem(
            'ng-prism-layout',
            JSON.stringify({
                sidebarVisible: false,
                sidebarWidth: 360,
                addonsOrientation: 'right'
            })
        );
        const s = createService();

        expect(s.sidebarVisible()).toBe(false);
        expect(s.sidebarWidth()).toBe(360);
        expect(s.addonsOrientation()).toBe('right');
    });

    it('should ignore malformed localStorage data', () => {
        localStorage.setItem('ng-prism-layout', 'not-json');
        expect(() => createService()).not.toThrow();
    });
});
