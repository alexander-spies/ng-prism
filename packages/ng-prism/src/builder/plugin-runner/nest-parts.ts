import type { ScannedComponent } from '../../plugin/plugin.types.js';
import { selectorList } from '../scanner/resolve-parts.js';

/**
 * Move every part onto its parent, which is how `onManifestReady` and the runtime manifest see it: the parent is a new
 * object with {@link ScannedComponent.parts}, sorted by title, and the part is no longer in the list.
 *
 * Which component is a part of which is decided by the scan. `scanned` is the list the per-item hooks were given and
 * `components` what they returned for it, item for item: a hook replaces an item but never adds, drops or moves one.
 * The parent is looked up in `scanned`, as the class named by {@link ScannedComponent.parentClassName} that also has
 * the selector `partOf` names, since two files can export the same class name. The part then goes onto what the hooks
 * made of that parent, so a hook that rewrites a parent, its selector or class name included, keeps its parts on it.
 * A part whose parent is not in `scanned` stays in the list as a component of its own, without `parentClassName` and
 * `partOf`: a part must not vanish from the styleguide. What it is given is not changed.
 */
export function nestParts(components: readonly ScannedComponent[], scanned: readonly ScannedComponent[] = components): ScannedComponent[] {
    const parentOf = (part: ScannedComponent): number => {
        const selector = part.showcaseConfig.partOf;

        if (part.parentClassName === undefined || selector === undefined) return -1;

        // A part is never a parent: a part cannot have parts.
        return scanned.findIndex(
            (candidate) =>
                candidate.parentClassName === undefined &&
                candidate.className === part.parentClassName &&
                selectorList(candidate.componentMeta.selector).includes(selector)
        );
    };

    const partsOf = new Map<number, ScannedComponent[]>();
    const nested = new Set<number>();
    const orphans = new Set<number>();

    scanned.forEach((item, index) => {
        if (item.parentClassName === undefined) return;

        const parent = parentOf(item);

        if (parent === -1) {
            orphans.add(index);
            return;
        }

        nested.add(index);
        partsOf.set(parent, [...(partsOf.get(parent) ?? []), components[index]]);
    });

    const result: ScannedComponent[] = [];

    components.forEach((component, index) => {
        if (nested.has(index)) return;

        const parts = partsOf.get(index);

        if (parts) {
            result.push({ ...component, parts: [...parts].sort((a, b) => a.showcaseConfig.title.localeCompare(b.showcaseConfig.title)) });
        } else if (orphans.has(index)) {
            result.push(withoutParent(component));
        } else {
            result.push(component);
        }
    });

    return result;
}

/** `part` as a component of its own. */
function withoutParent(part: ScannedComponent): ScannedComponent {
    const own: ScannedComponent = { ...part, showcaseConfig: { ...part.showcaseConfig } };

    delete own.parentClassName;
    delete own.showcaseConfig.partOf;
    return own;
}
