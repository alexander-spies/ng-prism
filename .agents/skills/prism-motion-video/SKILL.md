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
asset `symbol.png` is `docs/logo_only_big.png`. Never change the title, the end card, the sound or the sonic logo unasked. Every film is a new artifact, titled
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
- **Sound:** no music. In the film only keystrokes (automatic from `kit.typist`) and the cursor's clicks (`CLICKS`); a
  narration goes on the exported MP4 afterwards (below). It opens with the sonic logo, `templates/sonic-logo.flac`
  (the voice Lily whispering "N G prism" in a hall), at 0.5 s into the title; everything after it is the ElevenLabs
  voice Chris, an advertising read. The end card shows the logo without speaking it.
- **Rejected, don't bring back:** mark pieces flying in, a light beam with a spectrum fan, twinkling stars, a ray burst,
  a second shine on the title (one sheen through prism and name, like the end card), music of any kind, the macOS
  system voices.

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
    throws in the player shows only a card with its name. Export (MP4) is a button on the film's page, and only the
    maintainer can press it: ask for 1080p, 60 fps, High, Sharper text on; that file is the master, its size does not
    matter. A contact sheet of the master (`ffmpeg -i <mp4> -vf "fps=1/1.5,scale=400:-1,tile=6x6" -frames:v 1 sheet.png`)
    shows whether every scene rendered in the real player.
11. **Encode for the web:** `ffmpeg -i <master> -vf fps=30 -c:v libx264 -preset slow -crf 20 -tune animation -profile:v high
-pix_fmt yuv420p -c:a copy -movflags +faststart <out>.mp4` turns a 47 MB master into about 10 MB with no visible loss
    (compare crops of code and small text against the master). The docs tour goes to `docs/assets/video/tour.mp4`, its
    poster (`tour-poster.png`) is a frame of the master: `ffmpeg -ss 3.62 -i <master> -frames:v 1 tour-poster.png`.
12. **Narrate,** where the maintainer wants a voice: one line per scene, written for a listener, approved by the
    maintainer before anything is generated. The first two lines are fixed: `{ "at": 0.5, "logo": true }`, which puts
    the sonic logo in (the master has no voice of any kind), then the title's own line from 2.1 s: "What's new in
    twenty-two point seven." with the release's minor spelled out, for the tour its slogan. Every other line starts
    0.3–0.6 s after its cut and ends before the next line; `until` is the cut that ends its scene, which it may overrun
    by 0.6 s. At the default `--tempo 1.05` the voice speaks about 2.6 words a second. Spell what it would read wrongly
    as it should sound (`N G prism`, `J S Doc`). Write the lines to `reference/<version>/narration.json` (like
    `reference/22.7/narration.json`), check the fit against the web encode from step 11 with
    `node scripts/narrate.mjs <encode>.mp4 reference/<version>/narration.json --dry`, then narrate it with
    `node scripts/narrate.mjs <encode>.mp4 reference/<version>/narration.json <out>.mp4 --title "ng-prism <version>"`.
    The voice comes from ElevenLabs' API on the free plan and needs `ELEVENLABS_API_KEY` in the shell (the
    maintainer's is in `~/.zshrc`). The free plan can't use voices from ElevenLabs' library over the API, only its
    default voices, which is why the narrator is Chris. Every line is generated once and cached in
    `.videos/narration-cache/`: `--dry` already generates the lines it measures, so it is the run that spends the
    credits, and the real run and a run after editing one line reuse what didn't change. The free plan has 10,000
    characters a month, a film's narration about 700. A line that sounds wrong gets a `"seed"` (any other number) for
    another take. The script ducks the clicks under the voice, normalises to −16 LUFS, copies the picture and titles
    the MP4 "ng-prism <version> · voice: elevenlabs.io". Play the result to the maintainer
    (`open -a "QuickTime Player" <out>.mp4`) before it replaces anything.
13. **Deliver:** the finished release clip (encoded, narrated) goes to `.videos/ng-prism-<version>.mp4` at the repo root,
    which is gitignored: the maintainer attaches it to the release from there. Its `narration.json` is committed. The
    docs tour is the one film in git (`docs/assets/video/`). The free plan's licence is non-commercial and wants
    "elevenlabs.io" in the title wherever the film is published: the release notes carry a line
    `Voice: elevenlabs.io` right below the clip, `docs/README.md` the same line below the tour's `<video>`.

## Reference: what approved looks like

`reference/` holds stills of the approved 22.7 film, rendered with `preview.mjs` from its scenes. Compare a preview
against them before a title, an end card or a beat goes in:

| Stills                                     | What they show                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `title-1-light.jpg` … `title-4-lockup.jpg` | the title at 0, 1.1, 2.95 and 3.62 s: inside the light, the flare, the one sheen, the lockup             |
| `end-1-sheen.jpg`, `end-2-card.jpg`        | the end card with its sheen, and as it stands                                                            |
| `beat-*.jpg`                               | one key frame of each 22.7 beat: look, mobile, pages (click), compose and parts (code cards), a11y, perf |

`reference/tour/` is the same for the tour on the docs start page ("ng-prism tour", 54.5 s: title with the slogan,
@Showcase typed into `button.component.ts`, the styleguide, live inputs, states and the box model, a11y, an API page,
`ng add`), its stills numbered in film order, and its narration (`narration.json`).

`reference/22.7/` is the whole 22.7 film without its lifted modules: `scenes.json`, every scene, the score, and the two
lift configs (`lift-test-lib.json`, `lift-video-lib.json`). If the artifact is gone, the film comes back from the repo:
build the 22.7 styleguides, lift and package with those configs, create a new film and write these modules, `base.css`
and `shared.js` from `templates/` and the asset `symbol.png`. The lift reproduces the styleguide as it is at build time,
so a later release's styleguide looks newer than the 22.7 stills.

## When something goes wrong

| Symptom                                                  | Cause and fix                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A lifted element has lost its background or gradient     | Chrome serialises `background: var(…)` followed by a longhand as empty longhands; `lift.mjs` re-reads such rules from the raw stylesheet.                                                                                                                                       |
| A popover is missing or cut off in the lift              | It lived in the top layer. `lift.mjs` pins it `position: fixed` with a high `z-index` and `position-area: none`.                                                                                                                                                                |
| Every lifted state is ~400 KB                            | The header logo is a 180 KB data URI; the lift swaps it for `var(--ngp-logo)`, which `UI.stage` points at `symbol.png`.                                                                                                                                                         |
| Styles of the two builds overwrite each other            | Their `_ngcontent` ids and global rules differ: video-lib is scoped (`package-modules.mjs … ngv`).                                                                                                                                                                              |
| Something animated in the styleguide stands still        | CSS animations and transitions don't run in a film: drive it from `t` (the header's sheen and glow: `UI.light`).                                                                                                                                                                |
| Camera or cursor aim beside the element                  | Measure with `UI.box` in `init`, before the camera moves, against the state the element is in.                                                                                                                                                                                  |
| A scene shows only its name card in the player           | It threw while loading. Run it through `preview.mjs` with the film's modules: page errors are printed.                                                                                                                                                                          |
| A gradient word shows the whole gradient in every letter | Split letters need `background-size` = word width and `background-position` = −`offsetLeft` (see the title).                                                                                                                                                                    |
| A dark smear over a light canvas beside a code card      | The veil behind the card. Leave it out where the window behind the card is light, and frame the dark panel instead (the 22.7 a11y beat).                                                                                                                                        |
| A later state still shows an earlier one's inputs        | The styleguide keeps control values per component across navigation: click `Reset` and `goto` again before lifting the next beat.                                                                                                                                               |
| A `click` with `:text-is()` times out                    | The text sits in a child (`<span class="prism-tab__label">`): address the element by `aria-label` or class instead.                                                                                                                                                             |
| A phone-sized lift breaks the desktop windows            | Lift the phone at its size (`viewport` `{ width: 390, height: 844 }`, `touch: true` in the config), check it with `verify-lift.mjs … --size 390x844`, package it as `ui-phone.css` with the scope `ngm`, and show it in a device frame of the scene's own (22.7's mobile beat). |
| `preview.mjs` times out launching Chromium               | The machine is under load; run it again.                                                                                                                                                                                                                                        |
| `narrate.mjs` gets 401 or `quota_exceeded`               | 401: the key is wrong or lacks the Text to Speech permission. `quota_exceeded`: the month's free characters are spent; cached lines still work, new ones wait for the reset.                                                                                                    |
