import { makeProject } from '@revideo/core';
import '../global.css';
import loop from '../scenes/loop.tsx';

export default makeProject({
    scenes: [loop],
    variables: { length: 'full', codeBefore: '', codeAfter: '', showcaseLines: 0, recordings: {} },
    settings: {
        shared: { size: { x: 1920, y: 1080 }, background: '#080d19' },
        rendering: { fps: 60 }
    }
});
