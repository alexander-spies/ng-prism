// What the scenes know about a recording. Browser-safe: Revideo bundles everything a scene imports, so this module
// must not import Node built-ins (recordings.ts holds the Node side).

/** Device pixels per CSS px of every recording: `width` and `height` of a RecordingInfo are this times the viewport. */
export const RECORDING_SCALE = 2;

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
