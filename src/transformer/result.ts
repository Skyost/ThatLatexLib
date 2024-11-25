import { HTMLElement } from 'node-html-parser'
import { ImageSrcResolverResult } from './transformer'

/**
 * The return result of the transformer.
 */
export class TransformResult {
  /**
   * The parsed HTML result of the transformation.
   */
  htmlResult: HTMLElement

  /**
   * The replaced images.
   */
  replacedImages: ImageSrcResolverResult[]

  constructor(
    htmlResult: HTMLElement,
    replacedImages: ImageSrcResolverResult[] = []
  ) {
    this.htmlResult = htmlResult
    this.replacedImages = replacedImages
  }
}
