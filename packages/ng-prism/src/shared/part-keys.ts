/**
 * The key of each part of a component, in the order given: `classNames` are the class names of its `parts`. A part's
 * key is its class name; two parts from different files can share one, and the second and later of them get the class
 * name with `~2`, `~3`, …, which no class name contains. The URL's `part`, `PrismPanelService.activePart` and the
 * `activePart` input of a panel that lists parts carry the key. Since 22.7.0.
 *
 * @experimental Experimental until 23.0.0: it may change in a 22.x minor release.
 */
export function partKeys(classNames: readonly string[]): string[] {
    const seen = new Map<string, number>();

    return classNames.map((className) => {
        const count = (seen.get(className) ?? 0) + 1;

        seen.set(className, count);
        return count === 1 ? className : `${className}~${count}`;
    });
}
