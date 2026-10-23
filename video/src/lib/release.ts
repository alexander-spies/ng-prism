// A release clip is described per release in releases/<version>.json, not by new scenes. Browser-safe: the release
// scene imports the types.

/**
 * One beat of a release clip. A `ui` beat shows its recording with a caption; an `api` beat types the decorator into
 * `source` on the left and plays the recording on the right. `source` is relative to test-workspace/projects/video-lib/src.
 */
export type ReleaseBeat = { kind: 'ui'; shot: string; caption: string } | { kind: 'api'; shot: string; source: string; caption: string };

export interface ReleaseClip {
    version: string;
    beats: ReleaseBeat[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** Checks a release description; returns it unchanged, or throws with what is wrong. */
export function parseRelease(json: unknown, knownShots: ReadonlySet<string>): ReleaseClip {
    if (!isRecord(json)) throw new Error('A release description is a JSON object');
    if (typeof json.version !== 'string' || !/^\d+\.\d+$/.test(json.version)) throw new Error('Version must look like 22.7');
    if (!Array.isArray(json.beats) || json.beats.length < 1 || json.beats.length > 3) throw new Error('A release clip has 1 to 3 beats');
    json.beats.forEach((beat: unknown, index) => {
        const n = index + 1;
        if (!isRecord(beat)) throw new Error(`Beat ${n} is not an object`);
        if (beat.kind !== 'ui' && beat.kind !== 'api') throw new Error(`Beat ${n} has the unknown kind "${String(beat.kind)}" (ui or api)`);
        if (typeof beat.shot !== 'string' || !knownShots.has(beat.shot)) throw new Error(`Unknown shot "${String(beat.shot)}" in beat ${n}`);
        if (typeof beat.caption !== 'string' || beat.caption.trim() === '') throw new Error(`Beat ${n} needs a caption`);
        if (beat.kind === 'api' && (typeof beat.source !== 'string' || beat.source.trim() === '')) throw new Error(`Beat ${n} (api) needs a source`);
    });
    return json as unknown as ReleaseClip;
}
