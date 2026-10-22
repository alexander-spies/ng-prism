---
name: prism-test-workspace
description: Starts ng-prism's demo styleguide (test-workspace) on the local packages and checks a change in the running app - rebuild, serve on :4400, scan the build log for @Showcase warnings, screenshot a component variant with Playwright. Use when asked to run, start or screenshot the styleguide or demo, or to confirm that a UI, scanner or plugin change works in the real app and not only in tests.
---

# Test workspace — run the demo and check a change

`test-workspace/` is a real Angular workspace that consumes the local `@ng-prism/*` packages through `file:../packages/*`. It holds two demo libraries, each with its own Prism app:

| Library              | Components                                                                                                  | Serve (from the repo root)                          | Port |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---- |
| `test-lib` (default) | `test-workspace/projects/test-lib/src/lib/components/`, exported from `projects/test-lib/src/public-api.ts` | `npm run test:workspace:serve`                      | 4400 |
| `test-ui-kit`        | `test-workspace/projects/test-ui-kit/`, exported from `projects/test-ui-kit/public-api.ts`                  | `cd test-workspace && npx ng run test-ui-kit:prism` | 4401 |

A demo for a new `@Showcase` option or component goes into `test-lib`. Background, scripts and a troubleshooting table: `CONTRIBUTING.md` › Test Workspace.

## Bring it up

1. `npm run test:workspace:update` rebuilds the core and every plugin (Nx-cached), clears the Angular cache and re-syncs the `file:` dependencies offline. The dev server does not pick up changes under `packages/` on its own, so run this after each one. It also frees port 4400.
2. `npm run test:workspace:serve` as a background command. It is ready once `curl -sf -o /dev/null http://localhost:4400/` succeeds; the log then also carries the line `ng-prism: Generated manifest with N component(s) …` (or `Verified (unchanged)`).

On a fresh clone, when `test-workspace/node_modules` is missing, or after adding a dependency, the install goes through the local Verdaccio registry: start `npm run verdaccio` in the background (port 4873), then `npm run test:workspace:setup` and `npm run test:workspace:install`. An `npm install` inside `test-workspace/` that hangs means Verdaccio is not running.

A serve that crashed and still holds the port: `npm run test:workspace:kill`.

Ask before running `test:workspace:clean` or `test:workspace:reset`. They delete `test-workspace/node_modules`, `package-lock.json` and `ng-prism.config.ts`, and revert `angular.json` and `package.json` to their git state. `ng-prism.config.ts` is gitignored, and `test:workspace:install` copies `ng-prism.config.example.ts` when it is missing; leave an existing one as you find it.

## Check the change

**Build log.** The scanner reports every `@Showcase` value it had to drop and every deprecated option it met as a line starting with `⚠ ng-prism:`. A change that adds or touches showcases should not add any. The manifest line's component count shows whether a new component was discovered at all.

**Screenshot.** The screenshot script ships with the `showcase` skill of the consumer plugin (`.agents/plugins/claude/`). Run from the repo root, it drives Playwright's Chromium from the root devDependencies:

```bash
node .agents/plugins/claude/skills/showcase/scripts/screenshot.mjs --component ButtonComponent --variant 1
node .agents/plugins/claude/skills/showcase/scripts/screenshot.mjs --component ButtonComponent --variant 1 --state 0
node .agents/plugins/claude/skills/showcase/scripts/screenshot.mjs --component ButtonComponent --shell
node .agents/plugins/claude/skills/showcase/scripts/screenshot.mjs --service NotificationService
node .agents/plugins/claude/skills/showcase/scripts/screenshot.mjs --pipe TimeAgoPipe
```

- By default it opens `?component=…&variant=…&capture=1` and screenshots `.demo-wrap`: the component alone, on its declared background, with motion frozen. Use it for anything that changes how a component or variant renders.
- `--state <index>` captures the variant in one of the component's `states` (0-based, in source order). A state that doesn't fit the variant prints the reason and exits 4 without a PNG.
- `--shell` takes the whole window without capture mode. Use it for changes to the styleguide's own UI (sidebar, header, panels, canvas tools), which capture mode removes.
- `--service <ClassName>` captures a service's API page (`?service=…&view=jsdoc`, rendered by the JSDoc plugin from the service's JSDoc) at its full length, without sidebar and header. It waits for `data-prism-service-rendered="<ClassName>"` and the highlighted code blocks. `test-lib`'s demo service is `NotificationService`. Use it for changes to the service scanner or the service page. Services are not in `window.__PRISM_MANIFEST__`, so an unknown name only shows as "Service page never rendered" (exit 1).
- `--pipe <ClassName>` does the same for a pipe (`?pipe=…&view=jsdoc`, waits for `data-prism-pipe-rendered="<ClassName>"`). `test-lib`'s demo pipe is `TimeAgoPipe`, with two overloads, a `setup` function and a config interface. Use it for changes to the pipe scanner, the usage snippet or the pipe page. An unknown name only shows as "Pipe page never rendered" (exit 1). `--pipe` and `--service` exclude each other and `--component`, `--variant`, `--state` and `--shell` (exit 2).
- `--url http://localhost:4401` targets `test-ui-kit`; `--out <file>` sets the path (default: the system temp dir).

Variant indexes are 0-based, in `@Showcase` order. The script reads `window.__PRISM_MANIFEST__` first and lists the known components or variants when the one you named doesn't exist. It then waits for the render marker `data-prism-rendered="<ClassName>:<variant>"` (`<ClassName>:<variant>:<state>` with `--state`), prints the URL and the PNG path, and lists browser console errors. Exit codes: 0 saved, 1 not reachable, not found (component, variant or state), never rendered (then it saves the full window for diagnosis) or the screenshot failed, 2 invalid arguments, 3 Playwright or Chromium missing, 4 the state doesn't fit the variant (`data-prism-excluded`). A variant without `bg` or with `bg: 'transparent'` comes back as a PNG with alpha.

Open the PNG with the Read tool and look at it before saying the change works. Then report what you checked: the URL, the variant, what the image shows, and the warnings in the log. That is also what the PR template asks for under "How Was This Verified?".

Stop the background serve when you are done, unless the user wants to keep it running.
