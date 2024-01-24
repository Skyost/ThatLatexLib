// noinspection ES6PreferShortImport

import { spawnSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as logger from './utils/logger'
import { generateSvg } from './generator'
import { HTMLElement, parse } from 'node-html-parser'
import { pdftocairo } from './commands/pdftocairo'
import { getFileName } from './utils/utils'
import katex from 'katex'

/**
 * Allows to configure the transformer.
 */
export interface TransformOptions {
  /**
   * Should contain an additional Pandoc header.
   */
  pandocHeader?: string,
  /**
   * Should return the extracted image cache directory (where the transformer can find the checksums,
   * the previous build, ...).
   *
   * @param {string} extractedFrom Where the file comes from.
   * @param {string} extractedImageTexFilePath The extracted file path.
   * @returns {string} The extracted image cache directory.
   */
  getExtractedImageCacheDirectory?: (extractedFrom: string, extractedImageTexFilePath: string) => string,
  /**
   * Returns the given extracted image target directory.
   * It will be a subdirectory of the assets directory (see `assetsRootDirectoryPath` below).
   *
   * @param {string} extractedFrom Where the file comes from.
   * @param {string} assetName The asset name.
   * @returns {string} The asset destination path.
   */
  getExtractedImageTargetDirectory?: (extractedFrom: string, assetName: string) => string,
  /**
   * Returns the `includegraphics` directories.
   *
   * @param {string} texFilePath The Latex file path.
   * @returns {string[]} The `includegraphics` directories.
   */
  getIncludeGraphicsDirectories?: (texFilePath: string) => string[],
  /**
   * The images template. Should contain two macros :
   * {graphicspath} for the `includegraphics` directories and {extractedContent} for the extracted image content.
   */
  imagesTemplate?: {[key: string]: string},
  /**
   * The assets root directory path (where to find images from a given src attribute).
   */
  assetsRootDirectoryPath?: string,
  /**
   * Returns the cache directory of a resolved image.
   *
   * @param {string} resolvedImageTexFilePath The resolved image.
   */
  getResolvedImageCacheDirectory?: (resolvedImageTexFilePath: string) => string,
  /**
   * Converts an image path to a src attribute.
   *
   * @param {string} resolvedImageFilePath The resolved image path.
   * @returns {string} The src attribute.
   */
  imagePathToSrc?: (resolvedImageFilePath: string) => string,
  /**
   * The function that allows to render math elements.
   *
   * @param {string} element The math element.
   * @returns {string} The rendered math content.
   */
  renderMathElement?: (element: HTMLElement) => string,
  /**
   * Passed to `generateSvg` and `generatedPdf`.
   */
  generateIfExists?: boolean,
  /**
   * Arguments to pass to Pandoc.
   */
  pandocArguments?: string
}

/**
 * Transforms a Latex file to HTML.
 *
 * @param {string} texFilePath Path to the main LaTeX file.
 * @param {TransformOptions} options The transform options.
 * @param {boolean} printLogs Whether to print logs.
 * @param {string} texFileContent The Latex file content.
 * @return {HTMLElement} The parsed HTML content.
 */
export const transformToHtml = (
  texFilePath: string,
  options: TransformOptions = {},
  printLogs: boolean = true,
  texFileContent?: string
): HTMLElement => {
  // Read the tex content.
  const rawContent = texFileContent ?? fs.readFileSync(texFilePath, { encoding: 'utf8' })

  // Extract images from the .tex file content and return the modified content.
  const content = options?.imagesTemplate && options?.getExtractedImageTargetDirectory ?
    extractImages(
      rawContent,
      texFilePath,
      options,
      printLogs
    ) : rawContent

  // Run Pandoc to convert the .tex content to HTML.
  let header = (options.pandocHeader ?? '')
  if (header.length > 0) {
    header += '\n'
  }

  const pandocResult = spawnSync(
    'pandoc',
    [
      '-f',
      'latex-auto_identifiers',
      '-t',
      'html',
      '--gladtex',
      '--html-q-tags',
      ...(options.pandocArguments ?? [])
    ],
    {
      env: process.env,
      cwd: path.resolve(path.dirname(texFilePath)),
      encoding: 'utf8',
      input: header + content
    }
  )

  // Throw an error if the Pandoc transformation fails.
  if (pandocResult.status !== 0) {
    throw pandocResult.stderr
  }

  // Parse the Pandoc HTML output.
  const root = parse(pandocResult.stdout)

  // Replace images in the HTML content.
  replaceImages(
    root,
    texFilePath,
    options,
    printLogs
  )

  // Render math.
  renderMath(root, options)

  return root
}

/**
 * Render all math elements.
 *
 * @param {HTMLElement} root The root elements.
 * @param {TransformOptions} options The transform options.
 */
const renderMath = (root: HTMLElement, options: TransformOptions) => {
  const mathElements = root.querySelectorAll('eq')
  for (const mathElement of mathElements) {
    // Replace the math element with the rendered KaTeX HTML.
    mathElement.replaceWith((options?.renderMathElement ?? renderMathElement)(mathElement))
  }
}

/**
 * Allows to render a given math element.
 *
 * @param {HTMLElement} element The element.
 * @param {[key: string]: string} macros The macros.
 * @param {(math: string) => string} filterUnknownSymbols Allows to filter unknown symbols.
 * @returns {string} The rendered element.
 */
export const renderMathElement = (
  element: HTMLElement,
  macros?: {[key: string]: string},
  filterUnknownSymbols?: (math: string) => string
): string => {
  const math = element.text.trim()
  return katex.renderToString(filterUnknownSymbols?.call(this, math) ?? math, {
    displayMode: element.getAttribute('env') === 'displaymath', // Determine if it's a display math environment.
    output: 'html',
    trust: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strict: (errorCode: any) => errorCode === 'htmlExtension' ? 'ignore' : 'warn',
    macros
  })
}

/**
 * Extract images from LaTeX content and replace them with HTML-friendly references.
 *
 * @param {string} latexContent The content of the LaTeX file.
 * @param {string} texFilePath The absolute path of the LaTeX file.
 * @param {TransformOptions} options Transform options.
 * @param {boolean} printLogs Whether to print logs.
 * @returns {string} The modified LaTeX content with HTML-friendly image references.
 */
const extractImages = (
  latexContent: string,
  texFilePath: string,
  options: TransformOptions,
  printLogs: boolean
): string => {
  // Clone the original LaTeX content.
  let result = latexContent

  // Process each block type specified in the pictures template.
  for (const blockType of Object.keys(options.imagesTemplate)) {
    // Regular expression to match the block type content in LaTeX.
    const regex = new RegExp(`\\\\begin{${blockType}}([\\s\\S]*?)\\\\end{${blockType}}`, 'sg')

    // Initial match.
    let match = regex.exec(result)

    // Counter for naming extracted images.
    let i = 0

    // Process all matches for the current block type.
    while (match) {
      // Generate a unique filename for the extracted image.
      const fileName = `${blockType}-${(i + 1)}.tex`

      // Destination path for the extracted image LaTeX file.
      const extractedImageTexFilePath = path.resolve(options.assetsRootDirectoryPath, options.getExtractedImageTargetDirectory(texFilePath, fileName), fileName)

      // Read the template for the current block type.
      const template = options.imagesTemplate[blockType]

      // Create directories if they don't exist.
      fs.mkdirSync(path.dirname(extractedImageTexFilePath), { recursive: true })

      // Write the template content with the matched block content to the extracted image LaTeX file.
      const includeGraphicsDirectories: string[] = options.getIncludeGraphicsDirectories?.call(this, extractedImageTexFilePath) ?? []
      fs.writeFileSync(
        extractedImageTexFilePath,
        template
          .replace('{graphicspath}', '\\graphicspath{' + includeGraphicsDirectories
            .map(directory => `{${directory.replaceAll('\\', '\\\\')}}`)
            .join('\n') + '}'
          )
          .replace('{extractedContent}', match[0])
      )

      // Generate SVG from the extracted image LaTeX file.
      const { builtFilePath, wasCached } = generateSvg(
        extractedImageTexFilePath,
        {
          includeGraphicsDirectories,
          cacheDirectory: options.getExtractedImageCacheDirectory?.call(this, texFilePath, extractedImageTexFilePath),
          optimize: true,
          generateIfExists: options.generateIfExists
        }
      )

      // If SVG is generated successfully, replace the LaTeX block with an HTML-friendly image reference.
      if (builtFilePath) {
        const cachedDebugInfo = wasCached ? ' (was cached)' : ''
        if (printLogs) {
          logger.success('extractImages', `${blockType}[${(i + 1)}] -> ${builtFilePath} from ${texFilePath}${cachedDebugInfo}.`)
        }
        const generatedFile = path.relative(options.assetsRootDirectoryPath, builtFilePath).replace(/\\/g, '/')
        result = result.replace(match[0], `\\includegraphics{${generatedFile}}`)
        fs.rmSync(extractedImageTexFilePath)
      }

      // Move to the next match.
      match = regex.exec(latexContent)

      // Increment the counter.
      i++
    }

    // Log the number of extracted images for the current block type.
    if (i > 0 && printLogs) {
      logger.success('extractImages', `Extracted ${i} images of type ${blockType} from ${texFilePath}.`)
    }
  }

  // Return the modified LaTeX content.
  return result
}

/**
 * Replace LaTeX image references in the HTML tree with resolved image sources.
 *
 * @param {HTMLElement} root - The root of the HTML tree.
 * @param {string} texFilePath - The path of the LaTeX file from the content directory.
 * @param {TransformOptions} options - The transformer options.
 * @param {boolean} printLogs - Whether to print logs.
 */
const replaceImages = (
  root: HTMLElement,
  texFilePath: string,
  options: TransformOptions,
  printLogs: boolean
) => {
  // Possible image file extensions.
  const extensions = ['', '.svg', '.tex', '.pdf', '.png', '.jpeg', '.jpg', '.gif']

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

    // Directories to search for the image.
    const directories = ['', ...(options.getIncludeGraphicsDirectories?.call(this, texFilePath) ?? [path.dirname(texFilePath)])]

    // Try resolving the image from various directories and extensions.
    for (const directory of directories) {
      let resolved = false

      // Try different file extensions.
      for (const extension of extensions) {
        // Get the destination path of the image in the assets directory.
        const filePath = path.resolve(options.assetsRootDirectoryPath, directory, src + extension)

        // Check if the file exists.
        if (fs.existsSync(filePath)) {
          // Resolve the image source.
          const resolvedSrc = resolveImageSrc(filePath, directories, options)

          // Format the resolved source as an absolute path.
          if (resolvedSrc) {
            // Update the image source and alt attribute.
            image.setAttribute('src', resolvedSrc)
            image.setAttribute('alt', getFileName(src))

            resolved = true
            if (printLogs) {
              logger.success('replaceImages', `Resolved image ${src} to ${resolvedSrc} in ${texFilePath}.`)
            }
            break
          }
        }
      }

      // Break the outer loop if the image is resolved.
      if (resolved) {
        break
      }
    }
  }
}

/**
 * Resolve the source of an image file.
 *
 * @param {string} imagePath The path to the image file.
 * @param {string[]} includeGraphicsDirectories Directories for including graphics.
 * @param {TransformOptions} options The transformer options.
 * @returns {string | null} The resolved source of the image or null if not resolved.
 */
const resolveImageSrc = (
  imagePath: string,
  includeGraphicsDirectories: string[],
  options: TransformOptions
): string | null => {
  const extension = path.extname(imagePath)
  // Check if the image has a PDF extension.
  if (extension === '.tex') {
    // Generate an SVG from the PDF.
    const { builtFilePath } = generateSvg(
      imagePath,
      {
        includeGraphicsDirectories,
        cacheDirectory: options.getResolvedImageCacheDirectory?.call(this, imagePath),
        optimize: true,
        generateIfExists: options.generateIfExists
      }
    )

    // If the PDF couldn't be converted to SVG, return null.
    if (!builtFilePath) {
      return null
    }

    // Update the image path to the generated SVG.
    imagePath = builtFilePath
  } else if (extension === '.pdf') {
    imagePath = pdftocairo(path.dirname(imagePath), path.basename(imagePath))
  }

  // Return the relative path from the assets destination directory.
  return options.imagePathToSrc == null ? '/' + path.relative(path.dirname(options.assetsRootDirectoryPath), imagePath).replace(/\\/g, '/') : options.imagePathToSrc(imagePath)
}
