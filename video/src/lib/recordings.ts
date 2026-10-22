// The recordings manifest (out/recordings/manifest.json) and the check that keeps old recordings from being cut to new
// code: it stores a hash of everything the styleguide is built from, and a render refuses recordings with another hash.
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** A rectangle of an element at a moment of a recording, in CSS px of the 1920×1080 viewport; `at` in seconds from the start. */
export interface FocusMark {
    name: string;
    at: number;
    rect: { x: number; y: number; width: number; height: number };
}

export interface RecordingInfo {
    id: string;
    /** File name inside out/recordings/. */
    file: string;
    durationSec: number;
    width: number;
    height: number;
    fps: number;
    focus: FocusMark[];
    /** Seconds from the start at which the shot clicked. */
    clicks: number[];
}

export interface RecordingsManifest {
    sourceHash: string;
    recordedAt: string;
    shots: RecordingInfo[];
}

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Everything the recorded styleguide is built from: video-lib and the built core and plugins it uses. */
export const SOURCE_PATHS: readonly string[] = [
    'test-workspace/projects/video-lib/src',
    'test-workspace/projects/video-lib/fixtures',
    'test-workspace/video-lib.prism.config.ts',
    'packages/ng-prism/dist',
    'packages/plugin-box-model/dist',
    'packages/plugin-coverage/dist',
    'packages/plugin-jsdoc/dist',
    'packages/plugin-visual-regression/dist'
].map((path) => join(REPO_ROOT, path));

async function files(path: string): Promise<string[]> {
    if (!(await stat(path)).isDirectory()) return [path];
    const entries = await readdir(path, { withFileTypes: true });
    const nested = await Promise.all(
        entries.filter((entry) => entry.name !== 'node_modules' && !entry.name.endsWith('.map')).map((entry) => files(join(path, entry.name)))
    );
    return nested.flat();
}

/** sha256 over the files under `paths` (recursively, without source maps), keyed by their path relative to `root`. */
export async function hashSources(paths: readonly string[], root: string = REPO_ROOT): Promise<string> {
    const all = (await Promise.all(paths.map(files))).flat().sort((a, b) => relative(root, a).localeCompare(relative(root, b)));
    const hash = createHash('sha256');
    for (const file of all) {
        hash.update(relative(root, file));
        hash.update('\0');
        hash.update(await readFile(file));
        hash.update('\0');
    }
    return hash.digest('hex');
}

export function assertFresh(manifest: RecordingsManifest, currentHash: string, requiredIds: readonly string[]): void {
    if (manifest.sourceHash !== currentHash) throw new Error(`Recordings are stale: video-lib changed since ${manifest.recordedAt}`);
    for (const id of requiredIds) {
        if (!manifest.shots.some((shot) => shot.id === id)) throw new Error(`Missing recording: ${id}`);
    }
}
