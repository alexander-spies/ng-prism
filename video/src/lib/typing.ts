// The typing effect of the code cards: Revideo's insert() fades new code in, so the scenes grow the code in steps.

/** Where `after` inserts one block into `before`; at a line start when possible, so a new decorator never splits `@`. */
export function insertionOf(before: string, after: string): { at: number; text: string } {
    let prefix = 0;
    while (prefix < before.length && before[prefix] === after[prefix]) prefix++;
    const lineStart = before.lastIndexOf('\n', prefix - 1) + 1;
    for (const at of [lineStart, prefix]) {
        const rest = before.slice(at);
        if (after.length >= before.length && after.startsWith(before.slice(0, at)) && after.endsWith(rest)) {
            return { at, text: after.slice(at, after.length - rest.length) };
        }
    }
    throw new Error('The code after is not the code before with one block inserted');
}

/**
 * The code after each typed token (word, whitespace run or single symbol) of the inserted block; ends on `after`.
 * A block of whole lines keeps its final line break from the first step on, so the code below it never joins the
 * line being typed.
 */
export function typingSteps(before: string, after: string): string[] {
    const { at, text } = insertionOf(before, after);
    const wholeLines = text.endsWith('\n') && (at === 0 || before[at - 1] === '\n');
    const tokens = text.match(/\s+|\w+|[^\s\w]/g) ?? [];
    const steps: string[] = [];
    let typed = '';
    for (const token of tokens) {
        typed += token;
        const step = before.slice(0, at) + typed + (wholeLines && !typed.endsWith('\n') ? '\n' : '') + before.slice(at);
        if (step !== steps.at(-1)) steps.push(step);
    }
    return steps;
}
