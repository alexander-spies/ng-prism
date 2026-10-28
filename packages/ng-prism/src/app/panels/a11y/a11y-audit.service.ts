import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { AxeResults, RunOptions } from 'axe-core';
import { withCanvasChromeHidden } from '../../renderer/canvas-audit.js';
import type { A11yCoreConfig, A11yScoreResult } from './a11y.types.js';

export function calculateScore(results: AxeResults): A11yScoreResult {
    const violations = results.violations;
    const critical = violations.filter((v) => v.impact === 'critical').length;
    const serious = violations.filter((v) => v.impact === 'serious').length;
    const moderate = violations.filter((v) => v.impact === 'moderate').length;
    const minor = violations.filter((v) => v.impact === 'minor').length;
    const deductions = critical * 25 + serious * 10 + moderate * 5 + minor * 1;

    return {
        score: Math.max(0, 100 - deductions),
        violations: violations.length,
        critical,
        serious,
        moderate,
        minor,
        passes: results.passes.length,
        incomplete: results.incomplete.length
    };
}

/**
 * axe-core is a dependency of `@ng-prism/core` and loaded lazily, so a failure
 * here means the chunk could not be fetched, not that anything is missing.
 */
async function loadAxe() {
    try {
        return await import('axe-core');
    } catch (cause) {
        throw new Error(
            'Could not load axe-core, so the accessibility audit is unavailable. It ships with @ng-prism/core; check that the install is intact and the chunk is reachable.',
            { cause }
        );
    }
}

export async function runCoreAudit(element: Element, config?: A11yCoreConfig): Promise<AxeResults> {
    const axe = await loadAxe();

    const options: RunOptions = {};

    if (config?.rules) {
        const keys = Object.keys(config.rules);

        if (keys.length > 0) {
            options.rules = Object.fromEntries(keys.map((id) => [id, config.rules![id]]));
        }
    }

    return withCanvasChromeHidden(element, () => axe.default.run(element, options));
}

@Injectable({ providedIn: 'root' })
export class A11yAuditService {
    readonly results = signal<AxeResults | null>(null);
    readonly running = signal(false);
    readonly error = signal<string | null>(null);

    readonly scoreResult = computed(() => {
        const r = this.results();

        return r ? calculateScore(r) : null;
    });

    private timer: ReturnType<typeof setTimeout> | null = null;
    private destroyed = false;

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this.destroyed = true;
            this.clear();
        });
    }

    scheduleAudit(element: Element, config?: A11yCoreConfig, debounceMs = 500): void {
        if (this.destroyed) return;
        if (this.timer) clearTimeout(this.timer);
        this.running.set(true);
        this.error.set(null);

        this.timer = setTimeout(() => {
            runCoreAudit(element, config).then(
                (result) => {
                    if (this.destroyed) return;
                    this.results.set(result);
                    this.running.set(false);
                },
                (err) => {
                    if (this.destroyed) return;
                    this.error.set(err instanceof Error ? err.message : String(err));
                    this.running.set(false);
                }
            );
        }, debounceMs);
    }

    clear(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.results.set(null);
        this.running.set(false);
        this.error.set(null);
    }
}
