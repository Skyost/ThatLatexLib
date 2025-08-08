import type { HTMLElement } from 'node-html-parser'

/**
 * Returned by the `renderMathElement` of `MathRenderer`.
 */
export interface RenderObject {
  /**
   * The HTML content.
   */
  html: string
  /**
   * The CSS content.
   */
  css: string
}

/**
 * Allows to render math elements.
 */
export abstract class MathRenderer {
  /**
   * The function that allows to render math elements.
   *
   * @param {string} element The math element.
   * @returns {string} The rendered math content.
   */
  abstract renderMathElement(element: HTMLElement): Promise<RenderObject> | RenderObject
}
