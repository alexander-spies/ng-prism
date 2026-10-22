import type { Shot } from './shot.ts';

/** The styleguide the code turns into (tour 0:13–0:20): Button selected, a calm pointer over the sidebar. ~7 s. */
export const reveal: Shot = {
    id: 'reveal',
    query: 'component=ButtonComponent&variant=0',
    ready: '.demo-wrap[data-prism-rendered="ButtonComponent:0"]',
    async run({ page, mark, pause, move }) {
        const sidebarButton = page.locator('button.sb-item.sb-item--active');
        // The tabs themselves: the tablist spans the whole width, its centre is empty header.
        const variantTabs = page.locator('[role=tablist][aria-label=Variants] [role=tab]');
        await mark('sidebar-button', sidebarButton);
        await mark('variant-tabs', variantTabs);
        await pause(1500);
        const item = await sidebarButton.boundingBox();
        if (item) await move(item.x + item.width * 0.7, item.y + item.height / 2, 1600);
        await pause(1100);
        const tab = await variantTabs.first().boundingBox();
        if (tab) await move(tab.x + tab.width / 2, tab.y + tab.height + 14, 1400);
        await pause(1400);
    }
};
