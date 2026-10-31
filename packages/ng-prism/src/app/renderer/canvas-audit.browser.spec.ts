import axe from 'axe-core';
import { runCoreAudit } from '../panels/a11y/a11y-audit.service.js';

jest.mock('axe-core', () => ({
    __esModule: true,
    default: { run: jest.fn() }
}));

const run = axe.run as unknown as jest.Mock;

interface Canvas {
    stage: HTMLElement;
    subject: HTMLElement;
    /** A panel overlay beside the subject in `.demo-wrap`. */
    overlay: HTMLElement;
    /** A canvas tool beside `.demo-wrap` in the stage. */
    rulers: HTMLElement;
}

/** The canvas as the renderer builds it: tools in the stage, the subject and a panel overlay in its `.demo-wrap`. */
function canvas(): Canvas {
    const stage = document.createElement('div');

    stage.className = 'prism-canvas-stage';
    stage.innerHTML =
        '<prism-canvas-rulers id="rulers"></prism-canvas-rulers>' +
        '<div class="demo-wrap"><button id="subject"><span id="label">Go</span></button><prism-a11y-overlay-host id="overlay"></prism-a11y-overlay-host></div>';
    document.body.appendChild(stage);
    const byId = (id: string) => stage.querySelector<HTMLElement>(`#${id}`)!;

    return { stage, subject: byId('subject'), overlay: byId('overlay'), rulers: byId('rulers') };
}

describe('the live audit and the canvas around the subject', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        run.mockReset();
    });

    it('marks the stage while axe runs', async () => {
        const { stage, subject } = canvas();
        let marked: boolean | undefined;

        run.mockImplementation(async () => {
            marked = stage.hasAttribute('data-prism-auditing');
            return {};
        });

        await runCoreAudit(subject);

        expect(marked).toBe(true);
        expect(stage.hasAttribute('data-prism-auditing')).toBe(false);
    });

    it('hides the overlays and tools around the subject while axe runs, and only those', async () => {
        const { subject, overlay, rulers } = canvas();
        let seen: string[] = [];

        run.mockImplementation(async () => {
            seen = [overlay, rulers, subject, subject.querySelector<HTMLElement>('#label')!].map((el) => el.style.visibility);
            return {};
        });

        await runCoreAudit(subject);

        expect(seen).toEqual(['hidden', 'hidden', '', '']);
        expect([overlay.style.visibility, rulers.style.visibility]).toEqual(['', '']);
    });

    it('gives back an inline visibility an overlay had before', async () => {
        const { subject, overlay } = canvas();

        overlay.style.visibility = 'visible';
        run.mockResolvedValue({});

        await runCoreAudit(subject);

        expect(overlay.style.visibility).toBe('visible');
    });

    it('unmarks the stage and shows the overlays again when axe throws', async () => {
        const { stage, subject, overlay } = canvas();

        run.mockRejectedValue(new Error('Axe is already running'));

        await expect(runCoreAudit(subject)).rejects.toThrow('Axe is already running');
        expect(stage.hasAttribute('data-prism-auditing')).toBe(false);
        expect(overlay.style.visibility).toBe('');
    });

    it('runs without a stage', async () => {
        const subject = document.createElement('button');

        document.body.appendChild(subject);
        run.mockResolvedValue({});

        await expect(runCoreAudit(subject)).resolves.toEqual({});
        expect(run).toHaveBeenCalledWith(subject, {});
    });
});
