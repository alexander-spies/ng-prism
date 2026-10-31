import { panelSpace } from './panel-space.js';

/** jsdom lays nothing out, so every box gets the height the test gives it. */
function box(className: string, height: number): HTMLElement {
    const el = document.createElement('div');

    el.className = className;
    el.getBoundingClientRect = () => ({ height }) as DOMRect;
    return el;
}

describe('panelSpace', () => {
    it('should give the canvas and the panel what the head and the rail leave of the main area', () => {
        const main = box('prism-main', 708);

        main.append(box('comp-head-host', 44), box('variant-ribbon-host', 44), box('prism-canvas-wrap', 300), box('prism-resizer-row', 0), box('prism-main__panel', 320));

        expect(panelSpace(main)).toBe(620);
    });

    it('should not count a panel that overflows', () => {
        const main = box('prism-main', 254);

        main.append(box('comp-head-host', 0), box('prism-canvas-wrap', 0), box('prism-main__panel', 400));

        expect(panelSpace(main)).toBe(254);
    });
});
