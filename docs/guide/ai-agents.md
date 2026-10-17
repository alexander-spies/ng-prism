# AI Coding Agents

ng-prism is younger than the training data of most coding agents. An agent that has never seen `@Showcase` guesses,
usually with Storybook patterns. The ng-prism plugin for [Claude Code](https://code.claude.com/docs) gives it the rules
instead: how to write a showcase that builds without warnings, how to check it in the running styleguide, how to set up
and configure ng-prism, and how to write a plugin.

## Install

In Claude Code:

```
/plugin marketplace add ng-prism/ng-prism
/plugin install ng-prism@ng-prism
```

From a shell, the same is `claude plugin marketplace add ng-prism/ng-prism` and
`claude plugin install ng-prism@ng-prism`. To share it with your team, add `--scope project` to both commands: they
then write the marketplace and the plugin into the project's `.claude/settings.json`.

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

The plugin's version follows the ng-prism releases. `claude plugin update ng-prism@ng-prism` (or `/plugin` in a
session) fetches a new one; restart Claude Code afterwards.
