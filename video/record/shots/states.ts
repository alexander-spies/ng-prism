import { activePanel, canvas, panelTab, stateChip, stateMenuButton } from './locators.ts';
import type { Shot } from './shot.ts';

/**
 * Tour beat "Every state. Every pixel." (0:32–0:38): the declared states one after the other, then the box model, which
 * draws its overlay for the element under the pointer. ~6.7 s.
 */
export const states: Shot = {
    id: 'states',
    query: 'component=ButtonComponent&variant=0',
    ready: '.demo-wrap[data-prism-rendered="ButtonComponent:0"]',
    async run({ page, mark, pause, click, move }) {
        await mark('canvas', canvas(page));
        await click(stateMenuButton(page), 500);
        await pause(250);
        await mark('state-chips', page.locator('#prism-tools button.is-rec'));
        for (const name of ['Hover', 'Focus visible', 'Pressed']) {
            await click(stateChip(page, name), 350);
            await pause(800);
        }
        await page.keyboard.press('Escape');
        await pause(150);
        await click(panelTab(page, 'Box Model'), 500);
        await pause(150);
        const button = await page.locator('ui-button button').boundingBox();
        if (button) await move(button.x + button.width * 0.6, button.y + button.height * 0.55, 550);
        await mark('box-model-panel', activePanel(page));
        await pause(800);
    }
};
