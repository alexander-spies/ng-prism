#!/usr/bin/env node
/**
 * Renders the raster brand assets from docs/assets/brand/cover.html:
 *
 * - docs/prism_cover.png: the README cover (2048 × 760).
 * - docs/prism_logo_docs.png: the lockup on a transparent ground.
 *
 * Raster because an SVG in an <img> loads no web fonts, and the wordmark would
 * fall back to Arial. The PNGs keep their old names, so links from outside the
 * repo show the current brand too. Uses the root Playwright devDependency.
 *
 *   node scripts/render-brand-assets.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = pathToFileURL(join(root, 'docs/assets/brand/cover.html')).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 2 });

await page.goto(source, { waitUntil: 'networkidle' });
// Evaluated in the page, where `document` exists; passed as a string so the Node lint scope stays clean.
await page.evaluate('document.fonts.ready');
await page.locator('#cover').screenshot({ path: join(root, 'docs/prism_cover.png') });
await page.locator('#lockup').screenshot({ path: join(root, 'docs/prism_logo_docs.png'), omitBackground: true });
await browser.close();

console.log('rendered docs/prism_cover.png and docs/prism_logo_docs.png');
