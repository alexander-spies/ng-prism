import { isDevMode } from '@angular/core';
import { rewritePseudoSelector } from './pseudo-selector.js';

/** A stylesheet or a grouping rule: anything that holds rules. */
interface RuleContainer {
    readonly cssRules: CSSRuleList;
}

// Duck-typed rather than `instanceof`: the constructors belong to the window
// that owns the sheet, and not every engine has all of them (`CSSContainerRule`,
// `CSSLayerBlockRule`).
function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
    return typeof (rule as Partial<CSSStyleRule>).selectorText === 'string' && 'style' in rule;
}

// `@media`, `@supports`, `@layer`, `@container`, and a style rule with nested
// rules. `@keyframes` holds rules too, but no selectors: it is the one that
// takes new rules through `appendRule` instead of `insertRule`.
function isRuleContainer(rule: CSSRule): rule is CSSRule & RuleContainer {
    return 'cssRules' in rule && typeof (rule as Partial<CSSGroupingRule>).insertRule === 'function';
}

function isImportRule(rule: CSSRule): rule is CSSImportRule {
    return 'styleSheet' in rule && 'href' in rule;
}

/**
 * Widens every selector in `container` that uses a forced pseudo-class, so it
 * also matches the pseudo-class's stand-in class: `:hover` becomes
 * `:is(:hover, .prism-pseudo--hover)` ({@link rewritePseudoSelector}).
 *
 * In place, through `selectorText`. The rule keeps its position in the sheet
 * and its specificity, so it wins and loses against the rules around it exactly
 * as it does for the real state, and no index another script holds moves.
 * Without the class on an element the widened selector matches what the
 * original matched, which keeps the shell and every other variant untouched.
 * A copy of the rule could not keep `:not(:hover)` right: it would either
 * match a really hovered element or leave the original matching a forced one.
 *
 * Idempotent: a selector widened before is not widened again.
 * Returns the number of selectors widened.
 */
export function rewriteRules(container: RuleContainer): number {
    let widened = 0;

    for (const rule of Array.from(container.cssRules)) {
        if (isStyleRule(rule)) {
            const original = rule.selectorText;
            const selector = rewritePseudoSelector(original);

            if (selector !== null) {
                rule.selectorText = selector;
                // The setter ignores a selector the engine does not accept.
                if (rule.selectorText !== original) widened++;
                else if (isDevMode()) console.warn(`[ng-prism] Could not force a pseudo state for "${original}".`);
            }
        }
        // A nested rule can force a state of its own (`.a { &:hover {} }`).
        if (isRuleContainer(rule)) widened += rewriteRules(rule);
    }
    return widened;
}

/**
 * The document's stylesheets, rewritten for forced pseudo states.
 *
 * Lazy: nothing is touched until a variant forces a state ({@link rewriteRules}
 * says what changes). Every sheet is rewritten once, tracked by object, which also covers a `<style>` whose
 * content is replaced (HMR, Angular removing and re-adding component styles):
 * the browser gives it a new sheet, and the new sheet is rewritten again.
 *
 * `document.head` is watched only while at least one marker holds the sheets
 * ({@link acquire}), so styles that arrive later, through a lazily rendered
 * child component or a hot reload, are rewritten too.
 */
export class PseudoStyleSheets {
    private readonly rewritten = new WeakSet<CSSStyleSheet>();
    private readonly awaitedLinks = new WeakSet<Element>();
    private observer: MutationObserver | null = null;
    private holders = 0;

    constructor(private readonly doc: Document) {}

    /** Rewrites what has not been rewritten yet, and keeps doing so for new styles until {@link release}. */
    acquire(): void {
        this.holders++;
        this.sync();
        if (this.observer || typeof MutationObserver === 'undefined' || !this.doc.head) return;
        this.observer = new MutationObserver(() => this.sync());
        this.observer.observe(this.doc.head, { childList: true, subtree: true, characterData: true });
    }

    release(): void {
        if (this.holders === 0) return;
        this.holders--;
        if (this.holders > 0) return;
        this.observer?.disconnect();
        this.observer = null;
    }

    /** Rewrites every sheet of the document that has not been rewritten yet. */
    sync(): void {
        for (const sheet of Array.from(this.doc.styleSheets)) this.rewriteSheet(sheet);
        for (const sheet of this.doc.adoptedStyleSheets ?? []) this.rewriteSheet(sheet);
        // A `<link>` has no sheet until it has loaded.
        for (const link of Array.from(this.doc.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]'))) {
            if (link.sheet || this.awaitedLinks.has(link)) continue;
            this.awaitedLinks.add(link);
            link.addEventListener(
                'load',
                () => {
                    this.awaitedLinks.delete(link);
                    if (this.holders > 0) this.sync();
                },
                { once: true }
            );
        }
    }

    rewriteSheet(sheet: CSSStyleSheet): void {
        if (this.rewritten.has(sheet)) return;

        let rules: CSSRuleList;

        try {
            rules = sheet.cssRules;
        } catch (error) {
            // Anything else means the sheet has not loaded yet; the link's load listener comes back to it.
            if (!(error instanceof DOMException) || error.name !== 'SecurityError') return;
            this.rewritten.add(sheet);
            if (isDevMode()) {
                console.warn(
                    `[ng-prism] Cannot force pseudo states in ${sheet.href ?? 'a stylesheet'}: its rules are cross-origin and cannot be read. ` +
                        'Serve it from the same origin, or with CORS and a crossorigin attribute.'
                );
            }
            return;
        }

        this.rewritten.add(sheet);
        for (const rule of Array.from(rules)) {
            if (isImportRule(rule) && rule.styleSheet) this.rewriteSheet(rule.styleSheet);
        }
        rewriteRules(sheet);
    }
}
