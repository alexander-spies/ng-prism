// Renders one cut to a ProRes master in out/masters/.
//
//   node scripts/render.ts <sandbox|tour|readme-loop|release> [--length full|short] [--version 22.7]
import { existsSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { REPO_ROOT, type RecordingInfo, type RecordingsManifest } from '../src/lib/recordings.ts';

export type Cut = 'sandbox' | 'tour' | 'readme-loop' | 'release';
export interface CutOptions {
    length?: 'full' | 'short';
    version?: string;
}

const VIDEO_ROOT = join(REPO_ROOT, 'video');
export const MASTERS_DIR = join(VIDEO_ROOT, 'out/masters');
const MANIFEST = join(VIDEO_ROOT, 'out/recordings/manifest.json');

/**
 * Revideo looks up media for its ffmpeg side at `<outDir>/../public/<src>`, so with outDir out/masters the public
 * directory is out/public; it is Vite's publicDir too. Scenes refer to `/recordings/<file>`.
 */
const PUBLIC_DIR = join(VIDEO_ROOT, 'out/public');
const PUBLIC_LINKS: Record<string, string> = { recordings: '../recordings' };

function preparePublicDir(): void {
    mkdirSync(PUBLIC_DIR, { recursive: true });
    for (const [name, target] of Object.entries(PUBLIC_LINKS)) {
        const link = join(PUBLIC_DIR, name);
        if (!existsSync(link)) symlinkSync(target, link);
    }
}

function readManifest(): RecordingsManifest {
    if (!existsSync(MANIFEST)) throw new Error('No recordings yet: run `npm run record` first');
    return JSON.parse(readFileSync(MANIFEST, 'utf8')) as RecordingsManifest;
}

function byId(manifest: RecordingsManifest): Record<string, RecordingInfo> {
    return Object.fromEntries(manifest.shots.map((shot) => [shot.id, shot]));
}

/** Everything a cut's scenes read from `useScene().variables`. They replace the project defaults, so it is complete. */
export async function variablesFor(cut: Cut, _options: CutOptions = {}): Promise<Record<string, unknown>> {
    switch (cut) {
        case 'sandbox':
            return { recordings: byId(readManifest()) };
        default:
            throw new Error(`No variables for the cut "${cut}" yet`);
    }
}

/** Renders `src/projects/<cut>.ts` to `out/masters/<outFile>` (a .mov ProRes master) and returns its path. */
export async function render(cut: Cut, variables: Record<string, unknown>, outFile: string): Promise<string> {
    // Before the renderer is loaded: Revideo reads it when it starts (exactly the string 'true').
    process.env.DISABLE_TELEMETRY = 'true';
    const { renderVideo } = await import('@revideo/renderer');
    process.chdir(VIDEO_ROOT);
    preparePublicDir();
    const run = () =>
        renderVideo({
            projectFile: `./src/projects/${cut}.ts`,
            variables,
            settings: {
                outFile: outFile as `${string}.mov`,
                outDir: './out/masters',
                logProgress: false,
                projectSettings: { exporter: { name: '@revideo/core/ffmpeg', options: { format: 'proRes' } } },
                viteConfig: {
                    publicDir: 'out/public',
                    server: { fs: { allow: ['..'] } },
                    optimizeDeps: {
                        include: [
                            '@revideo/core',
                            '@revideo/2d',
                            '@revideo/2d/lib/jsx-dev-runtime',
                            '@revideo/renderer/lib/client/render',
                            '@lezer/javascript',
                            '@lezer/highlight',
                            '@codemirror/language'
                        ]
                    }
                }
            }
        });
    try {
        return await run();
    } catch (error) {
        // Revideo #353: when Vite optimises dependencies on the first load it reloads the page under Puppeteer. The
        // second run finds them optimised.
        if (!String(error).includes('Navigating frame was detached')) throw error;
        return await run();
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { positionals, values } = parseArgs({ allowPositionals: true, options: { length: { type: 'string' }, version: { type: 'string' } } });
    const cut = positionals[0] as Cut;
    const options: CutOptions = { length: values.length as CutOptions['length'], version: values.version };
    const name = cut === 'release' ? `release-${options.version}` : cut === 'readme-loop' ? `readme-loop-${options.length ?? 'full'}` : cut;
    const file = await render(cut, await variablesFor(cut, options), `${name}.mov`);
    console.log(file);
    process.exit(0);
}
