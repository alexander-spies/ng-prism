// The commit-msg hook: drops the co-author trailers AI tools add to a commit message, Claude Code's
// "Co-Authored-By: Claude … <noreply@anthropic.com>" and Copilot's "Co-authored-by: Copilot <…+Copilot@users.noreply.github.com>".
// Once such a commit reaches the default branch, GitHub lists the tool among the repo's contributors.
// The trailers are matched by address, so a person named Claude keeps the credit.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const message = readFileSync(file, 'utf8');
const cleaned = message.replace(/^co-authored-by:[^\n]*<(noreply@anthropic\.com|[^>\n]*\+copilot@users\.noreply\.github\.com)>[ \t]*\r?\n?/gim, '').replace(/\s+$/, '\n');
if (cleaned !== message) writeFileSync(file, cleaned);
