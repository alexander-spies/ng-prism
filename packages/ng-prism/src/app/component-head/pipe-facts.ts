/**
 * The plain facts about a pipe for the head's info popover: whether it is pure,
 * and where to import it from. Both are optional on a scanned pipe (purity when
 * `@Pipe({ pure })` could not be read, the import path when the scanner could not
 * place the pipe), so a fact the scanner could not establish is left out rather
 * than guessed.
 */
export function pipeFacts(pure: boolean | undefined, importPath: string | undefined): string[] {
    const facts: string[] = [];

    if (pure !== undefined) facts.push(pure ? 'Pure' : 'Impure');
    if (importPath) facts.push(importPath);
    return facts;
}
