import type { HTMLElement } from 'node-html-parser'
import katex from 'katex'

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
  abstract renderMathElement(element: HTMLElement): string
}

/**
 * The KaTeX math renderer.
 */
export class KatexRenderer extends MathRenderer {
  /**
   * The function that allows to render math elements.
   *
   * @param {string} element The math element.
   * @param {[key: string]: string} macros The macros.
   * @returns {string} The rendered math content.
   */
  override renderMathElement(
    element: HTMLElement,
    macros?: { [key: string]: string }
  ): string {
    const math = element.text.trim()
    return katex.renderToString(math, {
      displayMode: element.getAttribute('env') === 'displaymath', // Determine if it's a display math environment.
      output: 'html',
      trust: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strict: (errorCode: any) => errorCode === 'htmlExtension' ? 'ignore' : 'warn',
      macros
    })
  }
}
