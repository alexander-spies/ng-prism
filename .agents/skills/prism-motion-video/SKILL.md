---
name: prism-motion-video
description: Use when making or changing an ng-prism product film - the tour on the docs start page or a release clip - with Claude Motion (the claude.ai "Motion" artifact type, MP4 export from its page), or when such a film needs ng-prism's title card, end card, captions, code cards or sound.
---

# Product films with Claude Motion

A Motion film is a private claude.ai artifact whose content lives in its store (`ArtifactData`), not in git: one JS module
per scene, lifted styleguide markup and CSS as modules, a score. The picture is the **real styleguide**: its DOM and used
CSS, lifted from a build, animated with a camera and a cursor. It is sharp at any zoom and reproduces the product pixel
for pixel. The maintainer approved the look and the structure of the 22.7 film; `templates/` holds it.

## Every film has this shape

| Scene                | Template                                 | Length   | Set per film                                                            |
| -------------------- | ---------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `title`              | `templates/scene-title.js`               | 4.0 s    | `VERSION`: the minor (mono) or, for the tour, the slogan (Inter)        |
| one beat per feature | `scene-code-card.js` or `scene-click.js` | 6–8 s    | everything: they are 22.7's Parts and Service pages beats, as examples  |
| `end`                | `templates/scene-end.js`                 | 4.0 s    | `COMMAND`: `ng update @ng-prism/core`; the tour `ng add @ng-prism/core` |
| sound                | `templates/score.js`                     | the film | `CLICKS` only                                                           |

The beats follow the order of the release notes; a click beat takes 6–7 s, a code card 7.5–8 s. `templates/base.css`
and `templates/shared.js` go in unchanged, `templates/scenes.example.json` is the shape of `modules/scenes.json` (its
`fonts`, `palettes` and `theirs` stay as they are; each scene's `id`, `name`, `dur` and `desc` are the film's), and the
asset `symbol.png` is `docs/logo_only_big.png`. Never change the title, the end card or the sound unasked. Every film is a new artifact, titled
"ng-prism <version>" (the tour: "ng-prism tour"). The tour's slogan is "Your components, in full spectrum."

## House style (the maintainer's decisions)

- **Palette and type:** ground `#080d19`, the brand gradient cyan `#00cfea` → `#078bfa` → `#244bff` → violet `#a20cf0`,
  text `#f1f5f9`; Inter for words, JetBrains Mono for code. 1920×1080, 60 fps.
- **The window:** the lifted styleguide at 1440×900, placed at (240, 90) on the ground with its three soft glows.
- **Captions:** one line, at most ~45 characters not counting the `**` markers, a full stop, one `**…**` part in the
  brand gradient that closes the line, full stop included; lower third on a scrim, in at 0.15 s. One developer showing another: no superlatives, no emojis.
- **Pace:** the window, a code card and the caption come in during the first 0.5 s, and the camera may start its push;
  the cursor shows from ~1.0 s, typing and clicks start at ~1.4 s or later, so the caption is read first. Every effect holds 1.2 s or longer. One camera push in per beat, zoom 1.25–2.3; easing back out
  to show a result is fine. When the camera frames the bottom panel, put the window's bottom edge at stage y ≈ 756.
- **A click** is a cursor (`kit.cursor`, keys through `UI.at`) and a 0.2 s cross-fade from the lifted before state to the
  after state. A popover scales in from 0.96 at its anchor. At most one highlight per beat (`.hi`).
- **Code cards** (new `@Showcase` API): a card on the left over a veil, the file name on top, a contiguous slice of the
  file's lines **verbatim**, one line typed at 34 cps with a caret, the rest already there; the typed line must fit inside the card. Dropping the indentation all
  shown lines share is fine and is said to the maintainer; a long line runs out of the card under the fade, never
  wrapped or shortened. video-lib's showcases are written to fit a card; test-lib works where its lines do.
- **Sound:** no music. Only keystrokes (automatic from `kit.typist`) and the cursor's clicks (`CLICKS`).
- **Rejected, don't bring back:** mark pieces flying in, a light beam with a spectrum fan, twinkling stars, a ray burst,
  a second shine on the title (one sheen through prism and name, like the end card), music of any kind.

## Making a film

1. **The source must exist.** A beat for new `@Showcase` API quotes a real showcase. If no showcase uses the option yet,
   add one to video-lib (that is a repo change: ask before committing it).
2. **Build:** `npm run build:all` at the repo root, then in `test-workspace` `CI=1 npx ng run test-lib:prism-build` (most
   beats) and `CI=1 npx ng run video-lib:prism-build` (code cards whose lines need video-lib's short showcases). Not `npm run test:workspace:update`: it kills whatever holds
   `:4400`. `:4400` and `:4401` are the maintainer's: check with `lsof` and leave them alone.
3. **Serve** each build statically: `python3 -m http.server 4430 --bind 127.0.0.1` in `test-workspace/dist/test-lib-prism`,
   port 4431 in `test-workspace/dist/video-lib-prism`.
4. **Lift** each state the film shows: write a config like `templates/lift-config.example.json` (`cssName`
   `ui-test.css` for test-lib, `ui-video.css` for video-lib: `shared.js` loads those names), run
   `node scripts/lift.mjs <config> <out>`, one out dir per build. A click needs a before and an after state. For a
   code card, lift the states as they are after the typed line exists, and keep what that line adds at opacity 0 until it
   is typed (the template does this with `prism-head-parts` in the first state). After a click, blur the focus (`eval` step); a menu needs both clicks; a transition a
   longer `wait`.
5. **Check the lift:** `node scripts/verify-lift.mjs <out> <css> <state…>` and read every `cmp-*.png` (real left, lift
   right). Fix the lift until they match.
6. **Package:** `node scripts/package-modules.mjs <out> <mods> <css> [ngv]`; video-lib gets the scope `ngv`.
7. **Write the scenes** from the templates. A scene's class names begin with its id. Retiming a beat means every time in
   it: the constants, and the literals in `render`, the cursor keys and visibility and the camera keys' `hold`.
8. **Preview every new or changed scene before it goes in.** The player can't be watched from here:
   `node scripts/preview.mjs <scene.js> <prefix> <t1,t2,…> --mods <mods> [--mods <mods2>] --dur <s>` renders it in a
   stand-in with the player's camera, cursor and typist (no sound), and tiles the frames. No `PAGEERROR` may show; read
   the sheet and full frames at the key moments.
9. **Create the film:** find the Motion type (`Artifact` quickstart, or `list` with `scope: "types"`), publish with its
   `type_url`, then follow the instructions the create result carries. Upload `symbol.png` as an asset and write its
   `assets/symbol.png` document (`mime` `image/png`); `base.css`, `shared.js` and the packaged modules go in as modules
   (`ArtifactData` batch with `file_path`), each scene as one `set` (`modules/scene-<id>.js`), then `modules/score.js` and
   `modules/scenes.json` with `"stage": "final"`. Every write to an existing document needs `if_version`. The store is the source: before changing
   a film later, read it back (`ArtifactData` `list` with `out_dir`).
10. **Hand it over:** the link, a word on any dropped indentation, and ask the maintainer to scrub it once: a scene that
    throws in the player shows only a card with its name. Export (MP4) is a button on the film's page; where the MP4 goes
    is the maintainer's call.

## Reference: what approved looks like

`reference/` holds stills of the approved 22.7 film, rendered with `preview.mjs` from its scenes. Compare a preview
against them before a title, an end card or a beat goes in:

| Stills                                     | What they show                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `title-1-light.jpg` … `title-4-lockup.jpg` | the title at 0, 1.1, 2.95 and 3.62 s: inside the light, the flare, the one sheen, the lockup     |
| `end-1-sheen.jpg`, `end-2-card.jpg`        | the end card with its sheen, and as it stands                                                    |
| `beat-*.jpg`                               | one key frame of each 22.7 beat: look, pages (click), compose and parts (code cards), a11y, perf |

`reference/tour/` is the same for the tour on the docs start page ("ng-prism tour", 54.5 s: title with the slogan,
@Showcase typed into `button.component.ts`, the styleguide, live inputs, states and the box model, a11y, an API page,
`ng add`), its stills numbered in film order.

`reference/22.7/` is the whole 22.7 film without its lifted modules: `scenes.json`, every scene, the score, and the two
lift configs (`lift-test-lib.json`, `lift-video-lib.json`). If the artifact is gone, the film comes back from the repo:
build the 22.7 styleguides, lift and package with those configs, create a new film and write these modules, `base.css`
and `shared.js` from `templates/` and the asset `symbol.png`. The lift reproduces the styleguide as it is at build time,
so a later release's styleguide looks newer than the 22.7 stills.

## When something goes wrong

| Symptom                                                  | Cause and fix                                                                                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A lifted element has lost its background or gradient     | Chrome serialises `background: var(…)` followed by a longhand as empty longhands; `lift.mjs` re-reads such rules from the raw stylesheet. |
| A popover is missing or cut off in the lift              | It lived in the top layer. `lift.mjs` pins it `position: fixed` with a high `z-index` and `position-area: none`.                          |
| Every lifted state is ~400 KB                            | The header logo is a 180 KB data URI; the lift swaps it for `var(--ngp-logo)`, which `UI.stage` points at `symbol.png`.                   |
| Styles of the two builds overwrite each other            | Their `_ngcontent` ids and global rules differ: video-lib is scoped (`package-modules.mjs … ngv`).                                        |
| Something animated in the styleguide stands still        | CSS animations and transitions don't run in a film: drive it from `t` (the header's sheen and glow: `UI.light`).                          |
| Camera or cursor aim beside the element                  | Measure with `UI.box` in `init`, before the camera moves, against the state the element is in.                                            |
| A scene shows only its name card in the player           | It threw while loading. Run it through `preview.mjs` with the film's modules: page errors are printed.                                    |
| A gradient word shows the whole gradient in every letter | Split letters need `background-size` = word width and `background-position` = −`offsetLeft` (see the title).                              |
| A dark smear over a light canvas beside a code card      | The veil behind the card. Leave it out where the window behind the card is light, and frame the dark panel instead (the 22.7 a11y beat).  |
| A later state still shows an earlier one's inputs        | The styleguide keeps control values per component across navigation: click `Reset` and `goto` again before lifting the next beat.         |
| A `click` with `:text-is()` times out                    | The text sits in a child (`<span class="prism-tab__label">`): address the element by `aria-label` or class instead.                       |
| `preview.mjs` times out launching Chromium               | The machine is under load; run it again.                                                                                                  |
