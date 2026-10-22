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
