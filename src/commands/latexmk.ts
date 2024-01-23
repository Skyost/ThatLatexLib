import { execSync } from 'child_process'
import { getFileName } from '../utils/utils'
import * as logger from '../utils/logger'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Calls latexmk to compile a LaTeX file and generate a PDF.
 *
 * @param {string} directory Working directory.
 * @param {string} texFile Path to the main LaTeX file.
 * @param {boolean} clean Whether to clean auxiliary files after compilation.
 * @param {boolean} printLogs Whether to print logs.
 * @returns {string | null} Path to the generated PDF or null on failure.
 */
export const latexmk = (directory: string, texFile: string, clean: boolean = true, printLogs: boolean = true): string | null => {
  try {
    // Execute latexmk command to compile the LaTeX file using LuaLaTeX.
    execSync(`latexmk -lualatex "${texFile}"`, { cwd: directory })
    // Generate the path to the resulting PDF file.
    const result = path.resolve(directory, `${getFileName(texFile)}.pdf`)

    // If cleaning is enabled, remove auxiliary files after successful compilation.
    if (clean) {
      execSync('latexmk -quiet -c', { cwd: directory })
    }

    // Return the path to the generated PDF file.
    return result
  } catch (ex) {
    // Handle errors during compilation.
    if (printLogs) {
      logger.fatal('latexmk', ex)
    }

    // Log additional information from the compilation log if available.
    const logFile = path.resolve(directory, `${getFileName(texFile)}.log`)
    if (fs.existsSync(logFile)) {
      const logString = fs.readFileSync(logFile, { encoding: 'utf8' })
      if (printLogs) {
        logger.fatal('latexmk', 'Here is the log:')
        logger.fatal('latexmk', logString)
      }
    }

    // Return null to indicate compilation failure.
    return null
  }
}
