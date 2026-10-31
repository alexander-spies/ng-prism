import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MeasurePoint } from '../../shared/measure.type.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismMeasureService } from '../services/prism-measure.service.js';
import { PrismMobileLayoutService } from '../services/prism-mobile-layout.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PrismCanvasPinRowComponent } from './prism-canvas-pin-row.component.js';

const pt = (x: number, y: number): MeasurePoint => ({ x, y, snap: null });

/**
 * Replaces the real `PrismIconComponent` module with a classic-decorator
 * double wherever it is imported in this test file.
 *
 * `name`/`size` on the real component are signal inputs (`input.required()`,
 * `input()`). This workspace's specs are transpiled by SWC and compiled by
 * Angular's JIT compiler at test time rather than by `ngtsc`, and JIT has no
 * static analysis pass over the class to discover signal-input fields — see
 * `project_jit_test_limitation`. The symptom is exactly `NG0303` on `[size]`
 * followed by `NG0950` once the icon's own constructor effect reads `name()`
 * with nothing bound yet. No existing TestBed render in this codebase
 * exercises a signal-input child, for the same reason.
 *
 * `jest.mock` hoists this call above every statement in the file, including
 * this file's own `import` of `@angular/core` — a top-level reference to
 * `Component`/`Input` from that import would still be in its temporal dead
 * zone the moment this factory runs, which is why they are `require`d here
 * instead, and why the double is declared inside the factory rather than
 * closed over from the module scope.
 */
jest.mock('../icons/prism-icon.component.js', () => {
    const { Component, Input } = require('@angular/core') as typeof import('@angular/core');

    @Component({ selector: 'prism-icon', standalone: true, template: '' })
    class MockPrismIconComponent {
        @Input() name = '';
        @Input() size = 16;
    }

    return { PrismIconComponent: MockPrismIconComponent };
});

/**
 * Locates a template/style resource anywhere under `src/app`.
 *
 * `resolveComponentResources` calls back with the literal `templateUrl`/
 * `styleUrl` string exactly as each `@Component` wrote it — relative to
 * *that* component's own file, not to this spec. `PrismCanvasPinRowComponent`
 * pulls in `PrismIconComponent`, whose resources live under `../icons/`, so
 * a resolver that only joins against this spec's own `__dirname` (which is
 * all a single pinned component needs) resolves the icon's URL to a path
 * under `canvas/` that does not exist. Searching the whole `app` tree by
 * basename works regardless of which component declared the URL.
 */
async function readAppResource(url: string): Promise<string> {
    const name = basename(url);
    const appRoot = join(__dirname, '..');
    const entries = await readdir(appRoot, { recursive: true });
    const match = entries.find((entry) => basename(entry) === name);

    if (!match) throw new Error(`Resource not found under ${appRoot}: ${url}`);
    return readFile(join(appRoot, match), 'utf-8');
}

describe('PrismCanvasPinRowComponent', () => {
    let measure: PrismMeasureService;
    const phone = signal(false);

    beforeEach(async () => {
        phone.set(false);
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PrismMobileLayoutService, useValue: { mobile: phone } },
                { provide: PrismNavigationService, useValue: { activeComponent: signal(null) } },
                { provide: PrismRendererService, useValue: { activeVariantIndex: signal(0) } },
                { provide: PrismCanvasService, useValue: { measure: signal(false) } }
            ]
        });
        await resolveComponentResources(readAppResource);
        measure = TestBed.inject(PrismMeasureService);
        // Flushes the constructor's effects (see prism-measure.service.ts) so
        // their first, unconditional run lands here rather than inside a
        // test body, where it would otherwise race the fixture's own
        // `detectChanges()` and clear pins the test just committed.
        TestBed.tick();
    });

    it('should render nothing while there are no pins', () => {
        const fixture = TestBed.createComponent(PrismCanvasPinRowComponent);

        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.pin-row')).toBeNull();
    });

    it('should render one chip per pin, with the value', () => {
        measure.beginDraft(pt(0, 0));
        measure.updateDraft(pt(0, 24));
        measure.commitDraft();

        const fixture = TestBed.createComponent(PrismCanvasPinRowComponent);

        fixture.detectChanges();

        const chips = fixture.nativeElement.querySelectorAll('.pin-chip');

        expect(chips).toHaveLength(1);
        expect(chips[0].textContent).toContain('24 px');
    });

    it('should remove a pin when its dismiss button is pressed', () => {
        measure.beginDraft(pt(0, 0));
        measure.updateDraft(pt(0, 24));
        measure.commitDraft();

        const fixture = TestBed.createComponent(PrismCanvasPinRowComponent);

        fixture.detectChanges();
        fixture.nativeElement.querySelector('.pin-chip__x').click();
        fixture.detectChanges();

        expect(measure.pins()).toEqual([]);
    });

    /** The phone layout leaves the measuring tool out, and with it what a desktop session pinned. */
    it('should render nothing on a phone, even with pins', () => {
        measure.beginDraft(pt(0, 0));
        measure.updateDraft(pt(0, 24));
        measure.commitDraft();
        phone.set(true);

        const fixture = TestBed.createComponent(PrismCanvasPinRowComponent);

        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.pin-row')).toBeNull();
        expect(measure.pins()).toHaveLength(1);
    });
});
