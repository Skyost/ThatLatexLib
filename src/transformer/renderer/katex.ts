import type { HTMLElement } from 'node-html-parser'
import katex from 'katex'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { MathRenderer, type RenderObject } from './renderer'

/**
 * The KaTeX math renderer.
 */
export class KatexRenderer extends MathRenderer {
  /**
   * The KaTeX CSS.
   */
  katexCss: string

  /**
   * The macros to use in the Katex parser.
   */
  // eslint-disable-next-line
  macros: any

  /**
   * Creates a new KaTeX math renderer instance.
   *
   * @param macros The macros to use in the Katex parser.
   */
  constructor(
    {
      macros
    }: {
      // eslint-disable-next-line
      macros?: any
    } = {}
  ) {
    super()

    const require = createRequire(import.meta.url)
    const cssPath = require.resolve('katex/dist/katex.min.css')
    this.katexCss = readFileSync(cssPath, { encoding: 'utf8' })
    this.macros = macros
  }

  /**
   * The function that allows to render math elements.
   *
   * @param {string} element The math element.
   * @returns {Promise<RenderObject>} The rendered math content.
   */
  override async renderMathElement(element: HTMLElement): Promise<RenderObject> {
    const math = this.filterUnknownSymbols(element.text.trim())
    return {
      html: katex.renderToString(
        math,
        {
          displayMode: element.getAttribute('env') === 'displaymath', // Determine if it's a display math environment.
          output: 'html',
          trust: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          strict: (errorCode: any) => errorCode === 'htmlExtension' ? 'ignore' : 'warn',
          macros: this.macros
        }
      ),
      css: this.katexCss
    }
  }

  /**
   * Allows removing unknown symbols.
   *
   * @param {string} math The math content.
   * @returns {string} The filtered math content.
   */
  filterUnknownSymbols(math: string): string {
    return math
  }
}
