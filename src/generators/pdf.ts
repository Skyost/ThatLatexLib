import { getFileName } from '../utils/utils'
import * as path from 'path'
import * as fs from 'fs'
import { LatexMkCommand } from '../commands'
import { LatexGenerator } from './generator'
import { GenerateResult } from './result'

/**
 * The checksums file extension.
 */
const checksumsExtension = '.checksums'

/**
 * Class for the result of PDF generation.
 */
export class PdfGenerateResult extends GenerateResult {
  /**
   * Path to the checksums file or `null` if generation fails.
   */
  checksumsFilePath: string | null

  /**
   * Creates a new `PdfGenerateResult` instance.
   *
   * @param builtFilePath Path to the generated file or `null` if generation fails.
   * @param wasCached Indicates whether the file was retrieved from the cache.
   * @param checksumsFilePath Path to the checksums file or `null` if generation fails.
   */
  constructor(
    {
      builtFilePath = null,
      wasCached = false,
      checksumsFilePath = null
    }: {
      builtFilePath?: string | null
      wasCached?: boolean
      checksumsFilePath?: string | null
    } = {}
  ) {
    super({ builtFilePath, wasCached })
    this.checksumsFilePath = checksumsFilePath
  }
}

/**
 * Class for caching information.
 */
export interface CacheResult {
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
 * Generates a PDF from a Latex file.
 */
export class PdfGenerator extends LatexGenerator {
  /**
   * Generates a PDF from a Latex file.
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
  ): PdfGenerateResult {
    // Extract the file name and directory from the given LaTeX file path.
    const fileName = getFileName(filePath)
    const directory = path.dirname(filePath)

    // Initialize the path to the PDF file.
    let pdfFilePath: string | null = path.resolve(directory, `${fileName}.pdf`)

    // Initialize the path to the checksums file.
    const checksumsFilePath = path.resolve(directory, `${fileName}${checksumsExtension}`)

    // Check if the PDF file exists and generation is not forced.
    if (fs.existsSync(pdfFilePath) && !this.generateIfExists) {
      // If the checksums file does not exist, generate and save checksums.
      if (!fs.existsSync(checksumsFilePath)) {
        fs.writeFileSync(
          checksumsFilePath,
          JSON.stringify(this.checksumsCalculator.calculateFileChecksums(filePath)),
          { encoding: 'utf8' }
        )
      }
      // Return information indicating that the file was retrieved from the cache.
      return new PdfGenerateResult({
        builtFilePath: pdfFilePath,
        wasCached: true,
        checksumsFilePath: checksumsFilePath
      })
    }

    // Retrieve cache information if caching is enabled.
    const cacheResult = cacheDirectoryPath ? this.getCacheInfo(filePath, cacheDirectoryPath, cachedFileName) : null

    // Check if the file and its checksums are fully cached.
    if (cacheResult && cacheResult.isFullyCached) {
      // Ensure the directory structure exists.
      fs.mkdirSync(directory, { recursive: true })
      // Copy the cached PDF and checksums files to the working directory.
      fs.copyFileSync(cacheResult.cachedPdfFilePath, pdfFilePath)
      fs.copyFileSync(cacheResult.cachedChecksumsFilePath, checksumsFilePath)
      // Return information indicating that the file was retrieved from the cache.
      return new PdfGenerateResult({
        builtFilePath: pdfFilePath,
        wasCached: true,
        checksumsFilePath: checksumsFilePath
      })
    }

    // Generate the PDF file using latexmk.
    const latexMk = new LatexMkCommand()
    pdfFilePath = latexMk.run(directory, `${fileName}.tex`, this.clean)

    // If PDF generation is successful, save the checksums and clean auxiliary files.
    if (pdfFilePath) {
      fs.writeFileSync(
        checksumsFilePath,
        cacheResult?.checksums ?? JSON.stringify(this.checksumsCalculator.calculateFileChecksums(filePath)),
        { encoding: 'utf8' }
      )
      latexMk.clean(directory)
    }

    // Return information about the generated PDF file.
    return new PdfGenerateResult({
      builtFilePath: pdfFilePath,
      checksumsFilePath: pdfFilePath == null ? null : checksumsFilePath
    })
  }

  /**
   * Retrieves information from the cache if available.
   *
   * @param {string} texFilePath Path to the main LaTeX file.
   * @param {string} cacheDirectoryPath Directory to find cached generated files.
   * @param {string | null} cachedFileName The cached file name.
   * @returns {CacheResult | null} Cache information or null if not fully cached.
   */
  getCacheInfo = (
    texFilePath: string,
    cacheDirectoryPath: string,
    cachedFileName: string | null = null
  ): CacheResult => {
    // Extract the file name from the given LaTeX file path.
    const fileName = cachedFileName ?? getFileName(texFilePath)

    // Calculate the checksums for the current LaTeX file, including graphics directories.
    const checksums = JSON.stringify(this.checksumsCalculator.calculateFileChecksums(texFilePath))

    // Generate paths to the cached PDF and checksums files.
    const cachedPdfFilePath = path.resolve(cacheDirectoryPath, `${fileName}.pdf`)
    const cachedChecksumsFilePath = path.resolve(cacheDirectoryPath, `${fileName}${checksumsExtension}`)

    // Check if both the cached PDF and checksums files exist, and if the checksums match the expected values.
    const isFullyCached
      = fs.existsSync(cachedPdfFilePath)
      && fs.existsSync(cachedChecksumsFilePath)
      && checksums === fs.readFileSync(cachedChecksumsFilePath, { encoding: 'utf8' })

    // Return the cache information, including the cached file paths and checksums.
    return {
      isFullyCached,
      checksums,
      cachedPdfFilePath,
      cachedChecksumsFilePath
    }
  }
}
