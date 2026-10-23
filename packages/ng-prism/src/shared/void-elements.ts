/** The HTML elements that take no content and no end tag: `<input>` and `<input />` are valid, `<input></input>` is not. */
export const VOID_ELEMENTS: ReadonlySet<string> = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
