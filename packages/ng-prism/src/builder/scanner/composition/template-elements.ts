import { BindingType, CssSelector, TmplAstElement, type TmplAstTemplate } from '@angular/compiler';

/**
 * What a directive matcher sees of an element or an `<ng-template>`, built the way Angular builds it: tag, static
 * attributes and classes, bound inputs and outputs. A template that a structural directive creates (`*libIf`) is an
 * `ng-template` with the attributes of its microsyntax.
 */
export function elementSelector(node: TmplAstElement | TmplAstTemplate): CssSelector {
    const selector = new CssSelector();
    const isElement = node instanceof TmplAstElement;

    selector.setElement(isElement ? localName(node.name) : 'ng-template');
    if (!isElement && node.tagName !== 'ng-template') {
        for (const attribute of node.templateAttrs) selector.addAttribute(attribute.name, '');
        return selector;
    }

    for (const attribute of node.attributes) {
        selector.addAttribute(attribute.name, attribute.value);
        if (attribute.name.toLowerCase() === 'class') {
            for (const className of attribute.value.trim().split(/\s+/)) {
                if (className) selector.addClassName(className);
            }
        }
    }
    for (const bound of node.inputs) {
        if (isInputBinding(bound.type)) selector.addAttribute(bound.name, '');
    }
    for (const output of node.outputs) {
        selector.addAttribute(output.name, '');
    }
    return selector;
}

/** `[name]` and `[(name)]`; attribute, class, style and animation bindings set no input. */
export function isInputBinding(type: BindingType): boolean {
    return type === BindingType.Property || type === BindingType.TwoWay;
}

/** The parser names an element in a namespace `:svg:rect`; selectors match the local name. */
export function localName(name: string): string {
    return name.replace(/^:[^:]+:/, '');
}
