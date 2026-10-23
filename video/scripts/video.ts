// Builds every cut in one go: prerequisites, recordings, masters, exports. Each step is one of the other scripts in
// its own process; the first that fails stops the run, after printing its own message.
//
//   node scripts/video.ts [--release 22.7] [--skip-record]
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { REPO_ROOT } from '../src/lib/recordings.ts';

const VIDEO_ROOT = join(REPO_ROOT, 'video');
const { values } = parseArgs({ options: { release: { type: 'string' }, 'skip-record': { type: 'boolean' } } });

const steps: Array<{ label: string; args: string[] }> = [
    { label: 'Prerequisites', args: ['scripts/prereqs.ts'] },
    ...(values['skip-record'] ? [] : [{ label: 'Recordings', args: ['record/record.ts'] }]),
    { label: 'Tour', args: ['scripts/render.ts', 'tour'] },
    { label: 'Tour export', args: ['scripts/export.ts', 'tour'] },
    ...(values.release
        ? [
              { label: `Release ${values.release}`, args: ['scripts/render.ts', 'release', '--version', values.release] },
              { label: `Release ${values.release} export`, args: ['scripts/export.ts', `release-${values.release}`] }
          ]
        : [])
];

for (const step of steps) {
    console.log(`\n▶ ${step.label}`);
    try {
        execFileSync(process.execPath, step.args, { cwd: VIDEO_ROOT, stdio: 'inherit' });
    } catch {
        console.error(`\nStopped at "${step.label}".`);
        process.exit(1);
    }
}
console.log('\nDone: video/out/deliver/ and docs/assets/video/.');
