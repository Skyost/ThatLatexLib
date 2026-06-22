import { spawnSync } from 'child_process'
import { getFileName } from '../utils/utils.js'
import * as path from 'path'
import * as fs from 'fs'
import { GenerateCommand } from './command.js'

/**
 * `latexmk` command.
 */
export class LatexMkCommand extends GenerateCommand {
  /**
   * Creates a new `LatexMk` instance.
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
    super('latexmk', { printLogs: printLogs })
  }

  /**
   * Calls `latexmk` to compile a LaTeX file and generate a PDF.
   *
   * @param {string} directory Working directory.
   * @param {string} texFile Path to the main LaTeX file.
   * @param {boolean} clean Whether to clean auxiliary files after compilation.
   * @returns {string | null} Path to the generated PDF or `null` on failure.
   */
  override run(directory: string, texFile: string, clean: boolean = true): string | null {
    try {
      // Execute latexmk command to compile the LaTeX file using LuaLaTeX.
      const commandResult = spawnSync(this.commandName, ['-lualatex', texFile], {
        cwd: directory,
        encoding: 'utf8'
      })
      if (commandResult.status !== 0) {
        throw commandResult.error ?? commandResult.stderr ?? new Error(`${this.commandName} exited with status ${commandResult.status}`)
      }
      // Generate the path to the resulting PDF file.
      const result = path.resolve(directory, `${getFileName(texFile)}.pdf`)

      // If cleaning is enabled, remove auxiliary files after successful compilation.
      if (clean) {
        this.clean(directory)
      }

      // Return the path to the generated PDF file.
      return result
    }
    catch (ex) {
      // Handle errors during compilation.
      this.logger?.fatal(ex)

      // Log additional information from the compilation log if available.
      const logFile = path.resolve(directory, `${getFileName(texFile)}.log`)
      if (fs.existsSync(logFile)) {
        const logString = fs.readFileSync(logFile, { encoding: 'utf8' })
        this.logger?.fatal('Here is the log:')
        this.logger?.fatal(logString)
      }

      // Return null to indicate compilation failure.
      return null
    }
  }

  /**
   * Cleans the given directory.
   *
   * @param directory The directory.
   */
  clean(directory: string) {
    const result = spawnSync(this.commandName, ['-quiet', '-c'], {
      cwd: directory,
      encoding: 'utf8'
    })
    if (result.status !== 0) {
      throw result.error ?? result.stderr ?? new Error(`${this.commandName} cleanup exited with status ${result.status}`)
    }
  }
}
