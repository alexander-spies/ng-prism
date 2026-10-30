import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The chips and their popovers, read as source: this workspace's Jest setup
 * compiles components through SWC and JIT, which resolves neither `templateUrl`
 * nor the Popover API (jsdom has none). What breaks silently in a browser is the
 * wiring, so that is what is checked: a unique id per chip, the anchor of each
 * card on its own chip, and a popover base rule that stays silent about `display`.
 */
const TEMPLATE = readFileSync(join(__dirname, 'prism-head-parts.component.html'), 'utf8');
const CSS = readFileSync(join(__dirname, 'prism-head-parts.component.css'), 'utf8');
const HEAD = readFileSync(join(__dirname, 'prism-component-head.component.html'), 'utf8');

describe('prism-head-parts template', () => {
    it('binds a unique popover per chip and anchors the card to its own chip', () => {
        expect(TEMPLATE).toContain('[attr.popovertarget]="chip.popoverId"');
        expect(TEMPLATE).toContain('[attr.id]="chip.popoverId"');
        expect(TEMPLATE).toContain('[style.anchor-name]="chip.anchorName"');
        expect(TEMPLATE).toContain('[style.position-anchor]="chip.anchorName"');
        expect(TEMPLATE).toMatch(/role="dialog"/);
        expect(TEMPLATE).toContain('[attr.aria-label]="chip.title"');
    });

    it('shows "Full API →" only with a panel that lists parts', () => {
        expect(TEMPLATE).toMatch(/@if \(partsPanel\(\)[^)]*\)[\s\S]*Full API →/);
    });

    it('hands the key of the part and the panel to the panel service', () => {
        expect(TEMPLATE).toMatch(/showFullApi\(chip\.key, panel\.id, card\)/);
    });

    it('tracks a chip by the key of its part, so an open card leaves with it on a component switch', () => {
        expect(TEMPLATE).toMatch(/@for \(chip of chips\(\); track chip\.key\)/);
    });

    it('lists the sections in the order title, description, inputs, outputs, link', () => {
        const order = ['part-card__title', 'part-card__desc', 'Inputs', 'Outputs', 'Full API →'].map((s) => TEMPLATE.indexOf(s));

        expect(order.every((i) => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('omits a section without rows', () => {
        expect(TEMPLATE).toMatch(/@if \(chip\.inputs\.length\)/);
        expect(TEMPLATE).toMatch(/@if \(chip\.outputs\.length\)/);
    });

    it('marks a required input with a badge', () => {
        expect(TEMPLATE).toMatch(/@if \(row\.required\)[\s\S]*label="required"/);
    });
});

describe('prism-head-parts styles', () => {
    it('keeps display out of the popover base rule', () => {
        expect(CSS).not.toMatch(/\.part-card\s*\{[^}]*display:/);
    });

    it('never lets a chip shrink', () => {
        expect(CSS).toMatch(/\.part-chip\s*\{[^}]*flex:\s*none/);
    });
});

describe('prism-component-head template', () => {
    /** The full row's instances are the last ones; a compact head projects the first ones into the ⓘ card. */
    it('puts the parts between the status badge and the gauge in the full row', () => {
        const status = HEAD.indexOf('comp-status');
        const parts = HEAD.lastIndexOf('<prism-head-parts');
        const gauge = HEAD.lastIndexOf('<prism-head-gauge');

        expect(status).toBeGreaterThan(-1);
        expect(parts).toBeGreaterThan(status);
        expect(gauge).toBeGreaterThan(parts);
    });

    it('moves the parts and the gauge into the ⓘ card when compact', () => {
        const info = HEAD.slice(HEAD.indexOf('<prism-head-info'), HEAD.indexOf('</prism-head-info>'));

        expect(info).toContain('<prism-head-parts');
        expect(info).toMatch(/<prism-head-gauge\s+inline/);
    });
});
