import type { RuntimeComponent } from '@ng-prism/core/plugin';
import { COVERAGE_NAVIGATION_DECORATION } from './coverage-contributions.js';

function component(meta: Record<string, unknown> | null = null): RuntimeComponent {
    return {
        meta: { showcaseConfig: { meta: meta ?? {} } }
    } as unknown as RuntimeComponent;
}

describe('COVERAGE_NAVIGATION_DECORATION', () => {
    it('says nothing about a component with no coverage data', () => {
        expect(COVERAGE_NAVIGATION_DECORATION.badge(component())).toBeNull();
    });

    it('says nothing when the report found no entry', () => {
        expect(COVERAGE_NAVIGATION_DECORATION.badge(component({ coverage: { found: false } }))).toBeNull();
    });

    it('says nothing when the report predates the summary field', () => {
        expect(COVERAGE_NAVIGATION_DECORATION.badge(component({ coverage: { found: true } }))).toBeNull();
    });

    it('says nothing for a healthy component', () => {
        expect(
            COVERAGE_NAVIGATION_DECORATION.badge(
                component({
                    coverage: {
                        found: true,
                        summary: { variant: 'ok', label: 'Coverage 92%' }
                    }
                })
            )
        ).toBeNull();
    });

    it('passes the derived verdict straight through', () => {
        expect(
            COVERAGE_NAVIGATION_DECORATION.badge(
                component({
                    coverage: {
                        found: true,
                        summary: { variant: 'warn', label: 'Coverage 62%' }
                    }
                })
            )
        ).toEqual({ variant: 'warn', label: 'Coverage 62%' });
    });
});
