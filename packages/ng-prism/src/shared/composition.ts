/**
 * Where the subject element of a composition takes the attributes and bindings ng-prism gives it: the end of its start
 * tag, in `CompositionCase.template`. Snippets replace it with the current values, the generated wrapper with the
 * bindings. A private-use character, so that it cannot occur in the markup an author wrote. Since 22.7.0.
 */
export const COMPOSITION_SUBJECT_SLOT = '\uE000';

/** Attribute the generated wrapper puts on the subject element, which is how the styleguide finds it in the rendered composition. Since 22.7.0. */
export const COMPOSITION_SUBJECT_ATTR = 'data-prism-subject';

/**
 * Attribute an author puts on the one of several elements matching the subject's selector that is the subject. It is
 * removed from the generated template and from snippets. Since 22.7.0.
 */
export const SUBJECT_MARKER_ATTR = 'prism-subject';

/** The input a composition wrapper declares to switch between its cases: the index of the variant, which the wrapper maps onto a case. Since 22.7.0. */
export const PRISM_VARIANT_INPUT = '__prismVariant__';
