import { layoutShortcut } from './layout-shortcut.js';

const key = (code: string, altKey = true) => ({ code, altKey });

describe('layoutShortcut', () => {
    it('maps Alt+S, Alt+T and Alt+A on the desktop layout', () => {
        expect(layoutShortcut(key('KeyS'), false)).toBe('sidebar');
        expect(layoutShortcut(key('KeyT'), false)).toBe('toolbar');
        expect(layoutShortcut(key('KeyA'), false)).toBe('addons');
    });

    /** The phone layout has no sidebar column; toggling it would only change the stored desktop layout. */
    it('ignores Alt+S in the phone layout', () => {
        expect(layoutShortcut(key('KeyS'), true)).toBeNull();
    });

    it('keeps the other two in the phone layout', () => {
        expect(layoutShortcut(key('KeyT'), true)).toBe('toolbar');
        expect(layoutShortcut(key('KeyA'), true)).toBe('addons');
    });

    it('ignores the letters without Alt and other keys with it', () => {
        expect(layoutShortcut(key('KeyS', false), false)).toBeNull();
        expect(layoutShortcut(key('KeyX'), false)).toBeNull();
    });
});
