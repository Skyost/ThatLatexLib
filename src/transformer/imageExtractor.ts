import * as path from 'path'
import * as fs from 'fs'
import { consola, ConsolaInstance } from 'consola'
import { SvgGenerator } from '../generators'

/**
 * Allows to extract images from a Latex file.
 */
export abstract class LatexImageExtractor {
  /**
   * The image type to extract (eg. `tikzpicture`).
   */
  imageType: string

  /**
   * The SVG generator instance.
   */
  svgGenerator: SvgGenerator

  /**
   * The logger.
   */
  logger: ConsolaInstance | null

  /**
   * Creates a new `LatexImageExtractor` instance.
   *
   * @param {string} imageType The image type to extract (eg. `tikzpicture`).
   * @param {SvgGenerator} svgGenerator The SVG generator instance.
   * @param printLogs Whether to print logs.
   */
  constructor(
    imageType: string,
    {
      svgGenerator = new SvgGenerator(),
      printLogs = true
    }: {
      svgGenerator?: SvgGenerator
      printLogs?: boolean
    } = {}
  ) {
    this.imageType = imageType
    this.svgGenerator = svgGenerator
    this.logger = printLogs ? consola.withTag('imageExtractor') : null
  }

  /**
   * Extract images from LaTeX content and replace them with HTML-friendly references.
   *
   * @param {string} latexContent The content of the LaTeX file.
   * @param {string} texFilePath The absolute path of the LaTeX file.
   * @returns {string} The modified LaTeX content with HTML-friendly image references.
   */
  extractImages(
    latexContent: string,
    texFilePath: string
  ): string {
    // Clone the original LaTeX content.
    let result = latexContent

    // Regular expression to match the block type content in LaTeX.
    const regex = new RegExp(`\\\\begin{${this.imageType}}([\\s\\S]*?)\\\\end{${this.imageType}}`, 'sg')

    // Initial match.
    let match = regex.exec(result)

    // Counter for naming extracted images.
    let i = 0

    // Process all matches for the current block type.
    while (match) {
      // Destination path for the extracted image LaTeX file.
      const name = this.getExtractedImageFilename(i)
      const extractedImageTexFilePath = path.resolve(
        this.getExtractedImageDirectoryPath(texFilePath, name),
        name
      )

      // Create directories if they don't exist.
      fs.mkdirSync(path.dirname(extractedImageTexFilePath), { recursive: true })

      // Write the template content with the matched block content to the extracted image LaTeX file.
      fs.writeFileSync(
        extractedImageTexFilePath,
        this.renderContent(extractedImageTexFilePath, match[0])
      )

      // Generate SVG from the extracted image LaTeX file.
      const generateResult = this.svgGenerator.generate(
        extractedImageTexFilePath,
        this.getExtractedImageCacheDirectoryPath(texFilePath, extractedImageTexFilePath)
      )

      // If SVG is generated successfully, replace the LaTeX block with an HTML-friendly image reference.
      if (generateResult.builtFilePath) {
        const cachedDebugInfo = generateResult.wasCached ? ' (was cached)' : ''
        this.logger?.success('extractImages', `${this.imageType}[${(i + 1)}] -> ${generateResult.builtFilePath} from ${texFilePath}${cachedDebugInfo}.`)
        // const generatedFile = path.relative(options.assetsRootDirectoryPath, builtFilePath).replace(/\\/g, '/')
        result = result.replace(match[0], `\\includegraphics{file://${generateResult.builtFilePath.replaceAll('\\', '/')}}`)
        fs.rmSync(extractedImageTexFilePath)
      }

      // Move to the next match.
      match = regex.exec(latexContent)

      // Increment the counter.
      i++
    }

    // Log the number of extracted images for the current block type.
    if (i > 0) {
      this.logger?.success('extractImages', `Extracted ${i} images of type ${this.imageType} from ${texFilePath}.`)
    }

    // Return the modified LaTeX content.
    return result
  }

  /**
   * Should return the extracted image directory.
   *
   * @param {string} extractedFrom Where the file comes from.
   * @param {string} extractedFileName The extracted file name.
   * @returns {string} The extracted image directory path.
   */
  getExtractedImageDirectoryPath(extractedFrom: string, extractedFileName: string): string {
    extractedFileName.toString()
    return path.dirname(extractedFrom)
  }

  /**
   * Renders the Latex content into a Latex document.
   */
  abstract renderContent(extractedImageTexFilePath: string, latexContent: string): string

  /**
   * Should return the extracted image filename.
   *
   * @returns {string} The extracted image path.
   */
  getExtractedImageFilename(imageIndex: number): string {
    return `${this.imageType}-${(imageIndex + 1)}.tex`
  }

  /**
   * Should return the extracted image cache directory (where the transformer can find the checksums,
   * the previous build, ...).
   *
   * @param {string} extractedFrom Where the file comes from.
   * @param {string} extractedImageTexFilePath The extracted file path.
   * @returns {string} The extracted image cache directory path.
   */
  getExtractedImageCacheDirectoryPath(
    extractedFrom: string,
    extractedImageTexFilePath: string
  ): string | null {
    extractedFrom.toString()
    extractedImageTexFilePath.toString()
    return null
  }
}

/**
 * Allows to extract all images in the same directory.
 */
export class LatexImageExtractorInDirectory extends LatexImageExtractor {
  /**
   * Path to the extracted images directory.
   */
  directoryPath: string

  /**
   * The content renderer.
   */
  contentRenderer: ContentRenderer

  /**
   * Creates a new `LatexImageExtractor` instance.
   *
   * @param {string} imageType The image type to extract (eg. `tikzpicture`).
   * @param {string} directoryPath The path where to extract images.
   * @param {ContentRenderer} contentRenderer The content renderer.
   * @param svgGenerator The SVG generator instance.
   * @param printLogs Whether to print logs.
   */
  constructor(
    imageType: string,
    directoryPath: string,
    contentRenderer: ContentRenderer,
    {
      svgGenerator = new SvgGenerator(),
      printLogs = true
    }: {
      svgGenerator?: SvgGenerator
      printLogs?: boolean
    } = {}
  ) {
    super(imageType, { svgGenerator, printLogs })
    this.directoryPath = directoryPath
    this.contentRenderer = contentRenderer
  }

  override getExtractedImageDirectoryPath(): string {
    return this.directoryPath
  }

  override renderContent(extractedImageTexFilePath: string, latexContent: string): string {
    return this.contentRenderer(extractedImageTexFilePath, latexContent)
  }
}

/**
 * Renders the Latex content into a Latex document.
 * @param {string} extractedImageTexFilePath The extracted image Latex file path.
 * @param {string} latexContent The Latex content.
 * @returns {string} The rendered content.
 */
export type ContentRenderer = (
  extractedImageTexFilePath: string,
  latexContent: string
) => string
