import type { View2D } from '@revideo/2d';
import { all, easeInOutCubic, spawn, type ThreadGenerator } from '@revideo/core';
import { STATUS } from '../../brand.ts';
import { Caption } from '../../components/Caption.tsx';
import { CodeCard } from '../../components/CodeCard.tsx';
import { FileTree } from '../../components/FileTree.tsx';
import { until } from './timing.ts';

export const TREE = ['button/', 'button.component.ts', 'button.component.html', 'button.component.css', 'button.stories.ts'];
const STORIES = 'button.stories.ts';

/** 0:00–0:09: a component with its stories file, the stories file goes, the camera moves into the component. */
export function* treeSegment(view: View2D, card: CodeCard): ThreadGenerator {
    const tree = new FileTree({ entries: TREE, fontSize: 40, opacity: 0 });
    view.add(tree);
    const storiesFile = new Caption({ text: 'Every component gets **a stories file.**' });
    const noStories = new Caption({ text: 'What if it **didn’t need one?**' });
    view.add(storiesFile);
    view.add(noStories);

    yield* tree.opacity(1, 0.6);
    yield* storiesFile.show();
    yield* until(2.2);
    yield* tree.highlight(STORIES, STATUS.warn, 0.5);
    yield* until(4.6);
    yield* storiesFile.hide();
    yield* until(5.0);
    yield* all(tree.strike(STORIES, 0.6), noStories.show());
    yield* tree.drop(STORIES, 0.7);
    yield* until(7.6);
    // Into button.component.ts: the tree grows towards it and gives way to the file's code.
    spawn(function* () {
        yield* until(8.2);
        yield* noStories.hide();
    });
    const target = tree.entryPosition('button.component.ts');
    card.opacity(0);
    view.add(card);
    yield* all(
        tree.scale(2.4, 1.6, easeInOutCubic),
        tree.position(target.scale(-2.4), 1.6, easeInOutCubic),
        tree.opacity(0, 1.6, easeInOutCubic),
        (function* () {
            yield* until(8.7);
            yield* card.opacity(1, 0.6, easeInOutCubic);
        })()
    );
    tree.remove();
    storiesFile.remove();
    noStories.remove();
}

/** 0:09–0:20: @Showcase types itself onto the component, then stays highlighted long enough to read. */
export function* codeSegment(view: View2D, card: CodeCard, codeAfter: string, showcaseLines: number): ThreadGenerator {
    const caption = new Caption({ text: 'Annotate the **component itself.**' });
    view.add(caption);
    yield* until(9.5);
    spawn(caption.show());
    yield* until(10.6);
    yield* card.typeTo(codeAfter, 6);
    yield* card.highlightLines(0, showcaseLines - 1, 0.5);
    yield* until(19.3);
    yield* caption.hide();
    caption.remove();
}
