/** Makes `text` safe inside a generated template literal: a backslash, a backtick or `${` in it would end the literal or start an expression. */
export function escapeTemplateLiteral(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
