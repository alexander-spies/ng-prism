import { revealScrollTop } from './reveal-item.js';

/** A list 400px tall whose top edge sits 100px down the viewport, items 30px tall. */
const viewport = { top: 100, bottom: 500 };

function itemAt(top: number) {
    return { top, bottom: top + 30 };
}

describe('revealScrollTop', () => {
    it('leaves an item in sight where it is', () => {
        expect(revealScrollTop(viewport, itemAt(100), 0)).toBeNull();
        expect(revealScrollTop(viewport, itemAt(470), 0)).toBeNull();
    });

    it('centres an item below the fold', () => {
        // 900px into the content: 900 - (400 - 30) / 2
        expect(revealScrollTop(viewport, itemAt(1000), 0)).toBe(715);
    });

    it('centres an item that is cut off at the bottom', () => {
        expect(revealScrollTop(viewport, itemAt(490), 0)).toBe(205);
    });

    it('centres an item scrolled out at the top', () => {
        // 300px into the content, the list scrolled to 600
        expect(revealScrollTop(viewport, itemAt(-200), 600)).toBe(115);
    });

    it('stops at the top of the content', () => {
        expect(revealScrollTop(viewport, itemAt(60), 50)).toBe(0);
    });
});
