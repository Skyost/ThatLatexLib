import * as path from 'path'
import * as fs from 'fs'
import { parse, HTMLElement } from 'node-html-parser'
import { KatexRenderer, MathRenderer } from './renderer'
import { TransformResult } from './result'
import { LatexImageExtractor, LatexImageExtractorInDirectory } from './imageExtractor'
import { getFileName } from '../utils/utils'
import { PandocCommand, PdfToCairoCommand } from '../commands'
import { SvgGenerator } from '../generators'

/**
 * Allows to transform a Latex file into HTML thanks to Pandoc.
 */
export class PandocTransformer {
  /**
   * The image `src` attribute resolver.
   */
  imageSrcResolver: ImageSrcResolver | null

  /**
   * The image extractors to use.
   */
  imageExtractors: LatexImageExtractor[]

  /**
   * The math renderer.
   */
  mathRenderer: MathRenderer

  /**
   * The Pandoc command.
   */
  pandoc: PandocCommand

  /**
   * Creates a new `PandocTransformer` instance.
   *
   * @param imageSrcResolver The image `src` attribute resolver.
   * @param imageExtractors The Latex image extractors.
   * @param mathRenderer The math renderer.
   * @param pandoc The Pandoc command.
   */
  constructor(
    {
      imageSrcResolver = null,
      imageExtractors = [],
      mathRenderer = new KatexRenderer(),
      pandoc = new PandocCommand()
    }: {
      imageSrcResolver?: ImageSrcResolver | null
      imageExtractors?: LatexImageExtractor[]
      mathRenderer?: MathRenderer
      pandoc?: PandocCommand
    } = {}
  ) {
    this.imageSrcResolver = imageSrcResolver
    this.imageExtractors = imageExtractors
    this.mathRenderer = mathRenderer
    this.pandoc = pandoc
  }

  /**
   * Transforms a Latex file to HTML.
   *
   * @param {string} texFilePath Path to the main LaTeX file.
   * @param {string} texFileContent The Latex file content.
   * @return {TransformResult} The transformation result.
   */
  transform(
    texFilePath: string,
    texFileContent?: string
  ): TransformResult {
    // Read the tex content.
    let content = texFileContent ?? fs.readFileSync(texFilePath, { encoding: 'utf8' })

    // Extract images from the .tex file content and return the modified content.
    for (const imageExtractor of this.imageExtractors) {
      content = imageExtractor.extractImages(content, texFilePath)
    }

    // Parse the content using Pandoc.
    const pandocResult = this.pandoc.run(path.resolve(path.dirname(texFilePath)), content)
    if (!pandocResult) {
      return new TransformResult()
    }

    // Parse the Pandoc HTML output.
    const root = parse(pandocResult)

    // Replace images in the HTML content.
    const replacedImages = this.replaceImages(root, texFilePath)

    // Render math.
    this.renderMath(root)

    return new TransformResult({
      htmlResult: root,
      replacedImages
    })
  }

  /**
   * Replace LaTeX image references in the HTML tree with resolved image sources.
   *
   * @param {HTMLElement} root The root of the HTML tree.
   * @param {string} texFilePath The path of the LaTeX file from the content directory.
   * @returns {ImageSrcResolverResult[]} The replaced images.
   */
  replaceImages(
    root: HTMLElement,
    texFilePath: string
  ): ImageSrcResolverResult[] {
    // Contains the result.
    const result: ImageSrcResolverResult[] = []

    // Select all image elements in the HTML tree.
    const images = root.querySelectorAll('img')

    // Process each image element.
    for (const image of images) {
      // Get the source attribute of the image.
      const src = image.getAttribute('src')

      // Skip if the source attribute is missing.
      if (!src) {
        continue
      }

      const resolveResult = this.imageSrcResolver?.call(this, this, texFilePath, src)
      if (resolveResult) {
        // Update the image source and alt attribute.
        image.setAttribute('src', resolveResult.resolvedSrc)
        image.setAttribute('alt', getFileName(src))
        result.push(resolveResult)
      }
    }
    return result
  }

  /**
   * Render all math elements.
   *
   * @param {HTMLElement} root The root elements.
   */
  renderMath(root: HTMLElement) {
    const mathElements = root.querySelectorAll('eq')
    for (const mathElement of mathElements) {
      // Replace the math element with the rendered KaTeX HTML.
      mathElement.replaceWith(this.mathRenderer.renderMathElement(mathElement))
    }
  }

  /**
   * Allows to resolve an image `src` attribute from an assets root directory.
   *
   * @param {string} assetsRootDirectoryPath  The assets root directory path.
   * @param subdirectories Subdirectories to check for assets.
   * @param getImageCacheDirectoryPath Allows to return the image cache directory from a given image path.
   * @param imagePathToSrc Converts an image path to a `src` attribute.
   */
  static resolveFromAssetsRoot(
    assetsRootDirectoryPath: string,
    {
      subdirectories = [],
      getImageCacheDirectoryPath = null,
      imagePathToSrc = null
    }: {
      subdirectories?: string[]
      getImageCacheDirectoryPath?: ((imagePath: string) => string) | null
      imagePathToSrc?: ((imagePath: string) => string) | null
    } = {}
  ): ImageSrcResolver {
    return (pandocTransformer: PandocTransformer, texFilePath: string, src: string): ImageSrcResolverResult | null => {
      const svgGenerator = pandocTransformer.imageExtractors[0]?.svgGenerator ?? new SvgGenerator()
      if (src.startsWith('file://')) {
        const filePath = path.resolve(src.substring('file://'.length))
        const result = PandocTransformer.transformToImageIfNeeded(
          filePath,
          svgGenerator,
          assetsRootDirectoryPath,
          getImageCacheDirectoryPath,
          imagePathToSrc
        )
        if (result) {
          return result
        }
      }

      // Possible image file extensions.
      const extensions = ['', '.svg', '.tex', '.pdf', '.png', '.jpeg', '.jpg', '.gif']

      // Directories to search for the image.
      const directories = [
        '',
        path.dirname(texFilePath),
        ...subdirectories
      ]

      for (const imageExtractor of pandocTransformer.imageExtractors) {
        if (imageExtractor instanceof LatexImageExtractorInDirectory) {
          directories.push(imageExtractor.directoryPath)
        }
      }

      // Try resolving the image from various directories and extensions.
      for (const directory of directories) {
        // Try different file extensions.
        for (const extension of extensions) {
          // Get the destination path of the image in the assets directory.
          const filePath = path.resolve(assetsRootDirectoryPath, directory, src + extension)

          // Check if the file exists.
          if (fs.existsSync(filePath)) {
            const result = PandocTransformer.transformToImageIfNeeded(
              filePath,
              svgGenerator,
              assetsRootDirectoryPath,
              getImageCacheDirectoryPath,
              imagePathToSrc
            )
            if (result) {
              return result
            }
          }
        }
      }
      return null
    }
  }

  /**
   * Transforms the given file to an image, if needed.
   *
   * @param {string} filePath The file path.
   * @param {SvgGenerator} svgGenerator The SVG generator.
   * @param {string} assetsRootDirectoryPath  The assets root directory path.
   * @param {((imagePath: string) => string) | null} getImageCacheDirectoryPath Allows to return the image cache directory from a given image path.
   * @param {((imagePath: string) => string) | null} imagePathToSrc Converts an image path to a `src` attribute.
   */
  private static transformToImageIfNeeded(
    filePath: string,
    svgGenerator: SvgGenerator,
    assetsRootDirectoryPath: string,
    getImageCacheDirectoryPath: ((imagePath: string) => string) | null = null,
    imagePathToSrc: ((imagePath: string) => string) | null = null
  ): ImageSrcResolverResult | null {
    // Resolve the image source.
    let imagePath = filePath
    const extension = path.extname(imagePath)
    if (extension === '.tex') {
      // Generate an SVG from the PDF.
      const { builtFilePath } = svgGenerator.generate(
        imagePath,
        getImageCacheDirectoryPath?.call(this, imagePath)
      )

      // If the PDF couldn't be converted to SVG, return null.
      if (!builtFilePath) {
        return null
      }

      // Update the image path to the generated SVG.
      imagePath = builtFilePath
    }
    else if (extension === '.pdf') {
      const pdfToCairo = new PdfToCairoCommand()
      const result = pdfToCairo.run(path.dirname(imagePath), path.basename(imagePath))
      if (!result) {
        return null
      }
      imagePath = result
    }

    // Return the relative path from the assets destination directory.
    return {
      resolvedSrc: imagePathToSrc?.call(imagePath) ?? '/' + path.relative(path.dirname(assetsRootDirectoryPath), imagePath).replace(/\\/g, '/'),
      resolvedToFilePath: imagePath
    }
  }
}

/**
 * Allows to resolve an image `src` attribute.
 */
export type ImageSrcResolver = (pandocTransformer: PandocTransformer, texFilePath: string, src: string) => ImageSrcResolverResult | null

/**
 * Returned by an image source resolver.
 */
export interface ImageSrcResolverResult {
  /**
   * The resolved `src` attribute.
   */
  resolvedSrc: string
  /**
   * To which file the source has been resolved.
   */
  resolvedToFilePath: string
}
