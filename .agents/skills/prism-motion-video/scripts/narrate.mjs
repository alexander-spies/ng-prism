// Lays a spoken narration over an exported film, with the macOS speech synthesizer and ffmpeg; offline, no API key.
//   node narrate.mjs <film.mp4> <narration.json> <out.mp4> [--voice "Ava (Premium)"] [--tempo 1.04] [--dry]
// narration.json is a list of lines: { "at": start in s, "until": the end of the line's scene in s, "text": "…" }.
// Each line is spoken with `say`, sped up by --tempo (Premium voices ignore `say -r`; atempo keeps the pitch), measured
// against its window and the next line, then placed at its start. The film's own sounds (clicks, keystrokes) duck
// under the voice, the mix is normalised to -16 LUFS, and the picture is copied, not re-encoded. --dry only measures.
// Spell what the voice reads wrongly the way it should sound: "N G prism", "J S Doc".
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const valued = ['--voice', '--tempo'];
const [film, linesFile, out] = args.filter((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1]));
const voice = opt('--voice', 'Ava (Premium)');
const tempo = Number(opt('--tempo', '1.04'));
const dry = args.includes('--dry');
if (!film || !linesFile || (!out && !dry)) {
    console.error('usage: node narrate.mjs <film.mp4> <narration.json> <out.mp4> [--voice "Ava (Premium)"] [--tempo 1.04] [--dry]');
    process.exit(2);
}
const voices = execFileSync('say', ['-v', '?'], { encoding: 'utf8' });
if (!voices.split('\n').some((l) => l.startsWith(voice + ' '))) {
    console.error(`The voice "${voice}" is not installed: System Settings → Accessibility → Spoken Content → System voice → Manage Voices.`);
    process.exit(1);
}
const lines = JSON.parse(readFileSync(linesFile, 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'narrate-'));
const run = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf8' });
const duration = (f) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));

let problems = 0;
lines.forEach((l, i) => {
    const aiff = join(dir, `l${i}.aiff`),
        wav = join(dir, `l${i}.wav`);
    run('say', ['-v', voice, '-o', aiff, l.text]);
    run('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-af', `atempo=${tempo}`, wav]);
    l.wav = wav;
    l.dur = duration(wav);
    const end = l.at + l.dur,
        next = lines[i + 1];
    const notes = [];
    if (next && end > next.at - 0.2) notes.push(`runs into line ${i + 2}`);
    if (l.until !== undefined && end > l.until + 0.6) notes.push(`runs ${(end - l.until).toFixed(2)} s past its scene`);
    if (notes.length) problems++;
    console.log(`line ${i + 1}: ${l.at.toFixed(2)} → ${end.toFixed(2)} s (${l.dur.toFixed(2)} s)${notes.length ? '  ✖ ' + notes.join(', ') : ''}`);
});
if (problems) {
    console.error(`${problems} line(s) do not fit: shorten them, move their start, or raise --tempo a little.`);
    process.exit(1);
}
if (dry) process.exit(0);

const fmt = 'aformat=sample_rates=48000:channel_layouts=stereo';
let graph = `[0:a]${fmt}[fx];`;
lines.forEach((l, i) => {
    const ms = Math.round(l.at * 1000);
    graph += `[${i + 1}:a]${fmt},adelay=${ms}|${ms}[v${i}];`;
});
graph += `${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,asplit=2[vsc][vmix];`;
graph += '[fx][vsc]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=300[duck];';
graph += '[duck][vmix]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]';
run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    film,
    ...lines.flatMap((l) => ['-i', l.wav]),
    '-filter_complex',
    graph,
    '-map',
    '0:v',
    '-c:v',
    'copy',
    '-map',
    '[out]',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(duration(film)),
    '-movflags',
    '+faststart',
    out
]);
console.log(`${out}: ${duration(out).toFixed(2)} s, picture copied, narration in ${voice}`);
