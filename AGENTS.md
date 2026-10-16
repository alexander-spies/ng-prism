<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `npx nx build`, `npx nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Linting and formatting

The full picture is in the _Linting and formatting_ section of `CONTRIBUTING.md`.
Three things are easy to get wrong and are worth repeating here:

- **Use `npm run lint:fix` / `npm run check:fix` to fix, never `nx run-many -t lint --fix`.**
  This is the one exception to the "always go through nx" rule above.
  The `lint` target is cached but declares no outputs, so a cache hit replays an
  empty result while the files it was supposed to rewrite stay untouched. The
  command then reports success on a tree it never fixed. The npm scripts call
  `scripts/fix-until-stable.mjs` directly, which additionally loops to a fixed
  point, because neither `eslint --fix` nor `stylelint --fix` converges in one
  pass. Checking (`npm run lint`, `npm run check`, the pre-push hook) stays on
  nx, where caching is correct.

- **`--max-warnings 0` decides whether a run fails, not the severity.**
  Every lint target carries it via `nx.json`'s `targetDefaults`. A `warn` rule
  is just as blocking as an `error`; the severity only controls how loud the
  finding looks in the editor.

- **Formatting is not a separate step for `.ts` and Angular templates.** Prettier
  runs as the `prettier/prettier` ESLint rule there, so one `eslint --fix` covers
  formatting and rules together. `nx format:write` remains responsible for
  everything else (`.json`, `.md`, `.yml`, `.scss`, `.css`, `.js`/`.mjs`/`.cjs`,
  and the three standalone `.html` documents). The pre-commit hook does both for
  staged files, so a normal commit needs no manual formatting run.

# Things the tooling won't catch

- Stylesheets under `packages/` are plain `.css`. The packages build with bare
  `ngc`, which inlines styles verbatim, so SCSS would reach the browser unparsed.
- Tests run in Jest's `node` environment. In `packages/ng-prism`, a test that
  needs the DOM is named `*.browser.spec.ts`, which puts it in the jsdom project
  of its `jest.config.cjs`.
- A change to public API or behaviour updates the matching pages under `docs/`
  in the same PR.
- ng-prism majors track Angular majors. A breaking change inside the current
  Angular major ships as a minor release, with `@deprecated` (since and removal
  version) and a migration note.

# Personal configuration

`CLAUDE.md` is a committed symlink to this file, so Claude Code, which reads
`CLAUDE.md` rather than `AGENTS.md`, gets the same instructions as every other
agent. Personal instructions for this repo go into the gitignored
`CLAUDE.local.md` (Claude Code loads it right after `CLAUDE.md`), instructions
for every project into `~/.claude/CLAUDE.md`. Don't replace the symlink with a
file of your own.

# Skills

Task guides live in `.agents/skills/` (the directory Codex and Copilot read
natively), one folder per topic with a `SKILL.md`. Claude Code only reads
`.claude/skills/`, which holds one relative symlink per skill; it loads a skill
when the task matches its description. The `nx-*` skills named in the Nx section
above are Nx's own (`.github/skills/`, and the Nx plugin for Claude Code).

Project skills and agents carry the `prism-` prefix; only those are committed
(see `.gitignore`). A new project skill is a folder
`.agents/skills/prism-<name>/` plus its symlink:
`ln -s ../../.agents/skills/prism-<name> .claude/skills/prism-<name>`. Personal
skills and agents in `.claude/skills/` / `.claude/agents/` without the prefix
stay local. Don't give a personal skill the `prism-` prefix or a project skill's
name: a personal skill with the same name silently overrides the project one.

| Skill                      | Covers                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| `prism-showcase-component` | Adding or editing a `@Showcase` decorator                                     |
| `prism-angular-component`  | Creating a component for the core, a plugin or the scanner fixtures           |
| `prism-scanner-module`     | Creating or extending a module under `packages/ng-prism/src/builder/scanner/` |
| `prism-plugin`             | Creating a plugin against the `NgPrismPlugin` interface                       |
| `prism-test-workspace`     | Running the demo styleguide on the local packages and checking a change in it |

# Subagents

Claude Code subagents in `.claude/agents/`:

| Agent                        | Purpose                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `prism-branch-code-reviewer` | Reviews the current branch against the project conventions before a PR (runs on Sonnet); leaves correctness bugs to a general code review |
