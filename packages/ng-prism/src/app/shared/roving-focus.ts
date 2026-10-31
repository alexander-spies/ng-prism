/**
 * Where a roving focus moves for a key, following the WAI-ARIA tabs and radio
 * group patterns: arrows step and wrap, Home and End jump to the ends. `null`
 * when the key does not move focus.
 */
export function nextRovingIndex(current: number, key: string, count: number): number | null {
    if (count <= 0) return null;
    switch (key) {
        case 'ArrowRight':
        case 'ArrowDown':
            return (current + 1) % count;
        case 'ArrowLeft':
        case 'ArrowUp':
            return (current - 1 + count) % count;
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return null;
    }
}

/**
 * The one item of a roving group that is in the tab order: the active one, or
 * the first when nothing matches (the active panel was filtered out, or no
 * value is set), so the group can always be reached. `-1` for an empty group.
 */
export function rovingTabStop<T>(values: readonly T[], active: T | null): number {
    if (values.length === 0) return -1;
    const index = active === null ? -1 : values.indexOf(active);

    return index < 0 ? 0 : index;
}
