/**
 * Where focus goes when the desktop sidebar takes it over from the phone
 * layout's navigation (see `PrismMobileLayoutService.takeFocusHandoff`): the
 * active entry, where the reader was, or the filter when nothing is active.
 */
export function handoffTarget(root: ParentNode): HTMLElement | null {
    return root.querySelector<HTMLElement>('.sb-item--active') ?? root.querySelector<HTMLElement>('.sb-filter input');
}
