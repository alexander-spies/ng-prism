import type { NavigationItem } from '../services/navigation-item.types.js';
import type { PrismNavigationService } from '../services/prism-navigation.service.js';
import type { PrismPanelService } from '../services/prism-panel.service.js';

/**
 * Where the reader goes when a rebuild took away the item they look at (see
 * `shouldSelectFirst`). A component that became a part of another opens that
 * one, as the URL of a part does, and on the part when the view that lists
 * parts was open. Anything else falls back to the first entry.
 */
export function selectInstead(
    item: NavigationItem,
    navigation: Pick<PrismNavigationService, 'parentOfPart' | 'select' | 'selectFirst'>,
    panels: Pick<PrismPanelService, 'activeViewId' | 'partsPanel' | 'showPart'>
): void {
    const className = item.kind === 'component' ? item.data.meta.className : null;
    const parent = className === null ? undefined : navigation.parentOfPart(className);

    if (className === null || !parent) {
        navigation.selectFirst();
        return;
    }

    // Read before the switch, which starts the parent on the Playground.
    const view = panels.activeViewId();

    navigation.select(parent);
    if (panels.partsPanel()?.id === view) {
        panels.showPart(className, view);
    }
}
