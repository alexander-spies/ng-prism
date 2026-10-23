// What the exports run: ffmpeg and img2webp arguments, and the fallback ladder of the README loop. Pure, so tested.
import { join } from 'node:path';

/** The README loop's size limit: 8 MB at img2webp q 80 (user decision in the spike, 2026-10-22). */
export const README_LOOP_BUDGET_BYTES = 8_000_000;

export type LoopLength = 'full' | 'short';
export type LoopFps = 60 | 30;

export interface ReadmeAttempt {
    length: LoopLength;
    fps: LoopFps;
}

/** Shorter before worse: when the loop is over budget, the short loop comes first, then fewer frames. */
export const README_LADDER: ReadonlyArray<ReadmeAttempt> = [
    { length: 'full', fps: 60 },
    { length: 'short', fps: 60 },
    { length: 'short', fps: 30 }
];

/** H.264 at crf 18 for the web; ffmpeg ignores the audio options when the master has no audio. */
export function mp4Args(input: string, output: string): string[] {
    return [
        '-v',
        'error',
        '-y',
        '-i',
        input,
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        output
    ];
}

/** VP9 for the docs page. The ProRes master carries alpha, which VP9 would otherwise keep as 4:4:4 with alpha. */
export function webmArgs(input: string, output: string): string[] {
    return ['-v', 'error', '-y', '-i', input, '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', output];
}

/** The last frame as an 8-bit RGB PNG; as-is, the ProRes master's 16-bit RGBA makes a 9 MB poster. */
export function posterArgs(input: string, output: string): string[] {
    return ['-v', 'error', '-y', '-sseof', '-0.05', '-i', input, '-update', '1', '-pix_fmt', 'rgb24', output];
}

/** The master as a PNG sequence at `fps`, full size: `dir/f00001.png` and on. */
export function framesArgs(input: string, dir: string, fps: LoopFps): string[] {
    return ['-v', 'error', '-y', '-i', input, '-vf', `fps=${fps}`, join(dir, 'f%05d.png')];
}

/**
 * Whole-millisecond frame durations for `count` frames at `fps`. Every frame ends at the rounded time it ends in the
 * video, so the rounding never adds up: the total is `round(count * 1000 / fps)`.
 */
export function frameDurationsMs(fps: number, count: number): number[] {
    const end = (frame: number) => Math.round((frame * 1000) / fps);
    return Array.from({ length: count }, (_, frame) => end(frame + 1) - end(frame));
}

/** An endless animated WebP at q 80 (the spike's setting), each frame with its own duration. */
export function img2webpArgs(frames: readonly string[], durationsMs: readonly number[], output: string): string[] {
    return ['-loop', '0', '-lossy', '-q', '80', '-m', '4', ...frames.flatMap((frame, index) => ['-d', String(durationsMs[index]), frame]), '-o', output];
}

/** The first step of the ladder whose result fits the budget, or null when none does. */
export function pickReadmeAttempt(results: ReadonlyArray<ReadmeAttempt & { bytes: number }>, budget: number): ReadmeAttempt | null {
    for (const step of README_LADDER) {
        const result = results.find((candidate) => candidate.length === step.length && candidate.fps === step.fps);
        if (result && result.bytes <= budget) return { ...step };
    }
    return null;
}
