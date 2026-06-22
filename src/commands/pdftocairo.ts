import { spawnSync } from 'child_process'
import { getFileName } from '../utils/utils.js'
import * as path from 'path'
import { GenerateCommand } from './command.js'

/**
 * `pdftocairo` command.
 */
export class PdfToCairoCommand extends GenerateCommand {
  /**
   * Creates a new `PdfToCairo` instance.
   *
   * @param {boolean} printLogs Whether to print logs (eg. on error).
   */
  constructor(
    {
      printLogs = true
    }: {
      printLogs?: boolean
    } = {}
  ) {
    super('pdftocairo', { printLogs: printLogs })
  }

  /**
   * Converts a PDF file to an SVG file using `pdftocairo`.
   *
   * @param {string} directory Working directory.
   * @param {string} pdfFile Path to the PDF file.
   * @returns {string} Path to the generated SVG file or `null` on failure.
   */
  override run(directory: string, pdfFile: string): string | null {
    try {
      // Generate the desired SVG file name based on the PDF file name.
      const svgFile = `${getFileName(pdfFile)}.svg`
      // Generate the full path to the SVG file.
      const svgFilePath = path.resolve(directory, svgFile)

      // Always overwrite the SVG: callers invoke this command when the PDF changed.
      const result = spawnSync(this.commandName, ['-svg', pdfFile, svgFile], {
        cwd: directory,
        encoding: 'utf8'
      })
      if (result.status !== 0) {
        throw result.error ?? result.stderr ?? new Error(`${this.commandName} exited with status ${result.status}`)
      }

      // Return the path to the generated SVG file.
      return svgFilePath
    }
    catch (ex) {
      // Handle errors during compilation.
      this.logger?.fatal(ex)

      // Return null to indicate compilation failure.
      return null
    }
  }
}
