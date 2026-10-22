import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ICON_BUTTON = readFileSync(join(__dirname, '../shared/prism-icon-button.component.css'), 'utf8');
const RAIL = readFileSync(join(__dirname, 'prism-canvas-toolbar.component.css'), 'utf8');
const CELL = readFileSync(join(__dirname, '../overview/prism-overview-cell.component.css'), 'utf8');

function rule(css: string, selector: string): string {
    const start = css.indexOf(`${selector} {`);

    if (start < 0) throw new Error(`${selector} not found`);
    return css.slice(start, css.indexOf('}', start));
}

/**
 * Focus and selection frames drawn over a canvas ground must hold 3:1 there.
 * The theme primary does not on the opposite absolute ground (2.5:1 for the
 * dark theme's on a light canvas), so these frames take the overlay primary,
 * which canvas-overlay-tokens.spec holds to 4.5:1, or sit outside the ground.
 */
describe('frames over the canvas ground', () => {
    it('should let the rail bend the icon button focus ring to the overlay primary', () => {
        expect(rule(ICON_BUTTON, ':host(:focus-visible)')).toContain('var(--prism-icon-button-focus, var(--prism-primary))');
        expect(RAIL).toMatch(/--prism-icon-button-focus:\s*var\(--prism-canvas-overlay-primary\)/);
    });

    it('should draw the hovered and current overview cell frame outside the cell ground', () => {
        const frame = rule(CELL, ':host([data-current]) .cell__stage');
        const offset = /outline-offset:\s*(-?[\d.]+)px/.exec(frame);

        expect(Number(offset?.[1])).toBeGreaterThan(0);
    });
});
