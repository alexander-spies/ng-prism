# Canvas State

The canvas (`PrismRendererComponent`) is governed by cooperating services with distinct responsibilities: durable preferences, the effective background, and the forced pseudo states.

## `PrismCanvasService`

Holds the user's globally persisted canvas preferences:

- `bg`: global default canvas background (any `CanvasBg`: `dots | plain | light | dark | checker | transparent`)
- `zoom`, `guides`, `rulers`: set from the floating canvas rail; guides and rulers are toggle buttons on the rail itself, zoom is a chooser in the rail's tools menu
- `viewportWidth`: `number | null`; the width `.demo-wrap` is constrained to, or `null` for unconstrained. Toggled from the rail, set from the **Width** chooser in the tools menu, and dragged from the grips at either edge of the constrained area.

State is persisted to `localStorage` under the key `ng-prism-canvas`. This is the source of truth for the user's preferred working environment across sessions.

## `PrismVariantBgService`

Computes the actually-applied canvas background by resolving a fallback chain:

```
effective = override  ??  variant.bg  ??  component.bg  ??  canvas.bg()
```

- `recommended`: computed from the active component and variant (`Variant.bg` wins over `ShowcaseConfig.bg`)
- `override`: read-only view of a transient signal; set when the user picks a background from the tools menu's **Canvas** group while a recommendation is active
- `effective`: the final `CanvasBg` value bound to the `data-bg` attribute of `.prism-canvas-stage`
- `isDeviating`: computed boolean; true when the override is non-null AND differs from the current recommendation

The override auto-clears whenever the active variant or component changes, so navigating back to a variant always shows its recommendation again.

### Why a separate service?

`PrismCanvasService` owns durable user preferences; `PrismVariantBgService` owns the transient, computed effective state. Keeping them separate preserves the user's global default when they temporarily deviate within a single variant.

## `PrismPseudoStateService`

Decides which pseudo states the canvas forces, following the same pattern as the background. The addressed cell is a variant and, optionally, a component-level state (`ShowcaseConfig.states`), and both bring pseudo states of their own. The service keeps them in two layers, because only the state's is subject to the fit rule:

```
base  = variant.pseudo, with the user's toggles on top
state = the active state's pseudo, with the user's toggles on top
```

Capture mode skips the toggles: both layers are what is declared.

- `declared`: `Variant.pseudo` of the active variant, or `null`
- `activeState`: the `ShowcaseState` at `PrismRendererService.activeStateIndex`, or `null`. The index is part of the addressed cell next to `activeVariantIndex`, not a browse toggle. It survives a variant change, so a column of states can be clicked through, and goes back to `null` when the component changes, or when a refresh leaves the component with fewer states than the index. A state slot the scanner could not evaluate (`pseudo: {}`) is still an active state, with an empty layer.
- `stateExclusion`: `'states: false'` while a state is active and the active variant opts out with `Variant.states: false`, else `null`. The state layer is `null` then, and the state declares nothing.
- `override`: transient per-state toggles from the tools menu's **State** group. `true` adds a state on the whole component, `false` switches off one the variant or the state declares. Cleared whenever the active variant, the active state or the component changes, and ignored in capture mode, because session UI state must not shape a baseline. The active state, in contrast, applies in capture mode: it addresses the cell.
- `layers`: `{ base, state }`, computed by `splitLayers()`. A toggle switched off takes the state out of both layers. A toggle switched on leaves a target the variant or the state declares in its own layer, and otherwise forces the state on the whole component in `base`, where the fit rule does not reach it. A state that does not fit is not applied, so it does not count as declaring anything here: `splitLayers()` takes a `stateFits` flag, and with `false` a class only the state declares is forced on the whole component by the toggle. The state layer is the same either way, since the marker still needs it to see when the state fits again. The state layer is `null` when no state applies or when the toggles have switched off every class the state declares, so a deliberate toggle never reads as a state that forces nothing. A state that declares nothing itself (a slot the scanner could not evaluate) stays an empty object, which the marker reports as not fitting. While nothing is toggled both layers are the declared objects themselves, not copies, because the render marker compares by identity (below).
- `canvasFit`: whether the active state fits the rendered canvas, a `StateFit` the renderer writes from its marker, `null` while no state is applied. `isForced()` counts a class of the state layer only while `canvasFit()?.fits`, and `isDeclared()` counts the classes of the variant, and those of the active state while it fits (`canvasFit` still `null` before the first render counts as fitting), so the tools menu can tint both.

The service also owns the document's `PseudoStyleSheets`, which every marker shares, so each stylesheet is rewritten once whether the Playground or an Overview cell forces a state first.

### Markers

A `PseudoStateMarker` forces states on one rendered component: it puts the stand-in classes (`prism-pseudo--<state>`) on the targeted elements and holds the shared stylesheets while it does, which widens every selector using one of the pseudo-classes in place, `:hover` to `:is(:hover, .prism-pseudo--hover)`. The rule keeps its position and its specificity, and without the class it matches exactly what it matched before. A copy keyed on the class was the first design and is wrong for negation: the copy of `.row:not(:hover) .actions` matches every row without the class, a really hovered one included. A `MutationObserver` on the component re-marks elements rendered later and follows elements whose classes or attributes make them start or stop matching a selector. `PseudoStyleSheets` watches `document.head` only while some marker holds it.

The marker takes the two layers separately, `apply(root, states, state?)`. `states` is forced as given, the way `Variant.pseudo` always was. `state` is forced only where it fits (`evaluateStateFit()` in `pseudo/state-fit.ts`): every one of its pseudo-classes needs a reachable target, and only the reachable targets get the class. Every pass measures the same DOM, whatever the previous pass left: it first puts the variant's classes and the state's on all of the state's targets at once, then evaluates the fit and the reach, then takes the state's class off the targets that cannot be reached, or off all of them when the state does not fit. The first pass, which `data-prism-rendered` waits for, therefore marks what any later one would, a target revealed by another forced hover counts, and a rule that sets `pointer-events: none` under its own `:hover` reads as not fitting. The records of these writes are dropped (`takeRecords()`), so a pass never sets off another. The fit is evaluated again on every pass the component's own DOM changes set off, so a control that removes a target (`removable` on a chip) flips it. `applied()` reports the exact `states` and `state` objects it was given, plus the `fit` (`null` without a state), which is how `PrismPseudoStateService.canvasFit` gets its value.

The renderer has one marker for the canvas. An effect applies the two layers to the rendered host element, `apply(element, layers().base, layers().state)`. A second effect writes `marker.applied()?.fit ?? null` to `canvasFit`, and only that: it never reads `canvasFit` back, and the value is `null` whenever no state layer is applied, so the fit of the previous state cannot linger. `layers` has an `equal` that compares `base` and `state`, so the override reset that every variant, state or component change triggers (it writes a fresh `{}`) does not re-apply the marker for the same two objects.

`renderedKey` withholds `data-prism-rendered` while the base forces something or a state layer is set, until `marker.applied()` reports that exact element and those exact `states` and `state` objects (`resolveRenderedKey()` in `renderer/rendered-key.ts`). The key is `<className>:<variantIndex>`, with `:<stateIndex>` appended while a state is active, an opted-out variant included (its state layer is `null`, the index is in the key regardless). A variant that forces nothing and has no state layer is not held back. `excludedReason`, `resolveExcludedReason()` in the same file, is the value of `data-prism-excluded`: `stateExclusion` while the variant opts out, else the `reason` of the marker's `fit` when it does not fit, else `null`, and always `null` without an active state. `.demo-wrap` carries the forced states in `data-pseudo`, taken from `appliedStateNames()`, so the active state's classes count only while it fits. That is what capture mode keys the room for focus rings on, and an excluded state gets none.

Each Overview cell creates its own marker and applies the variant's declared states, and a matrix cell also its column's state as the state layer, so a state never leaks into a neighbouring cell. A matrix cell reports the marker's fit to the matrix (`fitChange`), which counts it in the column header. When the state does not fit, the cell clears the marker and the component and shows a dashed placeholder with the reason in its place, since a picture of the plain variant would sit under a label that says something else. The tools menu's toggle does not reach the Overview.

## Viewport Width

`viewportWidth` narrows `.demo-wrap` so a layout can be checked at a given width without resizing
the browser. The state is a single nullable number instead of a device list, because the tool is
for finding where a layout breaks. Presets (320, 390, 480, 640, 768, 1024) are named values of that
number, and a drag snaps to one when it comes within 8px. A drag is clamped to between 100 and 1600,
regardless of preset. The floor sits well below any real device so you can find where a layout
gives up.

### The specimen is centred at the container

While constrained, `.demo-wrap` is a grid with `justify-items: safe center` and `flex: none`, so a specimen narrower than
the viewport sits in the middle of it rather than against its left edge. Sizing is unchanged by
this: a block-level specimen shrink-wraps here as it already does at rest inside the
`inline-block` wrapper, and one that asks for `width: 100%` (the `canvasLayout: 'stretch'` case)
still receives the whole viewport.

`flex: none` is required too: the stage is a flex container and `.demo-wrap` is its only item, so the
default `flex-shrink: 1` would render the box narrower than the requested width whenever the canvas is
smaller, and `container-type` drops the automatic minimum size to zero. The stage is `overflow: auto`, so
the box scrolls instead of shrinking.

The `safe` keyword matters as well: bare `center` spills a specimen wider than the constraint equally
past both edges, whereas a real viewport of that width clips at zero and scrolls in one direction.
`safe` falls back to `start` when the item overflows.

The centring uses the container instead of `text-align: center`. The specimen is created through
`ViewContainerRef`, so its host element carries none of the renderer's `_ngcontent` attribute and
no scoped rule can reach it to undo an inherited value. A `text-align` on the wrapper would leak
into the specimen and re-align its text whenever the viewport was switched on.

### Container queries respond; media queries do not

A width constraint narrows a box but does not change what `@media (max-width: ...)` sees, which is
the real browser viewport. A component using media queries stays in its desktop layout however
narrow the box gets. `@container` does respond: `.demo-wrap` carries `container-type: inline-size`
while constrained, so a component written against container queries reflows as it would in
production.

Emulating media queries would mean rendering the component in an iframe, which would take
`plugin-box-model` and every other overlay its target, since overlays render as Angular components inside
`.demo-wrap`. The width constraint is the cheaper option.

### Not in the URL

Like `zoom`, `guides` and `rulers`, the viewport width is a `localStorage` preference and not a URL
parameter. `PrismUrlStateService` carries navigation only (which component, service, pipe, page, variant, state, view
and panel you are looking at) and no canvas setup.

### Capture mode

Capture mode never restores a persisted width, so a run always starts unconstrained and no viewport
from an earlier session can leak into a baseline. The grips and the dimension line sit inside the
renderer's `@if (!capture.active())` block, alongside the crosshair, the rulers and the background
pill. Capture mode also never _writes_ the width back to storage (`PrismCanvasService.save()` is a
no-op while capture is active), so a capture run cannot corrupt the user's stored preference either.

## Measuring

The measuring tool adds a third kind of state to the two services above: a point, stored in `.demo-wrap`-local CSS pixels, and an overlay drawn as a sibling of `.demo-wrap`, deliberately never a child of it.

### Local coordinates, not screen coordinates

A `MeasurePoint` is recorded via `toLocal` in the same coordinate space `.demo-wrap` itself occupies before its own transform is applied — not in screen coordinates. The distinction matters because `.demo-wrap` carries `transform: scale(var(--zoom))`: a screen-pixel gap between two points on a zoomed-out canvas is smaller than the CSS-pixel distance the component itself renders at. Storing a point already inside that pre-scale space means the distance between two of them (`measureDistance`, a plain `Math.hypot`) is already the real CSS-pixel distance — `formatMeasure` never has to divide by `zoom` to print it.

It also means a pin survives a zoom change instead of being tied to the screen position it was drawn at. `toScreen`, the inverse of `toLocal`, re-projects every point on every render, reading whatever `zoom` currently is; a pin placed at 50% and viewed back at 200% is recomputed from its stored CSS-pixel position, rather than replaying the screen coordinates captured the first time. The alt-hover four-sided readout takes the opposite route to the same destination: `quadSpans` reads screen-space boxes straight from `getBoundingClientRect()`, so `quadLines` divides by `zoom` once, by hand, before formatting — the one place the overlay needs an explicit division, because that reading starts in the other coordinate space.

### Why the label moves at 28px

`MEASURE_LABEL_MIN_SPAN` (28) is evaluated against the _projected_ span — the on-screen distance between the two ticks after `toScreen` — not the CSS-pixel value the label prints. That split matters: a measurement can be a large number and still render as a short line on screen at low zoom, and it is the rendered length, not the number, that decides whether the end ticks and the value can share the space without overlapping. Below 28px the value steps aside, perpendicular to the line, by `MEASURE_LABEL_OFFSET` (15px) — but which side it steps toward is not fixed to one reference point across both callers of `labelPlacement`. The primary drag and pin measurements push it away from the specimen's own centre (`specimenCentre()`); the alt-hover quad readout instead pushes it away from the centre of whichever element is currently hovered (`hover()` computes that centre fresh from `boxOf(targetEl)` on every call). Same mechanism, a different "away from" depending on what is actually being measured — and either way, a short measurement inside a single small component never buries its own number under its own ticks.

### Two coordinate systems, and the projection between them

A stored `MeasurePoint` is `.demo-wrap`-local; every rect the overlay reads — `.demo-wrap`'s own for the projection origin, the specimen's for the label reference point, an element's for the four-sided readout — comes out of `getBoundingClientRect()` and is therefore in _viewport_ coordinates, measured from the corner of the window. Neither is the space the overlay draws in. `.m-svg` is `inset: 0` on the host, so its user coordinates begin at the host's top-left corner, and `.m-label` is placed with `left`/`top` against the same corner. `toHostSpace` is the one subtraction that closes the gap, applied to every drawn coordinate right after `toScreen` and inside `boxOf`. Skip it and the stored numbers stay exactly right while every line, tick, echo, outline and label is translated by the stage's screen offset — down by the header, right by the sidebar — which on a normal shell puts most of the drawing outside the stage. It is a pure function taking the host rect rather than reading one, because jsdom reports every rect as zero and a test routed through the DOM could not tell the subtraction from its absence.

### Where the overlay sits in the stack

`<prism-canvas-measure>` carries `z-index: 1`, and both the floor and the ceiling are load-bearing. It needs one at all because `.demo-wrap` is `position: relative` with a `transform` — a stacking context of its own — and renders _after_ the overlay in the template: at `z-index: auto` the two paint in tree order, `.demo-wrap` wins, and the overlay's marks disappear behind the specimen while its `pointerdown` never arrives, which takes alt-click anchoring with it. And it has to be the lowest of the stage's overlays — below the background pill at 2, the rulers, grips and dimension line at 4, and the toolrail at 5 — because it is the only one that takes pointer events across the stage's whole area: above the pill it covers that pill's Reset button, and above the rail it covers the button that switches the tool back off.

Sitting above `.demo-wrap` is also what makes `elementUnderPoint` read the hit list rather than its topmost entry. The overlay is now the topmost hit for every point over the specimen, so `document.elementFromPoint` answers the overlay itself; `document.elementsFromPoint` and the first entry the rendered root contains gives the element actually underneath. The `contains` guard stays either way, because the toolrail and the grips sit above the overlay and would otherwise be snapped to.

### Core chrome, not a plugin overlay

`<prism-canvas-measure>` sits inside `.prism-canvas-stage` as a sibling of `.demo-wrap`, gated only by `canvasService.measure()` and the same `@if (!capture.active())` guard the crosshair, the rulers and the background pill sit behind — never by which panel is active. A plugin overlay does not have that option: it is rendered as an ordinary Angular component _inside_ `.demo-wrap`, through `NgComponentOutlet` bound to the active panel. Two problems follow from sitting there instead. It is scaled by the same `transform: scale(var(--zoom))` `.demo-wrap` carries, so a label sized at 10px in the overlay's own CSS renders at 5 real screen pixels the moment zoom drops to 50% — the same shrink the specimen itself gets. And it is confined to `.demo-wrap`'s box the way `plugin-box-model`'s own overlay is, whose host sits at `inset: 0` relative to `.demo-wrap` with its own `overflow: hidden`, so a margin box that would extend past the specimen's edge is clipped exactly there. Neither problem is particular to box-model's overlay specifically — both are what any component rendered inside a scaled, bounded box inherits for free, and both are exactly wrong for a tool whose job is comparing two elements that are not necessarily at the same place or the same apparent size on screen.

The deeper reason is architectural rather than visual: a panel overlay is _about_ the active panel — box-model's overlay only makes sense while the Box Model panel is open. Measuring is not about any panel; it is orthogonal to them, chrome for the whole canvas the way guides and rulers are, rather than for one view. `resolveOverlay()` makes that explicit rather than incidental: it resolves to `{ kind: 'none' }` whenever the measuring tool is active, regardless of which panel is selected, and a lazy panel overlay is never even fetched while it runs — the two are never competing for the same pointer. The function's own doc calls this a bridge: once the tool can attribute a measured gap to the CSS property that produced it, the box-model plugin has nothing left that it alone can do, and the reason for keeping them apart dissolves with it.

## UI Affordances

- **Tools menu, State group:** a row of chips for `ShowcaseConfig.states` (`buildStateChips()` in `canvas/state-chips.ts`), at most one on: a click calls `PrismRendererService.selectState()`, and a click on the active chip passes `null`. A chip whose state does not fit the shown variant (`chipFits()`, the canvas's own `canvasFit` for the active one) gets `is-na`, a dashed border, and the reason in its tooltip; it stays selectable. Below the chips, one toggle per pseudo state, several can be on at once. `is-on` follows `isForced()`, the tinted `is-rec` border `isDeclared()`: the states the variant declares and those of the active state while it fits, mirroring the Canvas group.
- **Tools menu, recommendation marker:** the recommended background's button in the **Canvas** group carries a tinted border (driven by `recommended()`) instead of a separate glyph. Title attribute: `Recommended background for this variant`. Passive, always visible while a recommendation is active.
- **Canvas pill:** `Recommended: <bg> [Reset]` appears in the top-left of the canvas only when `isDeviating()` is true (actionable; the button clears the override and returns to the recommendation).
- **Tools menu, active state:** the active background button binds to `effective()` and carries the filled `is-on` state. Clicks write to the override when a recommendation exists; otherwise they update the persisted global default (backward-compatible behavior for components without `bg`). The recommended and active buttons can be the same one.
- **Dimension line:** a horizontal rule spanning the painted width at the top of the stage, in `--prism-measure`, with the value set into a gap at its centre and a short vertical tick at each end. The ticks make it read as a measurement instead of a divider, and they mark the two edges the grips can be dragged to. It is the third resident of the overlay band (pill left, dimension centre, rail right) and reads the same `--prism-canvas-overlay-top` as the others, so enabling rulers moves all three together. Its width carries the same `--prism-vp-w * --zoom` product the grips use, so the three stay locked together.
- **Edge grips:** one straddling each edge of the constrained area, each a handle sitting on a faint 1px guide line that runs the full height of the stage. Only the handle is clickable: the line's full-height track is `pointer-events: none`, or it would cover the background pill's Reset button whenever a viewport is on. The handle's hit box is larger than the mark it draws (`background-clip: content-box` over padding), and the same widths are reachable from the **Width** chooser for anyone who cannot hit a 9px target. The line makes the constrained area read as a region instead of two loose handles; it crosses the specimen, so it stays faint and brightens with the handle on hover, drag and focus. The grips run on `prismResizer` with `scale` `-2 / zoom` and `2 / zoom`: `.demo-wrap` is centred and scaled by the canvas zoom, so an edge moving by `d` changes the width by `2d / zoom`, which keeps the grip under the cursor at any zoom level. Both are keyboard-reachable and expose `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. ArrowRight and ArrowUp widen by 10px on either grip and ArrowLeft/ArrowDown narrow, with Home and End jumping to the floor and the ceiling. The pointer inversion that lets the left grip track the cursor does not apply to the keyboard, because two separators announcing the same `aria-valuenow` must not move it in opposite directions for the same key.
- **Rail width readout:** a second line under the zoom percentage on the floating toolrail, shown only while the viewport constraint is on. It renders the active width with a `px` suffix (`390px`), since a bare number directly under a `100%` line would read ambiguously.
