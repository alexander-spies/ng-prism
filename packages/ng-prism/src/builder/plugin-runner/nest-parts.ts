import type { ScannedComponent } from '../../plugin/plugin.types.js';
import { selectorList } from '../scanner/resolve-parts.js';

/**
 * Move every part onto its parent, which is how `onManifestReady` and the runtime manifest see it: the parent is a new
 * object with {@link ScannedComponent.parts}, sorted by title, and the part is no longer in the list.
 *
 * The parent is the class named by {@link ScannedComponent.parentClassName} that also has the selector `partOf` names.
 * A class name alone does not say which one, since two files can export the same name. A part whose parent is no
 * longer there stays in the list as a component of its own, without `parentClassName` and `partOf`: a plugin hook can
 * replace the parent with something else, and a part must not vanish from the styleguide over that. What it is given
 * is not changed.
 */
export function nestParts(components: ScannedComponent[]): ScannedComponent[] {
    const parentOf = (part: ScannedComponent): ScannedComponent | undefined => {
        const selector = part.showcaseConfig.partOf;

        if (part.parentClassName === undefined || selector === undefined) return undefined;

        // A part is never a parent: a part cannot have parts.
        return components.find(
            (candidate) =>
                candidate.parentClassName === undefined &&
                candidate.className === part.parentClassName &&
                selectorList(candidate.componentMeta.selector).includes(selector)
        );
    };

    const partsOf = new Map<ScannedComponent, ScannedComponent[]>();
    const nested = new Set<ScannedComponent>();

    for (const component of components) {
        if (component.parentClassName === undefined) continue;

        const parent = parentOf(component);

        if (!parent) continue;

        nested.add(component);
        partsOf.set(parent, [...(partsOf.get(parent) ?? []), component]);
    }

    const result: ScannedComponent[] = [];

    for (const component of components) {
        if (nested.has(component)) continue;

        const parts = partsOf.get(component);

        if (parts) {
            result.push({ ...component, parts: [...parts].sort((a, b) => a.showcaseConfig.title.localeCompare(b.showcaseConfig.title)) });
        } else if (component.parentClassName !== undefined) {
            result.push(withoutParent(component));
        } else {
            result.push(component);
        }
    }

    return result;
}

/** `part` as a component of its own. */
function withoutParent(part: ScannedComponent): ScannedComponent {
    const own: ScannedComponent = { ...part, showcaseConfig: { ...part.showcaseConfig } };

    delete own.parentClassName;
    delete own.showcaseConfig.partOf;
    return own;
}
