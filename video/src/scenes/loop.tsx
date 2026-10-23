import { Code, makeScene2D } from '@revideo/2d';
import { all, easeInOutCubic, waitFor } from '@revideo/core';
import { BrandBackground } from '../components/BrandBackground.tsx';
import { CodeCard } from '../components/CodeCard.tsx';
import { ensureFonts } from '../components/fonts.ts';
import { tsHighlighter } from '../components/highlighter.ts';
import type { RecordingInfo } from '../lib/recording-info.ts';
import { cutVariables } from './cut-variables.ts';
import { codeSegment, revealPlan } from './tour/act1.tsx';
import { recordingBeat } from './tour/beat.tsx';
import { crossfade } from './tour/timing.ts';

Code.defaultHighlighter = tsHighlighter;

/** How much of the styleguide the short loop shows: its still opening and the start of the pointer's move. */
const SHORT_REVEAL = 3.5;

/**
 * The silent README loop, built from the tour's pieces: @Showcase types itself onto the component, the styleguide
 * appears (`full` with the tour's camera, `short` without), and the code comes back without the decorator. The first
 * and the last frame are the same card, so the loop has no seam.
 */
export default makeScene2D('loop', function* (view) {
    yield* ensureFonts();
    const { length, codeBefore, codeAfter, showcaseLines, recordings } = cutVariables<{
        length: 'full' | 'short';
        codeBefore: string;
        codeAfter: string;
        showcaseLines: number;
        recordings: Record<string, RecordingInfo>;
    }>();
    const codeCard = () => new CodeCard({ code: codeBefore, file: 'button.component.ts', fontSize: 22, y: -40 });
    view.add(<BrandBackground />);
    const first = codeCard();
    view.add(first);
    yield view.toPromise();

    yield* codeSegment(view, first, codeAfter, showcaseLines);
    const plan = revealPlan(recordings['reveal']);
    const reveal = recordingBeat(view, first, length === 'full' ? plan : { ...plan, camera: [], seconds: SHORT_REVEAL });
    yield* all(first.scale(0.6, 0.6, easeInOutCubic), reveal.run());

    // Back to where the loop starts: the same card, the same code, no caption.
    const last = codeCard();
    last.opacity(0);
    view.add(last);
    yield* crossfade(reveal.recording, last, 0.6);
    yield* waitFor(0.1);
});
