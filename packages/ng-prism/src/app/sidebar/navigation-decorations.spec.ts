import type { NavigationDecorationDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import type { NavigationItem } from '../services/navigation-item.types.js';
import { decorateItem, lifecycleIcon, resolveNavigationDecorations, rollupCategory } from './navigation-decorations.js';

function component(className: string): RuntimeComponent {
    return {
        type: class {} as unknown as RuntimeComponent['type'],
        meta: {
            className,
            filePath: '',
            showcaseConfig: { title: className },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'x', standalone: true, isDirective: false }
        }
    };
}

function item(className: string): NavigationItem {
    return { kind: 'component', data: component(className) };
}

/** A definition that fires for the listed class names with the given variant. */
function def(id: string, icon: string, order: number, hits: Record<string, 'warn' | 'danger'>): NavigationDecorationDefinition {
    return {
        id,
        icon,
        order,
        badge: (c) => {
            const variant = hits[c.meta.className];

            return variant ? { variant, label: `${id}: ${variant}` } : null;
        }
    };
}

describe('resolveNavigationDecorations', () => {
    it('puts built-ins before plugin contributions', () => {
        const builtin = def('a11y', 'accessibility', 10, {});
        const plugin = def('coverage', 'shield-check', 30, {});
        const result = resolveNavigationDecorations([builtin], [plugin]);

        expect(result.map((d) => d.id)).toEqual(['a11y', 'coverage']);
    });

    it('sorts by order, not by registration', () => {
        const late = def('coverage', 'shield-check', 30, {});
        const early = def('a11y', 'accessibility', 10, {});
        const result = resolveNavigationDecorations([], [late, early]);

        expect(result.map((d) => d.id)).toEqual(['a11y', 'coverage']);
    });

    it('treats a missing order as 0', () => {
        const ordered = def('coverage', 'shield-check', 30, {});
        const unordered: NavigationDecorationDefinition = {
            id: 'other',
            icon: 'box',
            badge: () => null
        };
        const result = resolveNavigationDecorations([], [ordered, unordered]);

        expect(result.map((d) => d.id)).toEqual(['other', 'coverage']);
    });

    it('drops a duplicate id and keeps the built-in', () => {
        const builtin = def('a11y', 'accessibility', 10, {});
        const impostor = def('a11y', 'box', 5, {});
        const result = resolveNavigationDecorations([builtin], [impostor]);

        expect(result).toHaveLength(1);
        expect(result[0].icon).toBe('accessibility');
    });
});

describe('decorateItem', () => {
    const defs = [
        def('a11y', 'accessibility', 10, { Dialog: 'danger', Progress: 'warn' }),
        def('vrt', 'camera', 20, { Dialog: 'danger' }),
        def('coverage', 'shield-check', 30, { Dialog: 'warn', Table: 'warn' })
    ];

    it('returns null for a component nothing applies to', () => {
        expect(decorateItem(item('Button'), defs)).toBeNull();
    });

    it('returns null for a page item', () => {
        // StyleguidePage is a union discriminated by `type`; CustomPage also
        // requires `data`. A bare { title } does not type-check.
        const page: NavigationItem = {
            kind: 'page',
            data: { type: 'custom', title: 'Intro', data: {} }
        };

        expect(decorateItem(page, defs)).toBeNull();
    });

    it('collects one mark per firing source, in definition order', () => {
        const result = decorateItem(item('Dialog'), defs);

        expect(result?.marks.map((m) => m.icon)).toEqual(['accessibility', 'camera', 'shield-check']);
    });

    it('reports the worst variant across all marks', () => {
        expect(decorateItem(item('Dialog'), defs)?.worst).toBe('danger');
        expect(decorateItem(item('Table'), defs)?.worst).toBe('warn');
    });

    it('joins every label into the tooltip, one per line', () => {
        expect(decorateItem(item('Progress'), defs)?.tooltip).toBe('a11y: warn');
        expect(decorateItem(item('Dialog'), defs)?.tooltip).toBe('a11y: danger\nvrt: danger\ncoverage: warn');
    });

    it('tags each mark with its definition id, even when two sources share an icon', () => {
        // `@for` in the sidebar tracks by `mark.id`, not `mark.icon`. A
        // third-party plugin is free to pick the same icon an existing source
        // already uses (e.g. 'camera'), and two marks with the same track key on
        // one item would collide.
        const clashingDefs = [def('a11y', 'camera', 10, { Dialog: 'danger' }), def('vrt', 'camera', 20, { Dialog: 'warn' })];
        const result = decorateItem(item('Dialog'), clashingDefs);

        expect(result?.marks.map((m) => m.id)).toEqual(['a11y', 'vrt']);
        expect(new Set(result?.marks.map((m) => m.id)).size).toBe(2);
    });
});

describe('rollupCategory', () => {
    const defs = [def('a11y', 'accessibility', 10, { Dialog: 'danger' }), def('coverage', 'shield-check', 30, { Dialog: 'warn', Table: 'warn' })];

    // rollupCategory takes each item's already-resolved decorations rather than
    // the raw items. The caller runs decorateItem once per item to render its
    // marks, and this proves the roll-up reuses that instead of recomputing it.
    function decorationsFor(names: string[]) {
        return names.map((name) => decorateItem(item(name), defs));
    }

    it('counts items with a mark, not the marks themselves', () => {
        const decorations = decorationsFor(['Dialog', 'Table', 'Button']);

        expect(rollupCategory(decorations).problems).toBe(2);
    });

    it('takes the worst variant in the category', () => {
        expect(rollupCategory(decorationsFor(['Dialog', 'Table'])).variant).toBe('danger');
        expect(rollupCategory(decorationsFor(['Table'])).variant).toBe('warn');
    });

    it('reports nothing for a clean category', () => {
        expect(rollupCategory(decorationsFor(['Button']))).toEqual({
            problems: 0,
            variant: null
        });
    });
});

describe('decorateItem on a service', () => {
    it('never decorates a service, whatever the definitions say', () => {
        const everything = def('always', 'x', 0, {});
        const service: NavigationItem = {
            kind: 'service',
            data: {
                meta: {
                    className: 'ToastService',
                    filePath: '',
                    showcaseConfig: { title: 'Toasts' },
                    provision: 'auto',
                    api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
                }
            }
        };

        expect(decorateItem(service, [{ ...everything, badge: () => ({ variant: 'danger', label: 'always' }) }])).toBeNull();
    });
});

describe('lifecycleIcon', () => {
    it('is the dashed circle for work in progress', () => {
        expect(lifecycleIcon('wip')).toBe('circle-dashed');
    });

    it('is the solid box for everything else', () => {
        expect(lifecycleIcon('stable')).toBe('box');
        expect(lifecycleIcon('beta')).toBe('box');
        expect(lifecycleIcon('deprecated')).toBe('box');
        expect(lifecycleIcon(undefined)).toBe('box');
    });

    it('takes the glyph for everything else from the caller, the dashed circle stays shared', () => {
        expect(lifecycleIcon('wip', 'plug')).toBe('circle-dashed');
        expect(lifecycleIcon('stable', 'plug')).toBe('plug');
        expect(lifecycleIcon(undefined, 'plug')).toBe('plug');
    });
});
