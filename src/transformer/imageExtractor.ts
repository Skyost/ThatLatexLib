import * as path from 'path'
import * as fs from 'fs'
import { consola, ConsolaInstance } from 'consola'
import { SvgGenerator } from '../generators'

/**
 * Allows to extract images from a Latex file.
 */
export class LatexImageExtractor {
  /**
   * The image type to extract (eg. `tikzpicture`).
   */
  imageType: string

  /**
   * Path to the extracted images directory.
   */
  directoryPath: string

  /**
   * The content renderer to use.
   */
  contentRenderer: ContentRenderer

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
   * @param {string} directoryPath The path where to extract images.
   * @param {ContentRenderer} contentRenderer The content renderer.
   * @param {SvgGenerator} svgGenerator The SVG generator instance.
   * @param {boolean} printLogs Whether to print logs.
   */
  constructor(
    imageType: string,
    directoryPath: string,
    contentRenderer: ContentRenderer,
    svgGenerator: SvgGenerator = new SvgGenerator(),
    printLogs: boolean = true,
  ) {
    this.imageType = imageType;
    this.directoryPath = directoryPath;
    this.contentRenderer = contentRenderer;
    this.svgGenerator = svgGenerator;
    this.logger = printLogs ? consola.withTag('imageExtractor') : null;
  }

  /**
   * Extract images from LaTeX content and replace them with HTML-friendly references.
   *
   * @param {string} latexContent The content of the LaTeX file.
   * @param {string} texFilePath The absolute path of the LaTeX file.
   * @returns {string} The modified LaTeX content with HTML-friendly image references.
   */
  extractImages = (
    latexContent: string,
    texFilePath: string,
  ): string => {
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
      const extractedImageTexFilePath = path.resolve(
        this.directoryPath,
        this.getExtractedImageFilename(i)
      )

      // Create directories if they don't exist.
      fs.mkdirSync(path.dirname(extractedImageTexFilePath), {recursive: true})

      // Write the template content with the matched block content to the extracted image LaTeX file.
      const includeGraphicsDirectories: string[] = this.getIncludeGraphicsDirectories(extractedImageTexFilePath)
      fs.writeFileSync(extractedImageTexFilePath, this.contentRenderer(match[0], includeGraphicsDirectories))

      // Generate SVG from the extracted image LaTeX file.
      const generateResult = this.svgGenerator.generate(
        extractedImageTexFilePath,
        this.getExtractedImageCacheDirectoryPath(texFilePath, extractedImageTexFilePath),
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
   * Returns the `includegraphics` directories.
   *
   * @param {string} texFilePath The Latex file path.
   * @returns {string[]} The `includegraphics` directories.
   */
  getIncludeGraphicsDirectories(texFilePath: string): string[] {
    return []
  }

  /**
   * Should return the extracted image cache directory (where the transformer can find the checksums,
   * the previous build, ...).
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
   * @returns {string} The extracted image cache directory.
   */
  getExtractedImageCacheDirectoryPath(
    extractedFrom: string,
    extractedImageTexFilePath: string
  ): string | null {
    return null;
  }
}

/**
 * Renders the Latex content into a Latex document.
 * @param {string} latexContent The Latex content.
 * @param {string[]} includeGraphicsDirectories Directories for including graphics.
 * @returns {string} The rendered content.
 */
export type ContentRenderer = (
  latexContent: string,
  includeGraphicsDirectories: string[]
) => string
