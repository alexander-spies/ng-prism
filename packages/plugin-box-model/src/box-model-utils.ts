import type { BoxModelData, BoxSides } from './box-model.types.js';

function parseSides(style: CSSStyleDeclaration, props: [string, string, string, string]): BoxSides {
    return {
        top: parseFloat(style.getPropertyValue(props[0])) || 0,
        right: parseFloat(style.getPropertyValue(props[1])) || 0,
        bottom: parseFloat(style.getPropertyValue(props[2])) || 0,
        left: parseFloat(style.getPropertyValue(props[3])) || 0
    };
}

export function getBoxModel(element: Element): BoxModelData {
    const style = window.getComputedStyle(element);

    return {
        element,
        content: element.getBoundingClientRect(),
        padding: parseSides(style, ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']),
        border: parseSides(style, ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width']),
        margin: parseSides(style, ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'])
    };
}

/** One side of the box model as the panel prints it: the figure, "0" included, to two decimals at most. */
export function formatSide(value: number): string {
    return String(Math.round(value * 100) / 100);
}
