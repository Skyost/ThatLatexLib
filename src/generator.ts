import { getFileName } from './utils/utils'
import * as path from 'path'
import * as fs from 'fs'
import { calculateTexFileChecksums, checksumsExtension } from './checksums'
import { latexmk } from './commands/latexmk'
import { execSync } from 'child_process'
import { pdftocairo } from './commands/pdftocairo'
import { optimize, PluginConfig } from 'svgo'
import { XastElement, XastParent, XastRoot } from 'svgo/lib/types'

/**
 * Interface for options when generating a PDF or a SVG.
 */
export interface GenerateOptions {
  /**
   * If true, generate the PDF even if it already exists.
   */
  generateIfExists?: boolean
  /**
   * Directory to find cached generated files.
   */
  cacheDirectory?: string
  /**
   * The cached file name.
   */
  cachedFileName?: string
  /**
   * If true, clean auxiliary files after compilation.
   */
  clean?: boolean
  /**
   * Directories to search for graphics files.
   */
  includeGraphicsDirectories?: string[]
}

/**
 * Options for generating SVGs.
 */
export interface SvgGenerateOptions extends GenerateOptions {
  /**
   * Whether to compress the SVG.
   */
  optimize?: boolean
  /**
   * SVGO plugins to run.
   */
  svgoPlugins?: PluginConfig[]
}

/**
 * Interface for the result of a file generation operation.
 */
export interface GenerateResult {
  /**
   * Path to the generated file or null if generation fails.
   */
  builtFilePath: string | null
  /**
   * Indicates whether the file was retrieved from the cache.
   */
  wasCached: boolean
}

/**
 * Interface for the result of PDF generation.
 */
export interface PdfGenerateResult extends GenerateResult {
  /**
   * Path to the checksums file or null if generation fails.
   */
  checksumsFilePath: string | null
}

/**
 * Interface for caching information.
 */
interface CacheResult {
  /**
   * Indicates whether the file and its checksums are fully cached.
   */
  isFullyCached: boolean
  /**
   * Checksums of the file and its dependencies.
   */
  checksums: string
  /**
   * Path to the cached PDF file.
   */
  cachedPdfFilePath: string
  /**
   * Path to the cached checksums file.
   */
  cachedChecksumsFilePath: string
}

/**
 * Generates a PDF file from a LaTeX source file.
 *
 * @param {string} texFilePath Path to the main LaTeX file.
 * @param {GenerateOptions} options Generation options.
 * @returns {PdfGenerateResult} Result of PDF generation.
 */
export const generatePdf = (
  texFilePath: string,
  options: GenerateOptions = {
    generateIfExists: true
  }
): PdfGenerateResult => {
  // Extract the file name and directory from the given LaTeX file path.
  const fileName = getFileName(texFilePath)
  const directory = path.dirname(texFilePath)

  // Initialize the path to the PDF file.
  let pdfFilePath: string | null = path.resolve(directory, `${fileName}.pdf`)

  // Initialize the path to the checksums file.
  const checksumsFilePath = path.resolve(directory, `${fileName}${checksumsExtension}`)

  // Check if the PDF file exists and generation is not forced.
  if (fs.existsSync(pdfFilePath) && options?.generateIfExists) {
    // If the checksums file does not exist, generate and save checksums.
    if (!fs.existsSync(checksumsFilePath)) {
      fs.writeFileSync(
        checksumsFilePath,
        JSON.stringify(calculateTexFileChecksums(texFilePath, options.includeGraphicsDirectories)),
        { encoding: 'utf8' }
      )
    }
    // Return information indicating that the file was retrieved from the cache.
    return { builtFilePath: pdfFilePath, checksumsFilePath, wasCached: true }
  }

  // Retrieve cache information if caching is enabled.
  const cacheResult = options.cacheDirectory ? getCacheInfo(texFilePath, options) : null

  // Check if the file and its checksums are fully cached.
  if (cacheResult && cacheResult.isFullyCached) {
    // Ensure the directory structure exists.
    fs.mkdirSync(directory, { recursive: true })
    // Copy the cached PDF and checksums files to the working directory.
    fs.copyFileSync(cacheResult.cachedPdfFilePath, pdfFilePath)
    fs.copyFileSync(cacheResult.cachedChecksumsFilePath, checksumsFilePath)
    // Return information indicating that the file was retrieved from the cache.
    return { builtFilePath: pdfFilePath, checksumsFilePath, wasCached: true }
  }

  // Generate the PDF file using latexmk.
  pdfFilePath = latexmk(directory, `${fileName}.tex`, options.clean ?? true)

  // If PDF generation is successful, save the checksums and clean auxiliary files.
  if (pdfFilePath) {
    fs.writeFileSync(
      checksumsFilePath,
      cacheResult?.checksums ?? JSON.stringify(calculateTexFileChecksums(texFilePath, options.includeGraphicsDirectories)),
      { encoding: 'utf8' }
    )
    execSync('latexmk -quiet -c', { cwd: directory })
  }

  // Return information about the generated PDF file.
  return { builtFilePath: pdfFilePath, checksumsFilePath: pdfFilePath == null ? null : checksumsFilePath, wasCached: false }
}

/**
 * Generates an SVG file from a LaTeX source file.
 *
 * @param {string} texFilePath Path to the main LaTeX file.
 * @param {GenerateOptions} options Generation options.
 * @returns {GenerateResult} Result of SVG generation.
 */
export const generateSvg = (
  texFilePath: string,
  options: SvgGenerateOptions = {
    generateIfExists: true,
    optimize: true,
    svgoPlugins: [forceUnit]
  }
): GenerateResult => {
  // Extract the file name and directory from the given LaTeX file path.
  const fileName = getFileName(texFilePath)
  const directory = path.dirname(texFilePath)

  // Initialize the path to the SVG file.
  let svgFilePath = path.resolve(directory, `${fileName}.svg`)

  // Check if the SVG file exists and generation is not forced.
  if (fs.existsSync(svgFilePath) && !options?.generateIfExists) {
    // Return information indicating that the file was retrieved from the cache.
    return { builtFilePath: svgFilePath, wasCached: true }
  }

  // Generate the PDF file, if not cached.
  const pdfGenerateResult = generatePdf(texFilePath, options)

  // If PDF generation fails, return information about the failure.
  if (!pdfGenerateResult.builtFilePath) {
    return { builtFilePath: null, wasCached: false }
  }

  // Convert the PDF file to SVG using pdftocairo.
  if (!pdfGenerateResult.wasCached || !fs.existsSync(svgFilePath)) {
    svgFilePath = pdftocairo(path.dirname(pdfGenerateResult.builtFilePath), `${fileName}.pdf`)
    if (svgFilePath && options.optimize) {
      const svgContent = fs.readFileSync(svgFilePath, { encoding: 'utf8' })
      const size = fs.statSync(svgFilePath).size
      const { data: optimizedSvgContent } = optimize(svgContent, {
        path: svgFilePath,
        multipass: true,
        floatPrecision: size >= 100000 ? 2 : 5,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: false
              }
            }
          },
          ...(options.svgoPlugins ?? [])
        ]
      })
      fs.writeFileSync(svgFilePath, optimizedSvgContent)
    }
  }

  // Return information about the generated SVG file.
  return { builtFilePath: svgFilePath, wasCached: pdfGenerateResult.wasCached }
}

/**
 * Retrieves information from the cache if available.
 *
 * @param {string} texFilePath Path to the main LaTeX file.
 * @param {GenerateOptions} options The generate options.
 * @returns {CacheResult | null} Cache information or null if not fully cached.
 */
const getCacheInfo = (texFilePath: string, options: GenerateOptions): CacheResult => {
  // Extract the file name from the given LaTeX file path.
  const fileName = options.cachedFileName ?? getFileName(texFilePath)

  // Calculate the checksums for the current LaTeX file, including graphics directories.
  const checksums = JSON.stringify(calculateTexFileChecksums(texFilePath, options.includeGraphicsDirectories))

  // Generate paths to the cached PDF and checksums files.
  const cachedPdfFilePath = path.resolve(options.cacheDirectory!, `${fileName}.pdf`)
  const cachedChecksumsFilePath = path.resolve(options.cacheDirectory!, `${fileName}${checksumsExtension}`)

  // Check if both the cached PDF and checksums files exist, and if the checksums match the expected values.
  const isFullyCached =
    fs.existsSync(cachedPdfFilePath) &&
    fs.existsSync(cachedChecksumsFilePath) &&
    checksums === fs.readFileSync(cachedChecksumsFilePath, { encoding: 'utf8' })

  // Return the cache information, including the cached file paths and checksums.
  return {
    isFullyCached,
    checksums,
    cachedPdfFilePath,
    cachedChecksumsFilePath
  }
}

/**
 * An SVGO plugin that allows to force a given unit on width and height attributes of SVGs.
 */
const forceUnit: PluginConfig = {
  name: 'forceUnit',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (_root: XastRoot, params: any) => {
    const requiredUnit = params?.unit ?? 'pt'
    const size: { [key: string]: string | null } = {width: null, height: null}
    return {
      element: {
        enter: (node: XastElement, parentNode: XastParent) => {
          if (node.name === 'svg' && parentNode.type === 'root') {
            const viewBox = node.attributes.viewBox
            if (viewBox) {
              const parts = viewBox.split(' ')
              node.attributes.width = parts[2] + requiredUnit
              node.attributes.height = parts[3] + requiredUnit
              return
            }
            const attributes = ['width', 'height']
            for (const attribute of attributes) {
              let value = node.attributes[attribute]
              if (!value || value.endsWith(requiredUnit)) {
                continue
              }
              const unitRegex = /[0-9]+\.?[0-9]*(px|pt|cm|mm|in|em|ex|pc)?/g
              const number = value.replace(unitRegex, match => parseFloat(match).toString())
              size[attribute] = number
              value = number + requiredUnit
              node.attributes[attribute] = value
            }
          }
        }
      }
    }
  }
}
