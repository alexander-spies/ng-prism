import type { RuntimeComponent } from '@ng-prism/core/plugin';
import { hasResults, reviewBadge, VRT_NAVIGATION_DECORATION } from './panel-contributions.js';
import type { VrtStatus, VrtVariantResult } from './visual-regression.types.js';

function variant(status: VrtStatus, index: number): VrtVariantResult {
    return { className: 'ButtonComponent', variantIndex: index, status };
}

function component(meta: Record<string, unknown> | null = null): RuntimeComponent {
    return {
        meta: { showcaseConfig: { meta: meta ?? {} } }
    } as unknown as RuntimeComponent;
}

function withVariants(...statuses: VrtStatus[]): RuntimeComponent {
    return component({
        visualRegression: {
            found: statuses.length > 0,
            assetBaseUrl: '',
            variants: statuses.map(variant)
        }
    });
}

describe('hasResults', () => {
    it('is false for a component the runner never reported on', () => {
        expect(hasResults(component())).toBe(false);
    });

    it('is false when the report was found but held nothing', () => {
        expect(
            hasResults(
                component({
                    visualRegression: { found: true, assetBaseUrl: '', variants: [] }
                })
            )
        ).toBe(false);
    });

    it('is true once there is a variant to show', () => {
        expect(hasResults(withVariants('unchanged'))).toBe(true);
    });

    it('survives a component with no meta at all', () => {
        expect(hasResults({} as RuntimeComponent)).toBe(false);
    });
});

describe('reviewBadge', () => {
    it('says nothing about a component with no results', () => {
        expect(reviewBadge(component())).toBeNull();
    });

    it('leaves a clean component unbadged', () => {
        // Not a green zero: a badge on every tab is a badge that gets ignored.
        expect(reviewBadge(withVariants('unchanged', 'unchanged'))).toBeNull();
    });

    it('counts only what is waiting on a person', () => {
        const badge = reviewBadge(withVariants('changed', ...Array<VrtStatus>(14).fill('unchanged')));

        expect(badge).toEqual({ kind: 'issues', text: '1', tone: 'danger', label: '1 to review' });
    });

    it('counts every kind of open item, not just the changed ones', () => {
        const badge = reviewBadge(withVariants('changed', 'new', 'size-mismatch'));

        expect(badge?.text).toBe('3');
    });

    it('stays amber while nothing has actually regressed', () => {
        // Resized and new could not be compared. Neither is a regression, so
        // neither gets the regression colour.
        expect(reviewBadge(withVariants('new', 'size-mismatch'))?.tone).toBe('warn');
    });

    it('turns red as soon as one variant really changed', () => {
        expect(reviewBadge(withVariants('new', 'changed'))?.tone).toBe('danger');
    });

    it('ignores excluded variants entirely', () => {
        expect(reviewBadge(withVariants('unchanged', 'excluded'))).toBeNull();
    });
});

describe('VRT_NAVIGATION_DECORATION', () => {
    it('says nothing about a component with no results', () => {
        expect(VRT_NAVIGATION_DECORATION.badge(component())).toBeNull();
    });

    it('says nothing when the report found no entry', () => {
        expect(VRT_NAVIGATION_DECORATION.badge(component({ visualRegression: { found: false } }))).toBeNull();
    });

    it('says nothing when the report predates the summary field', () => {
        expect(
            VRT_NAVIGATION_DECORATION.badge(
                component({
                    visualRegression: { found: true, assetBaseUrl: '', variants: [] }
                })
            )
        ).toBeNull();
    });

    it('says nothing for a healthy component', () => {
        expect(
            VRT_NAVIGATION_DECORATION.badge(
                component({
                    visualRegression: {
                        found: true,
                        assetBaseUrl: '',
                        variants: [],
                        summary: {
                            value: '0.0%',
                            variant: 'ok',
                            label: 'Visual regression: 0.0% max diff'
                        }
                    }
                })
            )
        ).toBeNull();
    });

    it('returns the label the build step composed, verbatim, without recomposing it', () => {
        // Unlike a11y/coverage, this used to compose `Visual regression: ${value}
        // max diff` here. It no longer does: the value passed in below would
        // produce a different string than the label if `badge()` were still
        // building it itself.
        expect(
            VRT_NAVIGATION_DECORATION.badge(
                component({
                    visualRegression: {
                        found: true,
                        assetBaseUrl: '',
                        variants: [],
                        summary: {
                            value: '12.3%',
                            variant: 'danger',
                            label: 'Visual regression: 12.3% max diff'
                        }
                    }
                })
            )
        ).toEqual({
            variant: 'danger',
            label: 'Visual regression: 12.3% max diff'
        });
    });

    it('returns a warn label naming its reason, not a percentage', () => {
        // Edge case: `value` is '—' when nothing was
        // compared, so a label composed from it at read time would read
        // "Visual regression: — max diff", amber and naming nothing actionable.
        expect(
            VRT_NAVIGATION_DECORATION.badge(
                component({
                    visualRegression: {
                        found: true,
                        assetBaseUrl: '',
                        variants: [],
                        summary: {
                            value: '—',
                            variant: 'warn',
                            label: 'Visual regression: 2 new baselines'
                        }
                    }
                })
            )
        ).toEqual({
            variant: 'warn',
            label: 'Visual regression: 2 new baselines'
        });
    });
});
