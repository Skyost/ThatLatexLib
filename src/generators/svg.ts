import { getFileName } from '../utils/utils'
import * as path from 'path'
import * as fs from 'fs'
import { LatexGenerator } from './generator'
import { optimize, type PluginConfig } from 'svgo'
import type { XastElement, XastParent, XastRoot } from 'svgo/lib/types'
import { GenerateResult } from './result'
import { LatexChecksumsCalculator } from '../checksums'
import { PdfToCairoCommand } from '../commands'
import { PdfGenerator } from './pdf'

/**
 * Generates a SVG from a Latex file.
 */
export class SvgGenerator extends LatexGenerator {
  /**
   * Whether to compress the SVG.
   */
  optimize: boolean
  /**
   * SVGO plugins to run.
   */
  svgoPlugins: PluginConfig[]
  /**
   * The PDF generator to use.
   */
  pdfGenerator: PdfGenerator

  /**
   * Creates a new `SvgGenerator` instance.
   *
   * @param generateIfExists If true, generate the PDF even if it already exists.
   * @param clean If true, clean auxiliary files after compilation.
   * @param optimize Whether to compress the SVG.
   * @param svgoPlugins SVGO plugins to run.
   * @param checksumsCalculator The Latex checksums calculator.
   * @param pdfGenerator The PDF generator to use.
   */
  constructor(
    {
      generateIfExists = true,
      clean = true,
      checksumsCalculator = new LatexChecksumsCalculator(),
      optimize = true,
      svgoPlugins = [forceUnit],
      pdfGenerator = null
    }: {
      generateIfExists?: boolean
      clean?: boolean
      checksumsCalculator?: LatexChecksumsCalculator
      optimize?: boolean
      svgoPlugins?: PluginConfig[]
      pdfGenerator?: PdfGenerator | null
    } = {}
  ) {
    super({ generateIfExists, clean, checksumsCalculator })
    this.optimize = optimize
    this.svgoPlugins = svgoPlugins
    this.pdfGenerator = pdfGenerator ?? (new PdfGenerator({ generateIfExists, clean, checksumsCalculator }))
  }

  /**
   * Generates a SVG from a Latex file.
   *
   * @param {string} filePath Path to the file.
   * @param {string | null} cacheDirectoryPath Directory to find cached generated files.
   * @param {string | null} cachedFileName The cached file name.
   * @returns {PdfGenerateResult} Result of PDF generation.
   */
  override generate(
    filePath: string,
    cacheDirectoryPath: string | null = null,
    cachedFileName: string | null = null
  ): GenerateResult {
    // Extract the file name and directory from the given LaTeX file path.
    const fileName = getFileName(filePath)
    const directory = path.dirname(filePath)

    // Initialize the path to the SVG file.
    let svgFilePath: string | null = path.resolve(directory, `${fileName}.svg`)

    // Check if the SVG file exists and generation is not forced.
    if (fs.existsSync(svgFilePath) && !this.generateIfExists) {
      // Return information indicating that the file was retrieved from the cache.
      return new GenerateResult({
        builtFilePath: svgFilePath,
        wasCached: true
      })
    }

    // Generate the PDF file, if not cached.
    const pdfGenerateResult = this.pdfGenerator.generate(
      filePath,
      cacheDirectoryPath,
      cachedFileName
    )

    // If PDF generation fails, return information about the failure.
    if (!pdfGenerateResult.builtFilePath) {
      return new GenerateResult()
    }

    // Convert the PDF file to SVG using pdftocairo.
    if (!pdfGenerateResult.wasCached || !fs.existsSync(svgFilePath)) {
      const pdfToCairo = new PdfToCairoCommand()
      svgFilePath = pdfToCairo.run(path.dirname(pdfGenerateResult.builtFilePath), `${fileName}.pdf`)
      if (svgFilePath && this.optimize) {
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
            ...(this.svgoPlugins ?? [])
          ]
        })
        fs.writeFileSync(svgFilePath, optimizedSvgContent)
      }
    }

    // Return information about the generated SVG file.
    return new GenerateResult({
      builtFilePath: svgFilePath,
      wasCached: pdfGenerateResult.wasCached
    })
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
    const size: { [key: string]: string | null } = { width: null, height: null }
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
