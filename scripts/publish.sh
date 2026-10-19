#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PACKAGES=(
  "packages/ng-prism"
  "packages/plugin-box-model"
  "packages/plugin-coverage"
  "packages/plugin-figma"
  "packages/plugin-jsdoc"
  "packages/plugin-perf"
  "packages/plugin-visual-regression"
)

# ─── Nx project names, derived from PACKAGES ───
# An Nx project is named after its package directory. Deriving the list means a
# new package joins every release step through its PACKAGES entry alone.
# plugin-visual-regression had to be added to two places by hand and reached
# neither, so a release bumped, built and published around it in silence.
project_names() {
  local names=() pkg
  for pkg in "${PACKAGES[@]}"; do
    names+=("$(basename "$pkg")")
  done
  local IFS=','
  echo "${names[*]}"
}

# Same, without the core package, for steps that handle it separately.
plugin_project_names() {
  local names=() pkg
  for pkg in "${PACKAGES[@]}"; do
    [[ "$pkg" == "packages/ng-prism" ]] && continue
    names+=("$(basename "$pkg")")
  done
  local IFS=','
  echo "${names[*]}"
}

# ─── Colors ───
VIOLET='\033[0;35m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

info()  { echo -e "${BLUE}▸${RESET} $1" >&2; }
ok()    { echo -e "${GREEN}✔${RESET} $1" >&2; }
warn()  { echo -e "${YELLOW}⚠${RESET} $1" >&2; }
err()   { echo -e "${RED}✘${RESET} $1" >&2; }
header(){ echo -e "\n${VIOLET}━━━ $1 ━━━${RESET}\n" >&2; }

# ─── Current version ───
current_version() {
  node -e "console.log(require('./packages/ng-prism/package.json').version)"
}

# ─── Menu ───
show_menu() {
  local version
  version=$(current_version)

  echo -e "\n${VIOLET}◈ ng-prism publish${RESET}  ${DIM}v${version}${RESET}\n"
  echo "  1) Patch release    (bug fixes)"
  echo "  2) Minor release    (new features, backward compatible)"
  echo "  3) Major release    (breaking changes, Angular version bump)"
  echo "  4) Publish current  (no version bump, just build + publish)"
  echo "  5) Dry run          (build + pack, no publish)"
  echo "  6) Beta release     (prerelease, published with --tag beta)"
  if [[ "$version" =~ -beta\.[0-9]+$ ]]; then
    echo -e "  ${YELLOW}7) Promote beta     (drop -beta suffix, publish as latest)${RESET}"
  fi
  echo ""
  echo -e "  ${DIM}0) Exit${RESET}"
  echo ""
}

# ─── Compute peer-dep range from a version string ───
# Strips any prerelease suffix and returns ^base-0
# e.g. 21.12.0-beta.5 -> ^21.12.0-0   (matches all 21.12.0 prereleases AND 21.x stable)
#      21.12.0        -> ^21.12.0-0   (matches all 21.x stable)
peer_range_from_version() {
  local version="$1"
  local base="${version%%-*}"
  echo "^${base}-0"
}

# ─── Sync @ng-prism/core peer-dep in all plugins to match the new version ───
sync_plugin_peer_deps() {
  local new_version="$1"
  local peer_range
  peer_range=$(peer_range_from_version "$new_version")

  for pkg in "${PACKAGES[@]}"; do
    # Skip the core package itself; it doesn't depend on itself
    [[ "$pkg" == "packages/ng-prism" ]] && continue

    node -e "
      const fs = require('fs');
      const path = './$pkg/package.json';
      const p = JSON.parse(fs.readFileSync(path, 'utf-8'));
      if (p.peerDependencies && p.peerDependencies['@ng-prism/core']) {
        p.peerDependencies['@ng-prism/core'] = '$peer_range';
        fs.writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
      }
    "
    info "$(basename "$pkg") peer @ng-prism/core -> $peer_range"
  done
}

# ─── Sync the Claude Code plugin's version with the release ───
# .agents/plugins/claude describes the release it ships with. Claude Code caches
# an installed plugin by this version, so without the bump existing installs
# keep the old skills. 4-space JSON like the rest of the repo, so a release
# only changes the version line.
sync_agent_plugin_version() {
  local new_version="$1"
  local manifest=".agents/plugins/claude/.claude-plugin/plugin.json"

  node -e "
    const fs = require('fs');
    const path = './$manifest';
    const p = JSON.parse(fs.readFileSync(path, 'utf-8'));
    p.version = '$new_version';
    fs.writeFileSync(path, JSON.stringify(p, null, 4) + '\n');
  " || { err "Could not update $manifest"; exit 1; }
  info "Claude Code plugin -> $new_version"
}

# ─── Bump version across all packages ───
bump_version() {
  local bump_type="$1"
  local old_version clean new_version

  old_version=$(current_version)
  # Strip any prerelease suffix (e.g. -beta.0) before bumping
  clean="${old_version%%-*}"

  case "$bump_type" in
    patch) new_version=$(node -e "const [a,b,c]=process.argv[1].split('.'); console.log([a,b,+c+1].join('.'))" "$clean") ;;
    minor) new_version=$(node -e "const [a,b]=process.argv[1].split('.'); console.log([a,+b+1,0].join('.'))" "$clean") ;;
    major) new_version=$(node -e "const [a]=process.argv[1].split('.'); console.log([+a+1,0,0].join('.'))" "$clean") ;;
  esac

  header "Bumping $old_version to $new_version"

  for pkg in "${PACKAGES[@]}"; do
    node -e "
      const fs = require('fs');
      const path = './$pkg/package.json';
      const p = JSON.parse(fs.readFileSync(path, 'utf-8'));
      p.version = '$new_version';
      fs.writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
    "
    info "$(basename "$pkg") -> $new_version"
  done

  sync_plugin_peer_deps "$new_version"
  sync_agent_plugin_version "$new_version"

  ok "All packages bumped to $new_version"
  echo "$new_version"
}

# ─── Bump beta version across all packages ───
# Arg 1: "iterate" (increment beta counter) | "patch" | "minor" | "major" (new beta series)
bump_beta_version() {
  local mode="$1"
  local old_version new_version
  old_version=$(current_version)

  if [[ "$mode" == "iterate" ]]; then
    if [[ ! "$old_version" =~ -beta\.([0-9]+)$ ]]; then
      err "Current version $old_version is not a beta, cannot iterate"
      exit 1
    fi
    local base="${old_version%-beta.*}"
    local beta_num="${BASH_REMATCH[1]}"
    new_version="${base}-beta.$((beta_num + 1))"
  else
    # Strip any existing prerelease suffix before bumping base
    local clean="${old_version%%-*}"
    local base
    case "$mode" in
      patch) base=$(node -e "const [a,b,c]=process.argv[1].split('.'); console.log([a,b,+c+1].join('.'))" "$clean") ;;
      minor) base=$(node -e "const [a,b]=process.argv[1].split('.'); console.log([a,+b+1,0].join('.'))" "$clean") ;;
      major) base=$(node -e "const [a]=process.argv[1].split('.'); console.log([+a+1,0,0].join('.'))" "$clean") ;;
      *) err "Invalid beta mode: $mode"; exit 1 ;;
    esac
    new_version="${base}-beta.0"
  fi

  header "Bumping $old_version to $new_version (beta)"

  for pkg in "${PACKAGES[@]}"; do
    node -e "
      const fs = require('fs');
      const path = './$pkg/package.json';
      const p = JSON.parse(fs.readFileSync(path, 'utf-8'));
      p.version = '$new_version';
      fs.writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
    "
    info "$(basename "$pkg") -> $new_version"
  done

  sync_plugin_peer_deps "$new_version"
  sync_agent_plugin_version "$new_version"

  ok "All packages bumped to $new_version"
  echo "$new_version"
}

# ─── Promote beta to stable (drop -beta.N suffix, no version bump) ───
promote_beta_to_stable() {
  local old_version new_version
  old_version=$(current_version)

  if [[ ! "$old_version" =~ -beta\.[0-9]+$ ]]; then
    err "Current version $old_version is not a beta, nothing to promote"
    exit 1
  fi

  new_version="${old_version%%-*}"

  header "Promoting $old_version to $new_version (stable)"

  for pkg in "${PACKAGES[@]}"; do
    node -e "
      const fs = require('fs');
      const path = './$pkg/package.json';
      const p = JSON.parse(fs.readFileSync(path, 'utf-8'));
      p.version = '$new_version';
      fs.writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
    "
    info "$(basename "$pkg") -> $new_version"
  done

  sync_plugin_peer_deps "$new_version"
  sync_agent_plugin_version "$new_version"

  ok "All packages promoted to $new_version"
  echo "$new_version"
}

# ─── Checks ───
preflight_checks() {
  header "Preflight checks"

  if ! npm whoami --userconfig=.npmrc &>/dev/null; then
    warn "Not logged in to npm"
    echo ""
    read -rp "  Run npm login? (y/n) " answer
    if [[ "$answer" == "y" ]]; then
      npm login --userconfig=.npmrc
    else
      err "Cannot publish without npm login"
      exit 1
    fi
  fi
  ok "npm authenticated as $(npm whoami --userconfig=.npmrc)"

  if [[ -n "$(git status --porcelain)" ]]; then
    warn "Working directory has uncommitted changes"
    git status --short
    echo ""
    read -rp "  Continue anyway? (y/n) " answer
    [[ "$answer" != "y" ]] && exit 1
  else
    ok "Working directory clean"
  fi
}

# ─── Tests ───
run_tests() {
  header "Running tests"

  # Every published package, not only the core: a plugin's own suite is the
  # only check of its side of the contract.
  #
  # Not piped through `tail`, so a failure shows which test broke;
  # `set -o pipefail` still aborts the release.
  #
  # `--outputStyle=static` because Nx's Terminal UI (picked for an interactive
  # stdout) waits for a keypress after the run and would block the script.
  npx nx run-many -t test --projects="$(project_names)" --outputStyle=static

  ok "Tests passed"
}

# ─── Build ───
build_all() {
  header "Building all packages"

  info "Building @ng-prism/core..."
  npx nx build ng-prism 2>&1 | tail -1

  info "Building plugins..."
  npx nx run-many -t build --projects="$(plugin_project_names)" 2>&1 | tail -1

  ok "All packages built"
}

# ─── Dry run ───
dry_run() {
  header "Dry run: checking package contents"

  for pkg in "${PACKAGES[@]}"; do
    local name
    name=$(node -e "console.log(require('./$pkg/package.json').name)")
    echo -e "\n${DIM}─── $name ───${RESET}"
    cd "$pkg"
    npm pack --dry-run 2>&1 | grep "total files"
    cd "$ROOT_DIR"
  done
}

# ─── Publish ───
publish_all() {
  header "Publishing to npm"

  for pkg in "${PACKAGES[@]}"; do
    local name version
    name=$(node -e "console.log(require('./$pkg/package.json').name)")
    version=$(node -e "console.log(require('./$pkg/package.json').version)")

    info "Publishing $name@$version..."
    cd "$pkg"
    npm publish --access public --userconfig="$ROOT_DIR/.npmrc"
    cd "$ROOT_DIR"
    ok "$name@$version published"
  done
}

# ─── Publish (beta) ───
publish_all_beta() {
  header "Publishing to npm (--tag beta)"

  for pkg in "${PACKAGES[@]}"; do
    local name version
    name=$(node -e "console.log(require('./$pkg/package.json').name)")
    version=$(node -e "console.log(require('./$pkg/package.json').version)")

    info "Publishing $name@$version (tag: beta)..."
    cd "$pkg"
    npm publish --access public --tag beta --userconfig="$ROOT_DIR/.npmrc"
    cd "$ROOT_DIR"
    ok "$name@$version published as @beta"
  done
}

# ─── Git tag + push (beta: uses current branch, not main) ───
tag_and_push_beta() {
  local version="$1"
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)

  header "Git tag + push (beta, branch: $current_branch)"

  git add -A
  git commit -m "release: v$version" || true
  git tag "v$version" -m "Beta release v$version"

  echo ""
  read -rp "  Push to origin/$current_branch with tag v$version? (y/n) " answer
  if [[ "$answer" == "y" ]]; then
    git push origin "$current_branch" --tags
    ok "Pushed v$version to origin/$current_branch"

    create_github_prerelease "$version"
  else
    warn "Skipped push. Run manually: git push origin $current_branch --tags"
  fi
}

# ─── GitHub Pre-release ───
create_github_prerelease() {
  local version="$1"
  local tag="v$version"

  if ! command -v gh &>/dev/null; then
    warn "gh CLI not found, skipping GitHub release"
    return
  fi

  header "Creating GitHub pre-release"

  local prev_tag
  prev_tag=$(git tag --sort=-v:refname | grep -E '^v[0-9]' | sed -n '2p')

  local notes
  if [[ -n "$prev_tag" ]]; then
    notes=$(git log --pretty=format:"- %s" "$prev_tag..$tag" -- . ':!node_modules' | grep -v "^- release:")
  else
    notes=$(git log --pretty=format:"- %s" "$tag" -- . ':!node_modules' | head -20 | grep -v "^- release:")
  fi

  [[ -z "$notes" ]] && notes="Pre-release $tag"

  gh release create "$tag" \
    --title "$tag" \
    --notes "$notes" \
    --prerelease

  ok "GitHub pre-release $tag created"
}

# ─── Git tag + push + GitHub release ───
tag_and_push() {
  local version="$1"

  header "Git tag + push"

  git add -A
  git commit -m "release: v$version" || true
  git tag "v$version" -m "Release v$version"

  echo ""
  read -rp "  Push to origin? (y/n) " answer
  if [[ "$answer" == "y" ]]; then
    git push origin main --tags
    ok "Pushed v$version to origin"

    create_github_release "$version"
  else
    warn "Skipped push. Run manually: git push origin main --tags"
  fi
}

# ─── GitHub Release ───
create_github_release() {
  local version="$1"
  local tag="v$version"

  if ! command -v gh &>/dev/null; then
    warn "gh CLI not found, skipping GitHub release"
    return
  fi

  header "Creating GitHub release"

  local prev_tag
  prev_tag=$(git tag --sort=-v:refname | grep -E '^v[0-9]' | sed -n '2p')

  local notes
  if [[ -n "$prev_tag" ]]; then
    notes=$(git log --pretty=format:"- %s" "$prev_tag..$tag" -- . ':!node_modules' | grep -v "^- release:")
  else
    notes=$(git log --pretty=format:"- %s" "$tag" -- . ':!node_modules' | head -20 | grep -v "^- release:")
  fi

  if [[ -z "$notes" ]]; then
    notes="Release $tag"
  fi

  gh release create "$tag" \
    --title "$tag" \
    --notes "$notes" \
    --latest

  ok "GitHub release $tag created"
}

# ─── Main ───
main() {
  show_menu
  read -rp "  Select: " choice

  case "$choice" in
    1|2|3)
      local bump_type
      case "$choice" in
        1) bump_type="patch" ;;
        2) bump_type="minor" ;;
        3) bump_type="major" ;;
      esac

      preflight_checks
      local new_version
      new_version=$(bump_version "$bump_type")
      run_tests
      build_all
      dry_run

      echo ""
      read -rp "  Ready to publish v$new_version? (y/n) " answer
      [[ "$answer" != "y" ]] && { warn "Aborted."; exit 0; }

      publish_all
      tag_and_push "$new_version"

      echo ""
      ok "Release v$new_version complete!"
      echo -e "  ${DIM}https://www.npmjs.com/package/@ng-prism/core${RESET}"
      ;;

    4)
      local current
      current=$(current_version)
      if [[ "$current" =~ -beta\.[0-9]+$ ]]; then
        err "Current version $current is a beta and cannot be published to 'latest'."
        warn "Use option 6 (re-publish beta) or option 7 (promote to stable) instead."
        exit 1
      fi
      preflight_checks
      build_all
      publish_all
      ok "Published current version $current"
      ;;

    5)
      build_all
      dry_run
      ok "Dry run complete, nothing published"
      ;;

    6)
      local current beta_mode
      current=$(current_version)

      if [[ "$current" =~ -beta\.[0-9]+$ ]]; then
        echo ""
        echo "  Current version is a beta: $current"
        echo "  1) Iterate beta    (next beta.N+1)"
        echo "  2) New beta series (bump base patch)"
        echo "  3) New beta series (bump base minor)"
        echo "  4) New beta series (bump base major)"
        echo ""
        read -rp "  Select (default 1): " sub_choice
        sub_choice=${sub_choice:-1}
        case "$sub_choice" in
          1) beta_mode="iterate" ;;
          2) beta_mode="patch" ;;
          3) beta_mode="minor" ;;
          4) beta_mode="major" ;;
          *) err "Invalid choice"; exit 1 ;;
        esac
      else
        echo ""
        echo "  Base bump for new beta series:"
        echo "  1) Patch  (next patch + -beta.0)"
        echo "  2) Minor  (next minor + -beta.0)"
        echo "  3) Major  (next major + -beta.0)"
        echo ""
        read -rp "  Select (default 2): " sub_choice
        sub_choice=${sub_choice:-2}
        case "$sub_choice" in
          1) beta_mode="patch" ;;
          2) beta_mode="minor" ;;
          3) beta_mode="major" ;;
          *) err "Invalid choice"; exit 1 ;;
        esac
      fi

      preflight_checks
      local new_version
      new_version=$(bump_beta_version "$beta_mode")
      run_tests
      build_all
      dry_run

      echo ""
      read -rp "  Ready to publish v$new_version as @beta? (y/n) " answer
      [[ "$answer" != "y" ]] && { warn "Aborted."; exit 0; }

      publish_all_beta
      tag_and_push_beta "$new_version"

      echo ""
      ok "Beta release v$new_version complete!"
      echo -e "  ${DIM}Install: npm i @ng-prism/core@beta${RESET}"
      echo -e "  ${DIM}https://www.npmjs.com/package/@ng-prism/core${RESET}"
      ;;

    7)
      local current
      current=$(current_version)
      if [[ ! "$current" =~ -beta\.[0-9]+$ ]]; then
        err "Current version $current is not a beta, nothing to promote"
        exit 1
      fi

      preflight_checks
      local new_version
      new_version=$(promote_beta_to_stable)
      run_tests
      build_all
      dry_run

      echo ""
      read -rp "  Ready to publish v$new_version as latest? (y/n) " answer
      [[ "$answer" != "y" ]] && { warn "Aborted."; exit 0; }

      publish_all
      tag_and_push "$new_version"

      echo ""
      ok "Promote $current to v$new_version complete!"
      echo -e "  ${DIM}https://www.npmjs.com/package/@ng-prism/core${RESET}"
      ;;

    0)
      exit 0
      ;;

    *)
      err "Invalid choice"
      exit 1
      ;;
  esac
}

main
