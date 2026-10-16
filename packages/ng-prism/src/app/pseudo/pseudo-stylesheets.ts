import { isDevMode } from '@angular/core';
import { rewritePseudoSelector } from './pseudo-selector.js';

/** A stylesheet or a grouping rule: anything that holds rules and takes new ones. */
interface RuleContainer {
    readonly cssRules: CSSRuleList;
    insertRule(rule: string, index?: number): number;
}

// Duck-typed rather than `instanceof`: the constructors belong to the window
// that owns the sheet, and not every engine has all of them (`CSSContainerRule`,
// `CSSLayerBlockRule`).
function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
    return typeof (rule as Partial<CSSStyleRule>).selectorText === 'string' && 'style' in rule;
}

// `@media`, `@supports`, `@layer`, `@container`, and a style rule with nested
// rules. `@keyframes` holds rules too, but takes them through `appendRule`, so
// its keyframe selectors never reach `rewritePseudoSelector`.
function isRuleContainer(rule: CSSRule): rule is CSSRule & RuleContainer {
    return 'cssRules' in rule && typeof (rule as Partial<RuleContainer>).insertRule === 'function';
}

function isImportRule(rule: CSSRule): rule is CSSImportRule {
    return 'styleSheet' in rule && 'href' in rule;
}

/**
 * The text of `rule` under a different selector, nested rules included.
 *
 * CSSOM serialises a style rule as its selector followed by the block, so the
 * block is what follows `selectorText`. The fallback copies the declarations
 * only and is not expected to be reached.
 */
function copyText(rule: CSSStyleRule, selector: string): string {
    const text = rule.cssText;

    return text.startsWith(rule.selectorText) ? selector + text.slice(rule.selectorText.length) : `${selector} { ${rule.style.cssText} }`;
}

/**
 * Gives every rule in `container` that uses a forced pseudo-class a copy keyed
 * on the class instead, inserted directly after the original.
 *
 * Directly after, not at the end of the sheet: the copy then sits where the
 * original sits in source order, so it wins and loses against other rules of
 * the same specificity exactly as the original does. The original stays as it
 * is. Without the class on an element the copy matches nothing, which is what
 * keeps the shell and every other variant untouched.
 *
 * Returns the number of copies inserted.
 */
export function rewriteRules(container: RuleContainer): number {
    let copies = 0;

    for (let i = 0; i < container.cssRules.length; i++) {
        const rule = container.cssRules[i];

        if (!isStyleRule(rule)) {
            if (isRuleContainer(rule)) copies += rewriteRules(rule);
            continue;
        }

        const selector = rewritePseudoSelector(rule.selectorText);
        let copy: CSSRule | null = null;

        if (selector !== null) {
            try {
                container.insertRule(copyText(rule, selector), i + 1);
                copy = container.cssRules[i + 1];
                copies++;
                i++;
            } catch (error) {
                if (isDevMode()) console.warn(`[ng-prism] Could not force a pseudo state for "${rule.selectorText}":`, error);
            }
        }
        // A nested rule can force a state of its own (`.a { &:hover {} }`), in the original and in its copy.
        if (isRuleContainer(rule)) copies += rewriteRules(rule);
        if (copy && isRuleContainer(copy)) copies += rewriteRules(copy);
    }
    return copies;
}

/**
 * The document's stylesheets, rewritten for forced pseudo states.
 *
 * Lazy: nothing is touched until a variant forces a state. Every sheet is
 * rewritten once, tracked by object, which also covers a `<style>` whose
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
