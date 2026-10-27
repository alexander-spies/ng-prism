import type ts from 'typescript';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import type { Report } from './component.scanner.js';
import { describeShowcaseIssue } from './showcase-diagnostics.js';

/**
 * The fields of a `@Showcase` config that do nothing on a part, which has no page of its own: the variants, states,
 * placement in the navigation and canvas settings belong to a page, and what the templates of a showcase need is
 * only read for its variants.
 */
export const PART_IGNORED_FIELDS = [
    'variants',
    'states',
    'category',
    'categoryOrder',
    'componentOrder',
    'section',
    'sectionOrder',
    'bg',
    'canvasLayout',
    'host',
    'imports',
    'providers',
    'setup',
    'renderPage'
] as const satisfies ReadonlyArray<keyof ShowcaseConfig>;

const IGNORED_ON_A_PART = "has no effect on a part, which has no page of its own: the parent's showcase shows it. It was dropped.";

export interface PartResolution {
    /** For a part that cannot be resolved: counts for `strictShowcase`. */
    report: Report;
    /** For what a resolved part drops: never fails the build. */
    notify: Report;
    /** Where each class that declares `partOf` wrote it, which is what the messages point at. */
    origins: ReadonlyMap<ScannedComponent, ts.Expression>;
}

/** The selectors a component or directive matches, from its comma separated `selector`. */
export function selectorList(selector: string): string[] {
    return selector
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');
}

/**
 * Resolve `partOf`, the selector a part names, to the component or directive it is a part of. Runs once all entry
 * points are scanned, so that the parent can be in another one, and changes `components` in place.
 *
 * A resolved part gets {@link ScannedComponent.parentClassName}. What it has set that only a page uses is dropped,
 * each field with a notice, and so is its composition, since nothing renders its variants.
 *
 * A part that cannot be resolved is a diagnostic. It loses `partOf` and stays a component of its own, as it would
 * without it: a part must not vanish from the styleguide over a wrong selector.
 */
export function resolveParts(components: ScannedComponent[], { report, notify, origins }: PartResolution): void {
    // A chain is judged on what a class declares: the parent of a part that cannot be resolved loses its partOf below.
    const declaring = new Set(components.filter((component) => component.showcaseConfig.partOf !== undefined));

    for (const part of components) {
        const selector = part.showcaseConfig.partOf;
        const origin = origins.get(part);

        // The scan records the origin of every class that kept partOf.
        if (selector === undefined || !origin) continue;

        const resolved = findParent(part, selector, components, declaring);

        if (typeof resolved === 'string') {
            report(describeShowcaseIssue(part.className, origin, ['partOf'], resolved));
            delete part.showcaseConfig.partOf;
            continue;
        }

        part.parentClassName = resolved.className;

        for (const field of PART_IGNORED_FIELDS) {
            if (part.showcaseConfig[field] === undefined) continue;

            notify(describeShowcaseIssue(part.className, origin, [field], IGNORED_ON_A_PART));
            delete part.showcaseConfig[field];
        }

        delete part.composition;
    }
}

/** The parent of `part`, or what is wrong with the selector it names. */
function findParent(
    part: ScannedComponent,
    selector: string,
    components: readonly ScannedComponent[],
    declaring: ReadonlySet<ScannedComponent>
): ScannedComponent | string {
    if (selectorList(part.componentMeta.selector).includes(selector)) return 'a component cannot be a part of itself; it keeps a page of its own';

    const candidates = components.filter((component) => component !== part && selectorList(component.componentMeta.selector).includes(selector));

    if (candidates.length === 0) return `no component or directive with @Showcase has the selector "${selector}"; it keeps a page of its own`;

    if (candidates.length > 1) {
        const names = candidates.map((candidate) => candidate.className).join(' and ');

        return `"${selector}" is the selector of ${names}; name a selector only one of them has. It keeps a page of its own`;
    }

    const [parent] = candidates;

    return declaring.has(parent) ? `${parent.className} is a part itself, and a part cannot have parts; it keeps a page of its own` : parent;
}
