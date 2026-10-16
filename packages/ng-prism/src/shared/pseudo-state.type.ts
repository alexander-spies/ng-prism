/**
 * A user-action pseudo-class a variant can force on.
 *
 * Limited to the states a script cannot hold. `:hover` and `:active` follow
 * the pointer, and only one element in the document can be focused, which the
 * first click into the shell takes away again. A state an input can set
 * (`:checked`, `:disabled`) belongs in `Variant.inputs`.
 */
export type PseudoState = 'hover' | 'active' | 'focus' | 'focus-visible' | 'focus-within';

/** Every value {@link PseudoState} accepts, in the order the tools menu lists them. */
export const PSEUDO_STATES: readonly PseudoState[] = ['hover', 'active', 'focus', 'focus-visible', 'focus-within'] as const;

/**
 * Where a forced state applies.
 *
 * `true` puts it on every element of the rendered component, the host
 * included. A selector, or a list of them, limits it to the matching elements,
 * resolved against the host and everything inside it.
 */
export type PseudoTarget = true | string | readonly string[];

/** The pseudo states a variant forces, each with the elements it applies to. */
export type ForcedPseudoStates = Partial<Record<PseudoState, PseudoTarget>>;
