import { activePanel, canvas, controlRow, panelTab } from './locators.ts';
import type { Shot } from './shot.ts';

/** Tour beat "Change inputs. See it live." (0:20–0:26): type a label, switch the variant input, click the button. ~6 s. */
export const controls: Shot = {
    id: 'controls',
    query: 'component=ButtonComponent&variant=0',
    ready: '.demo-wrap[data-prism-rendered="ButtonComponent:0"]',
    async run({ page, mark, pause, click, type }) {
        await mark('controls-panel', activePanel(page));
        await mark('canvas', canvas(page));
        await pause(400);
        await click(controlRow(page, 'label').locator('input.ctl-text'), 550);
        await page.keyboard.press('ControlOrMeta+A');
        await type('Ship it', 70);
        await pause(700);
        await click(controlRow(page, 'variant').locator('button', { hasText: /^\s*ghost\s*$/ }), 600);
        await pause(800);
        await click(page.locator('ui-button button'), 700);
        await page.waitForFunction(() =>
            [...document.querySelectorAll('[role=tablist][aria-label=Panels] [role=tab]')].some((tab) => /^Events.*\d/.test(tab.textContent?.replace(/\s+/g, ' ').trim() ?? ''))
        );
        await mark('events-tab', panelTab(page, 'Events'));
        await pause(1100);
    }
};
