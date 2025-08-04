import type { HTMLElement } from 'node-html-parser'
import katex from 'katex'
import { mathjax } from '@mathjax/src/ts/mathjax.js'
import { TeX } from '@mathjax/src/ts/input/tex.js'
import { CHTML } from '@mathjax/src/ts/output/chtml.js'
import { liteAdaptor } from '@mathjax/src/ts/adaptors/liteAdaptor.js'
import '@mathjax/src/js/util/asyncLoad/esm.js'
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js'
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js'
import '@mathjax/src/js/input/tex/noundefined/NoundefinedConfiguration.js'
import { LiteAdaptor } from '@mathjax/src/ts/adaptors/liteAdaptor'

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

/**
 * Returned by the `renderMathElement` of `MathRenderer`.
 */
class RenderObject {
  /**
   * The HTML content.
   */
  html: string
  /**
   * The CSS content.
   */
  css: string

  /**
   * Creates a new render object instance.
   *
   * @param {string} html The HTML content.
   * @param {string} css The CSS content.
   */
  constructor(
    html: string,
    css: string
  ) {
    this.html = html
    this.css = css
  }
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
  override renderMathElement(element: HTMLElement): RenderObject {
    const math = this.filterUnknownSymbols(element.text.trim())
    return new RenderObject(
      katex.renderToString(
        math,
        {
          displayMode: element.getAttribute('env') === 'displaymath', // Determine if it's a display math environment.
          output: 'html',
          trust: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          strict: (errorCode: any) => errorCode === 'htmlExtension' ? 'ignore' : 'warn',
          macros: this.getMacros()
        }
      ),
      '@import url(\'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css\')'
    )
  }

  /**
   * Allows to remove unknown symbols.
   *
   * @param {string} math The math content.
   * @returns {string} The filtered math content.
   */
  filterUnknownSymbols(math: string): string {
    return math
  }

  /**
   * The macros to pass to the KaTeX parser.
   *
   * @returns The macros.
   */
  // eslint-disable-next-line
  getMacros(): any {
    return undefined
  }
}

/**
 * The MathJax math renderer.
 */
export class MathJaxRenderer extends MathRenderer {
  /**
   * The adaptor instance.
   */
  adaptor: LiteAdaptor
  /**
   * The TeX input instance.
   */
  // @ts-expect-error We cannot deduce the type parameters.
  tex: TeX
  /**
   * The CHTML output instance.
   */
  // @ts-expect-error We cannot deduce the type parameters.
  chtml: CHTML

  /**
   * Creates a new MathJax math renderer instance.
   */
  constructor() {
    super()

    this.adaptor = liteAdaptor()
    // RegisterHTMLHandler(this.adaptor)

    this.tex = new TeX({
      packages: ['base', 'ams', 'newcommand', 'noundefined'],
      formatError(jax, err) {
        console.error(err.message)
      }
    })
    this.chtml = new CHTML({
      fontURL: 'https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font/chtml/woff2'
    })
  }

  override async renderMathElement(element: HTMLElement): Promise<RenderObject> {
    const html = mathjax.document('', {
      InputJax: this.tex,
      OutputJax: this.chtml
    })

    await this.chtml.font.loadDynamicFiles()
    const node = html.convert(element.text.trim(), {
      display: element.getAttribute('env') === 'displaymath'
    })

    return new RenderObject(
      this.adaptor.outerHTML(node),
      this.adaptor.cssText(this.chtml.styleSheet(html))
    )
  }
}
