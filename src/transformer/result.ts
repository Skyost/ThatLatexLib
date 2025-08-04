import type { HTMLElement } from 'node-html-parser'
import type { ImageSrcResolverResult } from './transformer'

/**
 * The return result of the transformer.
 */
export class TransformResult {
  /**
   * The parsed HTML result of the transformation. `null` if failed.
   */
  htmlResult: HTMLElement | null

  /**
   * The replaced images.
   */
  replacedImages: ImageSrcResolverResult[]

  /**
   * The math CSS content.
   */
  mathCss: string[]

  constructor(
    {
      htmlResult = null,
      replacedImages = [],
      mathCss = []
    }: {
      htmlResult?: HTMLElement | null
      replacedImages?: ImageSrcResolverResult[]
      mathCss?: string[]
    } = {}
  ) {
    this.htmlResult = htmlResult
    this.replacedImages = replacedImages
    this.mathCss = mathCss
  }
}
