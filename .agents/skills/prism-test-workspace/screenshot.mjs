#!/usr/bin/env node
// Screenshot one component variant of a running Prism app (see SKILL.md).
//
//   node .agents/skills/prism-test-workspace/screenshot.mjs --component ButtonComponent [--variant 1] [--shell] [--port 4400] [--out file.png]
//
// Default: capture mode (`capture=1`), element screenshot of `.demo-wrap`.
// --shell: full window without capture mode, for changes to the styleguide UI itself.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values } = parseArgs({
    options: {
        component: { type: 'string' },
        variant: { type: 'string', default: '0' },
        port: { type: 'string', default: '4400' },
        shell: { type: 'boolean', default: false },
        out: { type: 'string' },
        timeout: { type: 'string', default: '30000' }
    }
});

if (!values.component) {
    console.error('Missing --component <ClassName>, e.g. --component ButtonComponent');
    process.exit(2);
}

const { component, variant, port, shell } = values;
const timeout = Number(values.timeout);
const out = values.out ?? join(tmpdir(), `prism-${component}-${variant}${shell ? '-shell' : ''}.png`);
const query = new URLSearchParams({ component, variant });
if (!shell) query.set('capture', '1');
const url = `http://localhost:${port}/?${query}`;
const marker = `.demo-wrap[data-prism-rendered="${component}:${variant}"]`;

const browser = await chromium.launch();
const errors = [];
let exitCode = 0;

try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    try {
        await page.waitForSelector(marker, { timeout });
    } catch {
        await page.screenshot({ path: out });
        console.error(`Variant never rendered: no ${marker} within ${timeout} ms at ${url}`);
        console.error(`Saved the full window for diagnosis: ${out}`);
        exitCode = 1;
    }

    if (exitCode === 0) {
        if (shell) {
            await page.screenshot({ path: out });
        } else {
            await page.locator('.demo-wrap').screenshot({ path: out });
        }
        console.log(`${url}\n${out}`);
    }
} finally {
    await browser.close();
}

if (errors.length > 0) {
    console.error(`Browser console errors (${errors.length}):\n${errors.map((e) => `  ${e}`).join('\n')}`);
}

process.exit(exitCode);
