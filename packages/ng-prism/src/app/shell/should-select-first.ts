import type { StyleguidePage } from '../../plugin/page.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import type { NavigationItem } from '../services/navigation-item.types.js';

/**
 * Whether the selection points at something the manifest no longer holds.
 *
 * `activeItem` is what was selected; the three `active*` values are that item
 * re-linked against the current manifest, and only the one matching its kind can
 * be non-null. All three being `null` while an item is set means it vanished
 * (a rebuild dropped it), so the shell falls back to the first entry. Every
 * kind has to be named here: a kind left out would look vanished the moment it
 * is selected, and the shell would bounce straight back to the first entry.
 */
export function shouldSelectFirst(item: NavigationItem | null, component: RuntimeComponent | null, service: RuntimeService | null, page: StyleguidePage | null): boolean {
    return item !== null && component === null && service === null && page === null;
}
