/** What the canvas and the panel share; every other child of the main area takes its height out first. */
const SHARED = '.prism-canvas-wrap, .prism-resizer-row, .prism-main__panel';

/**
 * The height the canvas and the addon panel share in the main area: what the
 * component head, the variant rail and anything else above them leave. Taken
 * from the main area and its other children rather than from the canvas and
 * the panel themselves, which overflow it when the panel is too tall, the very
 * case this measurement exists to prevent.
 */
export function panelSpace(main: Element): number {
    const taken = [...main.children].filter((child) => !child.matches(SHARED)).reduce((sum, child) => sum + child.getBoundingClientRect().height, 0);

    return Math.max(0, Math.round(main.getBoundingClientRect().height - taken));
}
