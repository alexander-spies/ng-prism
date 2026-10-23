import { TestBed } from '@angular/core/testing';
import { COMPOSITION_SUBJECT_ATTR } from '../../shared/composition.js';
import { PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { PrismRendererService } from './prism-renderer.service.js';

describe('PrismRendererService.subjectElement', () => {
    let renderer: PrismRendererService;

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [{ provide: PRISM_MANIFEST, useValue: { components: [] } }]
        });
        renderer = TestBed.inject(PrismRendererService);
    });

    it('finds the subject element under the rendered root', () => {
        const root = document.createElement('div');
        const subject = document.createElement('span');

        subject.setAttribute(COMPOSITION_SUBJECT_ATTR, '');
        root.append(document.createElement('label'), subject);
        renderer.renderedElement.set(root);

        expect(renderer.subjectElement()).toBe(subject);
    });

    it('is the rendered root itself when no element carries the marker', () => {
        const root = document.createElement('div');

        root.append(document.createElement('span'));
        renderer.renderedElement.set(root);

        expect(renderer.subjectElement()).toBe(root);
    });

    it('is the rendered root when the root carries the marker, before any element under it', () => {
        const root = document.createElement('div');
        const inner = document.createElement('span');

        root.setAttribute(COMPOSITION_SUBJECT_ATTR, '');
        inner.setAttribute(COMPOSITION_SUBJECT_ATTR, '');
        root.append(inner);
        renderer.renderedElement.set(root);

        expect(renderer.subjectElement()).toBe(root);
    });

    it('is null while nothing is rendered', () => {
        expect(renderer.subjectElement()).toBeNull();
    });
});
