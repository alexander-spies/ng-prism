import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The CSS invariants the viewport constraint rests on.
 *
 * None of them can be asserted against a rendered DOM: this package's specs run
 * under jsdom, which resolves no `var()`, and `PrismRendererComponent` uses
 * `viewChild.required`, which JIT cannot instantiate from SWC-compiled sources.
 * So they are asserted against the source text (the stylesheet, the template or
 * the class, whichever carries the claim), the way
 * `canvas-overlay-offsets.spec.ts` asserts the overlay offsets.
 *
 * Every one of them fails silently if it breaks: a wrong `container-type`
 * moves every visual-regression baseline while the canvas still looks right, a
 * grip that reads a custom property nobody publishes simply sits at the centre
 * of the stage, and one that ignores zoom cuts through the middle of the very
 * component it is supposed to bound.
 */
/*
 * Three files, not one: the renderer keeps its template and styles beside it
 * rather than inline, so each assertion below has to read the file that
 * actually carries what it claims. Pointing all three at one path is how this
 * breaks. A `block()` against the template finds no CSS rule and throws
 * `selector not found`, which reads like a deleted rule rather than a wrong
 * path.
 */
const RENDERER_CSS = join(__dirname, '../renderer/prism-renderer.component.css');
const RENDERER_HTML = join(__dirname, '../renderer/prism-renderer.component.html');
const RENDERER_TS = join(__dirname, '../renderer/prism-renderer.component.ts');

/**
 * `src` with every block comment removed.
 *
 * Without this, a selector named only in prose (say, a future comment that
 * happens to discuss `.demo-wrap {`) would be indistinguishable from the rule
 * that declares it, and `block()` below would silently slice comment text.
 */
function withoutComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * `src` with every run of whitespace collapsed to a single space.
 *
 * Every assertion below runs through this. Matching raw source made the checks
 * fail on a Prettier reflow rather than on a behaviour change, and this repo
 * runs `nx format:write` before every commit, so a declaration crossing the
 * print width would have broken tests that nothing about the CSS had changed.
 */
function flat(src: string): string {
    return src.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
}

/** The declarations inside the block a selector opens. Comments are stripped
 *  first, so this can only ever match a real CSS rule. Whitespace is flattened
 *  so a reflow cannot fail an assertion. */
function block(selector: string): string {
    const src = withoutComments(readFileSync(RENDERER_CSS, 'utf-8'));
    const start = src.indexOf(selector);

    if (start === -1) throw new Error(`selector not found: ${selector}`);
    const open = src.indexOf('{', start);
    const close = src.indexOf('}', open);

    return flat(src.slice(open + 1, close));
}

/**
 * The opening tag (attributes and all) of the element whose tag contains
 * `marker`, typically a `class="..."` literal.
 *
 * Narrower than searching the whole file: `[style.--prism-vp-w.px]` bound on the
 * wrong element would still make a file-wide "does this substring exist
 * anywhere" check pass, and that is the defect this constraint has to
 * catch (see the first test below).
 */
function openingTag(marker: string): string {
    const src = readFileSync(RENDERER_HTML, 'utf-8');
    const markerPos = src.indexOf(marker);

    if (markerPos === -1) throw new Error(`marker not found: ${marker}`);
    const tagStart = src.lastIndexOf('<', markerPos);
    const tagEnd = src.indexOf('>', markerPos);

    return flat(src.slice(tagStart, tagEnd + 1));
}

describe('viewport CSS invariants', () => {
    it('publishes --prism-vp-w on the stage, not on .demo-wrap, so the grips (its siblings) can still read it', () => {
        // The grips are outside .demo-wrap. Moving the binding from the stage's
        // tag onto .demo-wrap's would still contain the substring somewhere in the
        // file, but the grips would then read an unset --prism-vp-w, their calc() would
        // fall back to auto, and both would silently collapse to the stage centre.
        const stageTag = openingTag('class="prism-canvas-stage"');

        expect(stageTag).toContain('[style.--prism-vp-w.px]=');

        // And it reads the capture-aware computed, never the service signal
        // directly. Binding the raw signal is what left capture mode safe only by
        // reachability argument: a capture run recorded at a constrained width
        // would have had no visible chrome to reveal it.
        expect(stageTag).toContain('[style.--prism-vp-w.px]="viewportWidth()"');
        expect(stageTag).not.toContain('canvasService.viewportWidth()');

        const demoWrapTag = openingTag('class="demo-wrap"');

        expect(demoWrapTag).not.toContain('--prism-vp-w');
        expect(demoWrapTag).not.toContain('canvasService.viewportWidth()');
    });

    it('confines container-type to the constrained state', () => {
        // container-type: inline-size implies contain: inline-size. On the
        // width:auto inline-block that .demo-wrap is at rest, that would decouple
        // its width from its contents and shift every recorded VRT baseline.
        const resting = block('.demo-wrap {');

        expect(resting).not.toContain('container-type');

        const constrained = block('.demo-wrap[data-viewport] {');

        expect(constrained).toContain('container-type: inline-size');
    });

    it('lets an explicit viewport width out of the stretch layout cap', () => {
        const constrained = block('.demo-wrap[data-viewport] {');

        // A plain substring check for "width: var(--prism-vp-w)" would also match
        // inside "max-width: var(--prism-vp-w)". The lookbehind rules that out.
        expect(constrained).toMatch(/(?<!-)width:\s*var\(--prism-vp-w\)/);
        expect(constrained).toContain('max-width: none');

        // Both selectors weigh (0,2,0), equal specificity, so the cap above only
        // loses to this rule because it is declared later in the stylesheet.
        // Reordering the two would silently cap every canvasLayout: 'stretch'
        // component at 800px again while the canvas still looked correct at
        // narrower widths, and no other assertion here would notice.
        const src = withoutComments(readFileSync(RENDERER_CSS, 'utf-8'));

        expect(src.indexOf('.demo-wrap[data-viewport] {')).toBeGreaterThan(src.indexOf(".demo-wrap[data-canvas-layout='stretch'] {"));
    });

    it('derives both grip positions from --prism-vp-w and --zoom rather than measuring', () => {
        // .demo-wrap is centred in the stage and then scaled in place by --zoom,
        // so each edge sits half the *painted* width (--prism-vp-w times --zoom) away
        // from the middle. Checked per rule rather than file-wide: a single
        // occurrence (e.g. .vp-grip--end regressing to a bare `right: 0`) would
        // still satisfy a check that only asks whether the pattern exists
        // somewhere in the file. The `getBoundingClientRect` guard lives in its own
        // test below, scoped to the class body. A JS API can never appear inside a
        // CSS declaration block, so checking for it in `rule` here could never fail.
        const left = block('.vp-grip {');
        const end = block('.vp-grip--end {');

        for (const rule of [left, end]) {
            expect(rule).toContain('calc(50% - var(--prism-vp-w) * var(--zoom, 1) / 2');
            expect(rule).toContain('var(--zoom');
        }
    });

    it('never measures the DOM to answer a viewport drag', () => {
        // Scoped to the one method a drag runs through, not to the whole class.
        // A file-wide ban was the first attempt and it was over-broad in both
        // directions: it sat inside a CSS `block()` result where a JS API can
        // never appear, and once moved to the class body it would have failed for
        // any future renderer feature that legitimately measures something
        // unrelated to the grips. The claim worth holding is narrower: the grips
        // are positioned by arithmetic over --prism-vp-w and --zoom (asserted
        // above), and the drag that feeds them reads no layout.
        const src = withoutComments(readFileSync(RENDERER_TS, 'utf-8'));
        const at = src.indexOf('protected onViewportResize(');

        if (at === -1) throw new Error('onViewportResize not found');
        const body = src.slice(at, src.indexOf('\n  }', at));

        for (const api of ['getBoundingClientRect', 'offsetWidth', 'clientWidth', 'getComputedStyle']) {
            expect(body).not.toContain(api);
        }
    });

    it("binds --zoom on the stage, which the grips' calc() and .demo-wrap both depend on", () => {
        // .demo-wrap's own --zoom binding is redundant (it would inherit the
        // stage's), but it stays for reasons unrelated to this file. What matters
        // here is that the stage keeps binding it at all, since both grips read
        // --zoom from the cascade and would silently drift to the stage's
        // fallback of 1 if this binding were ever removed.
        const stageTag = openingTag('class="prism-canvas-stage"');

        expect(stageTag).toContain('[style.--zoom]="canvasService.zoom()"');
    });

    it('centres the specimen at the container, never with text-align', () => {
        // text-align: center is the obvious way to centre an inline-level child
        // here and the wrong one. The specimen is created through
        // ViewContainerRef, so its host element carries none of the renderer's
        // _ngcontent attribute and no scoped rule in that file can reach it to
        // undo an inherited value. text-align would leak all the way in and
        // silently re-align the specimen's own text whenever the viewport is
        // switched on. Centring at the container touches nothing inside it.
        const centred = block(".demo-wrap[data-viewport]:not([data-canvas-layout='stretch']) {");

        expect(centred).toContain('display: grid');
        expect(centred).toMatch(/justify-items:\s*safe center/);
        expect(centred).not.toContain('text-align');
        expect(block('.demo-wrap[data-viewport] {')).not.toContain('text-align');
    });

    it('leaves a stretch showcase out of the centring, so it fills the viewport width as it fills the canvas at rest', () => {
        // Centring shrinks a grid item without a width of its own to its
        // content. Under stretch that item is often ng-prism's composition
        // wrapper, so a subject with width: 100% came out as wide as its
        // content, and a horizontal divider (display: block, no width) as 0px.
        // A stretch .demo-wrap has to keep its resting display: block instead.
        const constrained = block('.demo-wrap[data-viewport] {');

        expect(constrained).not.toMatch(/(?<!-)display:/);

        // Not on the shared rule either: browsers align block-level children in
        // block layout by justify-items too, so it would centre and shrink them
        // on the stretch box just as the grid did.
        expect(constrained).not.toContain('justify-items');
    });

    it('gives each grip a guide line that spans the stage', () => {
        // The handle alone says where you may pull but not what is being pulled.
        // place-self: stretch center carries the line the full height (the
        // align-self half) while keeping it centred in the shared grid cell
        // (the justify-self half, folded into the same shorthand by stylelint's
        // redundant-longhand rule); a fixed height here would turn it back into
        // a second nub.
        const line = block('.vp-grip::after {');

        expect(line).toContain('place-self: stretch center');
        expect(line).toContain('width: 1px');
        expect(line).toContain('--prism-measure');

        // Both pseudo-elements must sit in the same grid cell, or grid's default
        // auto-flow stacks the handle above the line instead of on it. Asserted on
        // each rule separately because they are written separately. A grouped
        // selector would make `block()` ambiguous for whichever of the two it
        // named last, which is how this test first failed.
        const handle = block('.vp-grip__bar {');

        expect(handle).toContain('grid-area: 1 / 1');
        expect(line).toContain('grid-area: 1 / 1');
    });

    it('spans the dimension line across the painted width', () => {
        // Locked to the same --prism-vp-w * --zoom product the grips use: the rule
        // measures the distance between them, so a dimension line on a different
        // factor would draw a measurement of something that is not there.
        const dim = block('.vp-dim {');

        expect(dim).toMatch(/width:\s*calc\(var\(--prism-vp-w\)\s*\*\s*var\(--zoom, 1\)\)/);

        // The end ticks are what make it read as a measurement of the span rather
        // than as a divider laid across the canvas.
        const tick = block('.vp-dim__rule::before {');

        expect(tick).toContain('height: 7px');
        expect(tick).toContain('width: 1px');
    });

    it('refuses to shrink below the width it was asked for', () => {
        // The stage is a flex container and .demo-wrap is its only item, so the
        // default flex-shrink: 1 renders the box narrower than the requested width
        // whenever the canvas is the smaller of the two, and container-type drops
        // the automatic minimum size to zero, so nothing stops it. The failure is
        // silent and total: the dimension line states 1024 while every @container
        // rule in the specimen answers whatever the canvas allowed.
        const constrained = block('.demo-wrap[data-viewport] {');

        expect(constrained).toMatch(/flex:\s*none|flex-shrink:\s*0/);
    });

    it('centres each grip on the edge its dimension tick marks', () => {
        // The guide line is centred in the grip, and the dimension line's end
        // ticks sit at exactly +/- half the width from the middle. So the grip's
        // own offset has to be half its width, or the two overlays bracket
        // different regions. They were 8.5px apart on each side, while the docs
        // claimed both marked "the two edges the grips can be dragged to".
        const grip = block('.vp-grip {');
        const width = /width:\s*(\d+(?:\.\d+)?)px/.exec(grip);
        const offset = /\/ 2 - (\d+(?:\.\d+)?)px\)/.exec(grip);

        expect(width).not.toBeNull();
        expect(offset).not.toBeNull();
        expect(Number(offset![1])).toBeCloseTo(Number(width![1]) / 2, 5);

        // and the far grip has to use the same offset in the other direction
        const end = block('.vp-grip--end {');

        expect(end).toContain(`/ 2 - ${offset![1]}px)`);
    });

    it('keeps the guide line out of the hit test', () => {
        // The grip element is the guide line's full-height track, running from the
        // overlay band to the bottom of the stage at z-index 4, straight over
        // prism-canvas-bg-pill at z-index 2. Hit-testable, it made part of the
        // pill's Reset button unreachable whenever a viewport was on. Only the bar
        // takes pointer events back.
        expect(block('.vp-grip {')).toContain('pointer-events: none');
        expect(block('.vp-grip__bar {')).toContain('pointer-events: auto');
    });

    it('leaves the hit box larger than the mark it draws', () => {
        // content-box sizing plus background-clip is what paints a 3px bar inside
        // a 9px target: drop either and the grip becomes as thin to hit as it
        // looks.
        const bar = block('.vp-grip__bar {');

        expect(bar).toContain('box-sizing: content-box');
        expect(bar).toContain('background-clip: content-box');
        expect(bar).toMatch(/padding:\s*\d+px \d+px/);
    });
});
