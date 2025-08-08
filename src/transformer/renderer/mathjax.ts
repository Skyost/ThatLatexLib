import type { HTMLElement } from 'node-html-parser'
import { mathjax } from '@mathjax/src/ts/mathjax.js'
import { TeX } from '@mathjax/src/ts/input/tex.js'
import { CHTML } from '@mathjax/src/ts/output/chtml.js'
import { liteAdaptor } from '@mathjax/src/ts/adaptors/liteAdaptor.js'
import { MathRenderer, RenderObject } from './renderer'
import { RegisterHTMLHandler } from '@mathjax/src/ts/handlers/html'
import { MathDocument } from '@mathjax/src/ts/core/MathDocument'
import { LiteElement } from '@mathjax/src/ts/adaptors/lite/Element'
import { LiteText } from '@mathjax/src/ts/adaptors/lite/Text'
import { LiteDocument } from '@mathjax/src/ts/adaptors/lite/Document'
import { DOMAdaptor } from '@mathjax/src/ts/core/DOMAdaptor'
import { InputJax } from '@mathjax/src/ts/core/InputJax'
import { OutputJax } from '@mathjax/src/ts/core/OutputJax'
import TexError from '@mathjax/src/ts/input/tex/TexError'

/**
 * The MathJax math renderer.
 */
export class MathJaxRenderer extends MathRenderer {
  /**
   * The adaptor instance.
   */
  adaptor: DOMAdaptor<LiteElement, LiteText, LiteDocument>

  /**
   * The input jax input instance.
   */
  inputJax: InputJax<LiteElement, LiteText, LiteDocument>

  /**
   * The output jax output instance.
   */
  outputJax: OutputJax<LiteElement, LiteText, LiteDocument>

  /**
   * The math document instance.
   */
  doc: MathDocument<LiteElement, LiteText, LiteDocument>

  /**
   * The size of an em in pixels.
   */
  em: number

  /**
   * The size of an ex in pixels.
   */
  ex: number

  /**
   * Creates a new MathJax math renderer instance.
   *
   * @param em The size of an em in pixels.
   * @param ex The size of an ex in pixels.
   * @param inputJax The input jax to use in MathJax.
   * @param outputJax The output jax to use in MathJax.
   */
  constructor(
    {
      em = 16,
      ex = 8,
      inputJax,
      outputJax
    }: {
      em?: number
      ex?: number
      inputJax?: InputJax<LiteElement, LiteText, LiteDocument>
      outputJax?: OutputJax<LiteElement, LiteText, LiteDocument>
    } = {}
  ) {
    super()

    this.adaptor = liteAdaptor({ fontSize: em }) as DOMAdaptor<LiteElement, LiteText, LiteDocument>
    RegisterHTMLHandler(this.adaptor)

    this.inputJax = inputJax ?? new TeX<LiteElement, LiteText, LiteDocument>({
      packages: ['base', 'ams', 'color', 'newcommand'],
      formatError: (jax: TeX<LiteElement, LiteText, LiteDocument>, error: TexError) => {
        console.error(error.message)
        jax.formatError(error)
      }
    })
    this.outputJax = outputJax ?? new CHTML<LiteElement, LiteText, LiteDocument>({
      fontURL: 'https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font/chtml/woff2'
    })

    this.doc = mathjax.document('', {
      InputJax: this.inputJax,
      OutputJax: this.outputJax
    })

    this.em = em
    this.ex = ex
  }

  override async renderMathElement(element: HTMLElement): Promise<RenderObject> {
    const math = this.filterUnknownSymbols(element.text.trim())
    const node = await this.doc.convertPromise(math, {
      display: element.getAttribute('env') === 'displaymath',
      em: this.em,
      ex: this.ex
    }) as LiteElement

    return {
      html: this.adaptor.outerHTML(node),
      css: this.adaptor.cssText(this.outputJax.styleSheet(this.doc))
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
