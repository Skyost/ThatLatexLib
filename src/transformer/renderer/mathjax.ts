import type { HTMLElement } from 'node-html-parser'
import { mathjax } from '@mathjax/src/mjs/mathjax.js'
import { CHTML } from '@mathjax/src/mjs/output/chtml.js'
import { TeX } from '@mathjax/src/mjs/input/tex.js'
import { liteAdaptor } from '@mathjax/src/mjs/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from '@mathjax/src/mjs/handlers/html.js'
import { MathDocument } from '@mathjax/src/mjs/core/MathDocument.js'
import { LiteElement } from '@mathjax/src/mjs/adaptors/lite/Element.js'
import { LiteText } from '@mathjax/src/mjs/adaptors/lite/Text.js'
import { LiteDocument } from '@mathjax/src/mjs/adaptors/lite/Document.js'
import { DOMAdaptor } from '@mathjax/src/mjs/core/DOMAdaptor.js'
import { InputJax } from '@mathjax/src/mjs/core/InputJax.js'
import { OutputJax } from '@mathjax/src/mjs/core/OutputJax.js'
import { MathRenderer, RenderObject } from './renderer'

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
      formatError: (jax: TeX<LiteElement, LiteText, LiteDocument>, error) => {
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
