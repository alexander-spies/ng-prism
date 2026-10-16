import { PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';

/** Prefix of the classes that stand in for a forced pseudo-class. */
export const PSEUDO_CLASS_PREFIX = 'prism-pseudo--';

/** The class that stands in for `state`, e.g. `prism-pseudo--focus-visible`. */
export function pseudoStateClass(state: PseudoState): string {
    return `${PSEUDO_CLASS_PREFIX}${state}`;
}

const FORCEABLE: ReadonlySet<string> = new Set(PSEUDO_STATES);

/** CSS 2 pseudo-elements, which still parse with a single colon. */
const LEGACY_PSEUDO_ELEMENTS: ReadonlySet<string> = new Set(['before', 'after', 'first-line', 'first-letter']);

const HEX_DIGIT = /[0-9a-f]/i;
const WHITESPACE = /[ \t\n\r\f]/;
const IDENT_CHAR = /[a-z0-9_-]/i;

/**
 * The selector with every forced pseudo-class replaced by its class
 * ({@link pseudoStateClass}), or `null` when it uses none.
 *
 * A class has the specificity of the pseudo-class it replaces, so a copy of the
 * rule under the rewritten selector competes in the cascade exactly as the
 * original does. Of a selector list only the items that changed are kept: the
 * others already apply through the original rule.
 *
 * Tokenised rather than string-replaced. An escaped colon (`.md\:hover`) and an
 * attribute value (`[title=":hover"]`) are left alone, and a state that follows
 * a pseudo-element (`::part(x):hover`) is kept as it is, because a class is not
 * allowed there.
 */
export function rewritePseudoSelector(selectorText: string): string | null {
    const s = selectorText;
    const rewritten: string[] = [];
    let item = '';
    let changed = false;
    // One entry per nesting level: whether the compound being read follows a pseudo-element.
    const afterPseudoElement = [false];
    let i = 0;

    const endItem = (): void => {
        if (changed) rewritten.push(item.trim());
        item = '';
        changed = false;
    };

    while (i < s.length) {
        const ch = s[i];
        const level = afterPseudoElement.length - 1;

        if (ch === '\\') {
            const end = escapeEnd(s, i);

            item += s.slice(i, end);
            i = end;
        } else if (ch === '"' || ch === "'") {
            const end = stringEnd(s, i);

            item += s.slice(i, end);
            i = end;
        } else if (ch === '[') {
            const end = attributeEnd(s, i);

            item += s.slice(i, end);
            i = end;
        } else if (ch === '(') {
            afterPseudoElement.push(false);
            item += ch;
            i++;
        } else if (ch === ')') {
            if (level > 0) afterPseudoElement.pop();
            item += ch;
            i++;
        } else if (ch === ',' && level === 0) {
            endItem();
            i++;
        } else if (ch === ',' || ch === '>' || ch === '+' || ch === '~' || WHITESPACE.test(ch)) {
            afterPseudoElement[level] = false;
            item += ch;
            i++;
        } else if (ch === ':') {
            const isElement = s[i + 1] === ':';
            const nameStart = i + (isElement ? 2 : 1);
            const nameEnd = identEnd(s, nameStart);
            const name = s.slice(nameStart, nameEnd).toLowerCase();

            if (!isElement && FORCEABLE.has(name) && s[nameEnd] !== '(' && !afterPseudoElement[level]) {
                item += `.${PSEUDO_CLASS_PREFIX}${name}`;
                changed = true;
            } else {
                if (isElement || LEGACY_PSEUDO_ELEMENTS.has(name)) afterPseudoElement[level] = true;
                item += s.slice(i, nameEnd);
            }
            i = nameEnd;
        } else {
            item += ch;
            i++;
        }
    }
    endItem();

    return rewritten.length > 0 ? rewritten.join(', ') : null;
}

/** End of the escape starting at `start`: a hex escape takes up to six digits and one whitespace character. */
function escapeEnd(s: string, start: number): number {
    let i = start + 1;

    if (i >= s.length) return i;
    if (!HEX_DIGIT.test(s[i])) return i + 1;
    while (i < s.length && i < start + 7 && HEX_DIGIT.test(s[i])) i++;
    if (s[i] === '\r' && s[i + 1] === '\n') return i + 2;
    return i < s.length && WHITESPACE.test(s[i]) ? i + 1 : i;
}

function identEnd(s: string, start: number): number {
    let i = start;

    while (i < s.length) {
        if (s[i] === '\\') {
            i = escapeEnd(s, i);
        } else if (IDENT_CHAR.test(s[i]) || s.charCodeAt(i) >= 0x80) {
            i++;
        } else {
            break;
        }
    }
    return i;
}

function stringEnd(s: string, start: number): number {
    const quote = s[start];
    let i = start + 1;

    while (i < s.length) {
        if (s[i] === '\\') i += 2;
        else if (s[i] === quote) return i + 1;
        else i++;
    }
    return i;
}

function attributeEnd(s: string, start: number): number {
    let i = start + 1;

    while (i < s.length) {
        if (s[i] === '\\') i = escapeEnd(s, i);
        else if (s[i] === '"' || s[i] === "'") i = stringEnd(s, i);
        else if (s[i] === ']') return i + 1;
        else i++;
    }
    return i;
}
