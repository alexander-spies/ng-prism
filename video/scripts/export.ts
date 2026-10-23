// Turns the masters into what gets published.
//
//   node scripts/export.ts tour | release-<version>   out/deliver/<cut>.mp4
//   node scripts/export.ts readme-loop                docs/assets/video/: readme-loop.webp (the first step of the ladder
//                                                     within budget), docs-loop.mp4, docs-loop.webm, poster.png
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    framesArgs,
    frameDurationsMs,
    img2webpArgs,
    mp4Args,
    pickReadmeAttempt,
    posterArgs,
    README_LADDER,
    README_LOOP_BUDGET_BYTES,
    webmArgs,
    type LoopLength,
    type ReadmeAttempt
} from './export-plan.ts';
import { MASTERS_DIR, render, variablesFor } from './render.ts';
import { REPO_ROOT } from '../src/lib/recordings.ts';

const OUT_DIR = join(REPO_ROOT, 'video/out');
const DELIVER_DIR = join(OUT_DIR, 'deliver');
const README_WORK_DIR = join(OUT_DIR, 'readme');
const DOCS_VIDEO_DIR = join(REPO_ROOT, 'docs/assets/video');

function ffmpeg(args: string[]): void {
    execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

/** The README loop's master of `length`, rendered when it is not there yet. */
async function loopMaster(length: LoopLength): Promise<string> {
    const file = join(MASTERS_DIR, `readme-loop-${length}.mov`);
    if (!existsSync(file)) {
        console.log(`Rendering readme-loop-${length} …`);
        await render('readme-loop', await variablesFor('readme-loop', { length }), `readme-loop-${length}.mov`);
    }
    return file;
}

/** One step of the ladder: the master as frames at `fps`, then an animated WebP. Returns the WebP and its size. */
async function buildWebp(step: ReadmeAttempt): Promise<{ file: string; bytes: number }> {
    const name = `${step.length}-${step.fps}`;
    const framesDir = join(README_WORK_DIR, `${name}.frames`);
    rmSync(framesDir, { recursive: true, force: true });
    mkdirSync(framesDir, { recursive: true });
    ffmpeg(framesArgs(await loopMaster(step.length), framesDir, step.fps));
    const frames = readdirSync(framesDir)
        .filter((file) => file.endsWith('.png'))
        .sort();
    const file = join(README_WORK_DIR, `${name}.webp`);
    // Frame names relative to the frames directory keep the command line short: a 20 s loop has 1 200 frames.
    execFileSync('img2webp', img2webpArgs(frames, frameDurationsMs(step.fps, frames.length), file), { cwd: framesDir, stdio: ['ignore', 'ignore', 'inherit'] });
    return { file, bytes: statSync(file).size };
}

async function exportReadmeLoop(): Promise<void> {
    mkdirSync(README_WORK_DIR, { recursive: true });
    mkdirSync(DOCS_VIDEO_DIR, { recursive: true });
    const results: Array<ReadmeAttempt & { bytes: number; file: string }> = [];
    for (const step of README_LADDER) {
        console.log(`README loop: trying ${step.length} at ${step.fps} fps …`);
        const webp = await buildWebp(step);
        console.log(`  ${(webp.bytes / 1e6).toFixed(2)} MB (budget ${(README_LOOP_BUDGET_BYTES / 1e6).toFixed(2)} MB)`);
        results.push({ ...step, ...webp });
        if (pickReadmeAttempt(results, README_LOOP_BUDGET_BYTES)) break;
    }
    const picked = pickReadmeAttempt(results, README_LOOP_BUDGET_BYTES);
    const chosen = picked && results.find((result) => result.length === picked.length && result.fps === picked.fps);
    if (!chosen) {
        console.error(`README loop exceeds ${README_LOOP_BUDGET_BYTES} bytes even at short/30 fps. Ask the user, do not change the format.`);
        process.exit(1);
    }
    copyFileSync(chosen.file, join(DOCS_VIDEO_DIR, 'readme-loop.webp'));
    console.log(`README loop: ${chosen.length} at ${chosen.fps} fps → docs/assets/video/readme-loop.webp`);

    // The docs page plays the full loop as a real video; its last frame, the code without @Showcase, is the poster.
    const full = await loopMaster('full');
    ffmpeg(mp4Args(full, join(DOCS_VIDEO_DIR, 'docs-loop.mp4')));
    ffmpeg(webmArgs(full, join(DOCS_VIDEO_DIR, 'docs-loop.webm')));
    ffmpeg(posterArgs(full, join(DOCS_VIDEO_DIR, 'poster.png')));
    console.log('Docs loop: docs/assets/video/docs-loop.{mp4,webm}, poster.png');
}

function exportSocial(cut: string): void {
    const master = join(MASTERS_DIR, `${cut}.mov`);
    if (!existsSync(master)) throw new Error(`No master ${master}: run \`npm run render -- ${cut.replace(/^release-/, 'release --version ')}\` first`);
    mkdirSync(DELIVER_DIR, { recursive: true });
    const output = join(DELIVER_DIR, `${cut}.mp4`);
    ffmpeg(mp4Args(master, output));
    console.log(output);
}

const cut = process.argv[2];
if (cut === 'readme-loop') await exportReadmeLoop();
else if (cut === 'tour' || cut?.startsWith('release-')) exportSocial(cut);
else throw new Error(`Usage: node scripts/export.ts <tour|release-<version>|readme-loop>, not "${cut}"`);
process.exit(0);
