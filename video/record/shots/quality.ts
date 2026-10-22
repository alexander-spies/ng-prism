import { activePanel, panelTab } from './locators.ts';
import type { Shot } from './shot.ts';

/**
 * Tour beat "A11y, coverage, regressions: at a glance." (0:26–0:32): the contrast violation of the Ghost variant, then
 * the sidebar markers. The A11y tab is opened by click after the audit ran: with the panel already open, its
 * focus-order overlay covers the component and axe reports the contrast only as "needs review". ~6 s.
 */
export const quality: Shot = {
    id: 'quality',
    query: 'component=ButtonComponent&variant=1',
    ready: '.demo-wrap[data-prism-rendered="ButtonComponent:1"]',
    async run({ page, mark, pause, click, move }) {
        await pause(700);
        await click(panelTab(page, 'A11y'), 600);
        await page.getByText('color-contrast', { exact: true }).waitFor();
        await mark('a11y-panel', activePanel(page));
        await pause(1400);
        const flagged = page.locator('button.sb-item:has(.sb-health)');
        await mark('sidebar-markers', flagged);
        for (const marker of await page.locator('.sb-health').all()) {
            const box = await marker.boundingBox();
            if (box) await move(box.x - 6, box.y + box.height / 2, 800);
            await pause(700);
        }
        await pause(300);
    }
};
