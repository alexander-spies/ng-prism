# Measuring

Guides and rulers tell you where things sit on the canvas; the measuring tool answers a narrower, more literal question — exactly how many pixels sit between these two points, in this layout, right now. It is not a correctness check. It does not know what the right answer should have been; it only reports the one that is actually rendered.

## Turning it on

The measuring tool is a toggle button on the floating canvas rail, next to guides, rulers and the viewport-width constraint. Switching it on is a working-environment preference, not a statement about the component you happen to be looking at: like zoom, guides and rulers, it is written to `localStorage` and comes back exactly as you left it the next time you open the showcase, in any component, in any variant.

On a phone the rail has no measuring button: since 22.7.0 the [phone layout](guide/first-showcase.md#on-a-phone) leaves the tool out, along with guides, rulers and the viewport width, and the canvas shows none of them. They come back as you left them once the window is wide again.

## Measuring a distance

Press and drag from one point to another; releasing the pointer finishes the measurement. Press and _release_ without moving does not: a click is not a drag, and a zero-length measurement is not the statement "0 px" — it is no statement at all, so it is discarded rather than dropped into the pin row for you to clear by hand. Only the primary button starts a measurement; a right-click is ignored outright, because the context menu would take the pointer away and leave a half-finished measurement following the cursor with no button held. While dragging, each endpoint latches onto the nearest border, padding or content edge of whatever element sits under the pointer, as long as one is within 8 screen pixels — screen pixels, not CSS pixels, because the precision of a hand should feel the same whether the canvas is zoomed to 50% or 200%.

A latched endpoint draws a short dotted tick retracing the exact edge it locked onto. That echo is deliberately a footnote and not a second measurement — shorter than the edge itself and noticeably fainter than the measurement line — but it earns its place: a 2px border puts the border, padding and content edges exactly 2 pixels apart, and without the echo there is no way to tell which of the three was actually meant.

Hold **Shift** while dragging and the measurement is pulled onto whichever of the eight 45-degree directions it lies nearest — horizontal, vertical, or one of the four diagonals. It is the same service Shift performs in Photoshop, Illustrator and Figma, and it is what makes an exactly straight measurement reachable by hand rather than by patience. Releasing Shift frees the drag again immediately, mid-drag included; nothing about the constraint is remembered.

The constraint runs _on_ the snapped point rather than instead of it, which is what keeps the two features from fighting. Drag horizontally while the endpoint latches onto a left edge at x=338 and you keep that x and gain an exactly flat line — precise on both counts. The one thing that cannot survive is a latched edge lying across the direction being forced: forcing the vertical off a top edge moves the point off that edge, so the dotted echo is dropped rather than left marking an edge the point has since left. A diagonal moves the point on both axes at once and so drops any echo.

The projection is orthogonal, not length-preserving. A drag 240 across and 7 down reports 240, the distance along the line actually drawn — printing 240.1 beside a flat line would be quoting a hypotenuse that is not there.

> Shift means something else on the keyboard, where it enlarges the arrow-key step to 10 pixels. The two never meet: one needs a pointer held down, the other needs none.

Nothing in range is a perfectly valid outcome too. A point with nothing to snap to simply drops wherever the pointer is, in the open space between elements — the tool measures open space exactly as readily as it measures an edge.

Whatever the document did not pin is reported in whole pixels. A point that latched onto nothing is the cursor minus the specimen's own offset, and because `.demo-wrap` is centred that offset is itself fractional — a left edge at 824.3594 and the like. The decimals a free measurement used to show described where the specimen happened to sit, not what was being measured, so they are rounded away.

The rounding is per axis, not per point, which is what keeps it from discarding the fractions that are real. Only one axis of a snapped point comes from the document: an endpoint latched to a left edge takes that edge's exact x, while its y is still the raw cursor carrying the same offset as a free point. So the latched axis is kept exactly and the other is rounded. Measured against this repo's own fixtures, about a fifth of the distances between a parent and its child are genuinely fractional — a toggle knob centred at 2.5px in its track, an avatar's glyph sitting 6.8281 from one side and 6.8438 from the other — and rounding those away would hide the asymmetry a ruler exists to reveal.

Values are printed to at most one decimal, and whole values carry none at all. One decimal is a deliberate floor rather than an accident: it is enough to show that a gap is 2.5 and not 3, and short enough to read at a glance. It does mean two readings that differ in the second decimal print the same number, so `left 6.8, right 6.8` is not a promise of symmetry.

A measurement constrained with Shift is the one place fractions survive on purpose. Projecting onto a diagonal multiplies by √2/2, and the distance between two whole points on a 45-degree line is irrational in any case; rounding there would trade the exact angle Shift just promised for a tidier number.

The value sits at the midpoint of the line for anything long enough to hold it; short measurements move the number aside instead of letting it collide with its own end ticks. The result is also announced through a polite live region, so the measurement is available to a screen reader, not only to whoever is looking at the canvas — the four-sided readout below included, which is spoken with each side named and the unit restored (`top 16 px, right 8 px`), since neither position nor an implied unit survives being read aloud.

## Comparing two elements

Hold Alt without clicking and whatever sits under the pointer is outlined in the same dashed shape an anchor takes, at half the weight — a prediction of what a click would fix, so the choice is visible before it is made. Clicking firms the outline up and it stops following the pointer; those two changes together are what tell you the anchor registered. The preview only appears while nothing is anchored yet, since once an anchor exists the hovered element already carries its own solid outline and the spans between the two.

Alt-click an element to fix it as the anchor. It is outlined with a dashed rectangle the moment it is fixed, before anything else is hovered — that outline is the confirmation the click registered, and it is also what tells the two ends of a single one-sided reading apart. From there, holding Alt and moving the pointer over other elements outlines whatever is underneath with a solid rectangle and draws every gap between the two — up to four lines, one per side.

Two distinct readings come out of the same four numbers. When one of the two sits entirely inside the other, the four lines read as insets — exactly the reading you want to make a container's padding visible on every side at once. Which one you anchored doesn't matter: anchoring a heading and hovering its card reads the same insets as anchoring the card and hovering the heading. When the two don't contain one another, only the sides that actually face open space draw a line at all; a side with nothing between the boxes draws nothing, and two elements that overlap on both axes report nothing on any side — there is no gap there to put a number on, which is the correct statement, not a tool that gave up.

The anchor stays fixed across repeated alt-hovers: let go of Alt, move the pointer elsewhere, hold Alt again, and you're still comparing against the same element. It only changes on a new Alt-click, on switching variant or component, or on turning the tool off. Hovering back onto the anchor itself draws no spans — there is no distance from an element to itself — but its dashed outline stays, so the anchor never silently disappears.

## Keeping measurements

A finished drag is already a pinned measurement; there is no separate step to pin it. Releasing the pointer drops it straight into a row below the canvas, each one shown as a small chip with its value and its own remove button.

That row lives below the canvas rather than floating over it because the space above the canvas is already spoken for — the background pill on the left, the dimension line in the centre, the toolrail on the right — and a fourth floating surface there would be the first to collide with one of the other three.

Pins outlive switching the tool off and back on; the toggle only clears whatever draft was mid-drag and drops the alt-hover anchor, so an accidental tap on the rail button doesn't cost you measurements you already took. What does clear them is navigating to a different variant or component: a pinned number describes this particular rendering, and carrying it into a different layout would present a stale measurement as though it still applied. None of it is ever written to storage — a reload starts exactly as clean as switching variants does.

## Keyboard

Arrow keys nudge the active endpoint of a measurement that is already being dragged, one CSS pixel per press; hold Shift for a 10px step. Enter commits the measurement early, without waiting for the pointer to come back up. Escape discards it.

All four only operate on a draft that already exists — see below for what that means in practice.

## What it does not do

**It cannot be started from the keyboard.** A measurement only ever begins from a pointer-down; arrow keys, Enter and Escape all act on a draft a pointer has already opened, and press any of them with nothing running and nothing happens. The design called for Tab to step through the specimen's snap targets as the keyboard equivalent of a pointer-down — arguably the more precise input of the two, since edges are exactly what you want to measure in the first place — and that was never built. Tab is deliberately left untouched here rather than repurposed as a plain stepping key, so it stays free for that mechanism once it exists. What the real interaction should be is still an open product question: a tool covering the whole canvas cannot simply take Tab for its own use without first deciding how a keyboard user gets back out of it, and that decision has not been made. If you rely on keyboard operation, treat this as a hard limit today, not an oversight to work around. The overlay is exposed as a labelled `group` rather than as an `application` for exactly that reason: `application` hands every keystroke to the widget and takes a screen-reader user out of browse mode, which would be a bad trade for a key set that cannot start anything. That changes the day the Tab mechanism above exists.

**It measures geometry, not cascade.** A point knows which edge it landed on; it does not know which CSS property drew that edge. If you need to know whether a 16px space is `padding`, `border` or `margin`, that is what [`@ng-prism/plugin-box-model`](plugins/box-model.md) is for — it reads those three straight off `getComputedStyle` rather than off pixels on screen. Neither tool goes further than that: a gap produced by a flex or grid `gap` is not a box-model property, and the box-model plugin has no more of an answer for it than the measuring tool does — both read it as plain, unattributed geometry. For the same reason, turning the measuring tool on suppresses every panel overlay, box-model's included, so the two are never competing for the canvas at the same time; see [Canvas State — Measuring](architecture/canvas-state.md#measuring) for why that split is temporary rather than permanent.

**It does not judge a value.** A measurement is reported, not graded — there is no design-token scale it checks a number against, and no warning for a gap that doesn't land on one. It states distances; deciding whether 18px should have been 16px is still a human call.
