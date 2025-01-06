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

  constructor(
    {
      htmlResult = null,
      replacedImages = []
    }: {
      htmlResult?: HTMLElement | null
      replacedImages?: ImageSrcResolverResult[]
    } = {}
  ) {
    this.htmlResult = htmlResult
    this.replacedImages = replacedImages
  }
}
