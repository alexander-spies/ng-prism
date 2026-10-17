#!/usr/bin/env node
// Screenshot one @Showcase variant in a running ng-prism styleguide. Ships with the `showcase` skill of the
// ng-prism Claude Code plugin; ng-prism's own repo runs it too (skill prism-test-workspace).
//
//   node <skill dir>/scripts/screenshot.mjs --component ButtonComponent [--variant 1] [--shell]
//        [--url http://localhost:4400] [--out file.png] [--timeout 30000]
//
// Run it from the project root. Playwright comes from that project (`playwright`, else `@playwright/test`),
// resolved from the current directory, never from where this file lives (a plugin cache has no node_modules).
//
// Default: capture mode (`capture=1`), element screenshot of `.demo-wrap`.
// --shell: the full window without capture mode, for the styleguide UI around the component.
//
// Exit codes: 0 saved · 1 styleguide unreachable, component or variant unknown, or the variant never
// rendered · 2 invalid arguments · 3 Playwright or its Chromium missing.
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const INSTALL_HINT = 'npm i -D playwright && npx playwright install chromium';

function exitWith(code, message) {
    console.error(message);
    process.exit(code);
}

function firstLine(error) {
    return String(error?.message ?? error).split('\n')[0];
}

let values;
try {
    ({ values } = parseArgs({
        options: {
            component: { type: 'string' },
            variant: { type: 'string', default: '0' },
            url: { type: 'string', default: 'http://localhost:4400' },
            shell: { type: 'boolean', default: false },
            out: { type: 'string' },
            timeout: { type: 'string', default: '30000' }
        }
    }));
} catch (error) {
    exitWith(2, firstLine(error));
}

const { component, shell } = values;
if (!component) exitWith(2, 'Missing --component <ClassName>, e.g. --component ButtonComponent');
if (!/^\d+$/.test(values.variant)) exitWith(2, `--variant must be a 0-based index, got "${values.variant}"`);
const variant = Number(values.variant);
const timeout = Number(values.timeout);
if (!Number.isInteger(timeout) || timeout <= 0) exitWith(2, `--timeout must be a positive number of milliseconds, got "${values.timeout}"`);

let base;
try {
    base = new URL(values.url);
} catch {
    base = undefined;
}
if (!base || !['http:', 'https:'].includes(base.protocol)) exitWith(2, `--url must be an http(s) URL such as http://localhost:4400, got "${values.url}"`);

const out = values.out ?? join(tmpdir(), `prism-${component}-${variant}${shell ? '-shell' : ''}.png`);
const target = new URL(base);
target.searchParams.set('component', component);
target.searchParams.set('variant', String(variant));
if (!shell) target.searchParams.set('capture', '1');
const url = target.href;
const marker = `.demo-wrap[data-prism-rendered="${component}:${variant}"]`;

async function loadChromium() {
    const requireFromProject = createRequire(join(process.cwd(), 'package.json'));
    for (const name of ['playwright', '@playwright/test']) {
        let entry;
        try {
            entry = requireFromProject.resolve(name);
        } catch {
            continue;
        }
        // Playwright's entry is CommonJS: imported as ESM, its API sits on `default`.
        const playwright = await import(pathToFileURL(entry).href);
        return playwright.chromium ?? playwright.default?.chromium;
    }
    return undefined;
}

async function capture(page) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    } catch (error) {
        console.error(`No styleguide answers at ${base.href} (${firstLine(error)}). Start it first, e.g. ng run <lib>:prism, and pass --url when it runs elsewhere.`);
        return 1;
    }

    let manifest;
    try {
        await page.waitForFunction(() => globalThis.__PRISM_MANIFEST__ !== undefined, undefined, { timeout });
        manifest = await page.evaluate(() => globalThis.__PRISM_MANIFEST__);
    } catch {
        await page.screenshot({ path: out });
        console.error(`${base.href} answers, but window.__PRISM_MANIFEST__ never appeared within ${timeout} ms; is this an ng-prism styleguide?`);
        console.error(`Saved the full window for diagnosis: ${out}`);
        return 1;
    }

    const entry = manifest.components.find((c) => c.className === component);
    if (!entry) {
        const known = manifest.components.map((c) => `  ${c.className}`).join('\n');
        console.error(`No component "${component}" in this styleguide. Known components:\n${known}`);
        return 1;
    }
    if (variant >= entry.variants.length) {
        const variants = entry.variants.map((v) => `  ${v.index}  ${v.name}`).join('\n');
        console.error(`${component} has ${entry.variants.length} variant(s); --variant ${variant} does not exist:\n${variants}`);
        return 1;
    }

    try {
        await page.waitForSelector(marker, { timeout });
    } catch {
        await page.screenshot({ path: out });
        console.error(`Variant never rendered: no ${marker} within ${timeout} ms at ${url}`);
        console.error(`Saved the full window for diagnosis: ${out}`);
        return 1;
    }

    if (shell) {
        await page.screenshot({ path: out });
    } else {
        await page.locator('.demo-wrap').screenshot({ path: out });
    }
    console.log(`${url}\n${out}`);
    return 0;
}

const chromium = await loadChromium();
if (!chromium) exitWith(3, `Playwright is not installed in ${process.cwd()}. Run this from the project root, or install it:\n  ${INSTALL_HINT}`);

let browser;
try {
    browser = await chromium.launch();
} catch (error) {
    exitWith(3, `Playwright could not start Chromium: ${firstLine(error)}\nInstall the browser with:\n  ${INSTALL_HINT}`);
}

const errors = [];
let exitCode = 1;

try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(error.message));
    exitCode = await capture(page);
} finally {
    await browser.close();
}

if (errors.length > 0) {
    console.error(`Browser console errors (${errors.length}):\n${errors.map((e) => `  ${e}`).join('\n')}`);
}

process.exit(exitCode);
