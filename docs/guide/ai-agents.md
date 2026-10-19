# AI Coding Agents

ng-prism is younger than the training data of most coding agents. An agent that has never seen `@Showcase` guesses,
usually with Storybook patterns. The ng-prism plugin for [Claude Code](https://code.claude.com/docs) gives it the rules
instead: how to write a showcase that builds without warnings, how to check it in the running styleguide, how to set up
and configure ng-prism, and how to write a plugin.

## Install

There is nothing to clone. Claude Code fetches the plugin from this repository on GitHub. From a shell, one command adds
the marketplace and installs the plugin:

```bash
claude plugin install ng-prism --marketplace ng-prism/ng-prism
```

In a Claude Code session it takes two:

```
/plugin marketplace add ng-prism/ng-prism
/plugin install ng-prism@ng-prism
```

### For the whole team

Add `--scope project` to the install, and the plugin is enabled for the repository in the project's
`.claude/settings.json`, which you commit. That enables it, but it doesn't install it on anyone else's machine. Every
teammate runs the install with `--scope project` once, and from then on the plugin loads whenever they work in that
repository.

## What it covers

| Skill                   | For                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ng-prism:showcase`     | Writing or changing `@Showcase` configs, fixing `⚠ ng-prism:` build warnings, checking variants in the running styleguide |
| `ng-prism:setup`        | `ng add`, `ng-prism.config.ts`, the official plugins, theming, publishing a library without its showcases, upgrades       |
| `ng-prism:write-plugin` | Your own plugin: build-time hooks, panels, controls, header widgets, sidebar decorations, packaging                       |

Claude Code loads a skill when your request matches it. You can also call one directly, e.g. `/ng-prism:showcase`.

## Checking in the browser

The showcase skill starts the styleguide (`ng run <lib>:prism`) and takes a screenshot of each variant it touched, using
the Playwright of your project. If Playwright is missing, the agent asks before it installs it
(`npm i -D playwright && npx playwright install chromium`). An agent with a browser tool of its own uses that instead;
otherwise it gives you the URL to check. Either way it drives the styleguide through the
[External Tooling API](guide/external-tooling.md).

## The installed version decides

The skills read the version of `@ng-prism/core` in your `node_modules` and treat the typings shipped with it as the
reference. A field the skill names but your version doesn't have yet is left alone.

The plugin's version follows the ng-prism releases. Plugins from marketplaces other than the official ones don't update
automatically by default, so fetch a new version with `claude plugin update ng-prism@ng-prism` (or `/plugin` in a
session). A running session keeps the old version until you run `/reload-plugins` or start a new one.
