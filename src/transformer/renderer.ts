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
   * @returns {string} The rendered math content.
   */
  override renderMathElement(element: HTMLElement): string {
    const math = this.filterUnknownSymbols(element.text.trim())
    return katex.renderToString(
      math,
      {
        displayMode: element.getAttribute('env') === 'displaymath', // Determine if it's a display math environment.
        output: 'html',
        trust: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strict: (errorCode: any) => errorCode === 'htmlExtension' ? 'ignore' : 'warn',
        macros: this.getMacros()
      }
    )
  }

  /**
   * Allows to remove unknown symbols.
   *
   * @param {string} math The math content.
   * @return {string} The filtered math content.
   */
  filterUnknownSymbols(math: string): string {
    return math
  }

  /**
   * The macros to pass to the KaTeX parser.
   *
   * @return The macros.
   */
  // eslint-disable-next-line
  getMacros(): any {
    return undefined
  }
}
