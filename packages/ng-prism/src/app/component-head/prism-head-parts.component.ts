import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismBadgeComponent } from '../shared/prism-badge.component.js';
import { partChips } from './head-parts.js';

/**
 * The parts of the active component, as a label and one chip per part.
 *
 * A part has no page of its own, so this is where it shows up: its title in the
 * band, its API in a popover. The popover is built like the one of
 * `prism-head-info` (native `popover`, anchor positioning, click only), once per
 * chip, with an id and an anchor name of its own so that each card opens at its
 * own chip. Everything it lists comes from what the scanner reads anyway, so it
 * works without a plugin; "Full API →" appears when a panel says it lists parts.
 */
@Component({
    selector: 'prism-head-parts',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismBadgeComponent],
    templateUrl: './prism-head-parts.component.html',
    styleUrl: './prism-head-parts.component.css'
})
export class PrismHeadPartsComponent {
    private readonly navigationService = inject(PrismNavigationService);
    private readonly panelService = inject(PrismPanelService);

    protected readonly chips = computed(() => partChips(this.navigationService.activeComponent()?.parts));

    /** The view panel the link opens, `null` when no visible one lists parts. */
    protected readonly partsPanel = this.panelService.partsPanel;

    /**
     * Opens the panel on the part. The card goes first: switching the view
     * re-creates the head, which would close it anyway, but a popover that is
     * still open when the view changes should not depend on that.
     */
    protected showFullApi(partClassName: string, panelId: string, card: HTMLElement): void {
        card.hidePopover();
        this.panelService.showPart(partClassName, panelId);
    }
}
