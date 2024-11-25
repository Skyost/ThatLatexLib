import { GenerateCommand } from './command'
import { spawnSync } from 'child_process'
import path from 'path'

/**
 * `pandoc` command.
 */
export class Pandoc extends GenerateCommand {
  override readonly commandName: string = 'pandoc'

  /**
   * Can contain an additional Pandoc header.
   */
  header: string

  /**
   * Additional arguments to pass to Pandoc.
   */
  additionalArguments: string[]

  constructor(
    header: string = '',
    additionalArguments: string[] = []
  ) {
    super()
    this.header = header
    if (this.header.length > 0) {
      this.header += '\n'
    }
    this.additionalArguments = additionalArguments
  }

  /**
   * Calls `pandoc` to transforms some Latex content into HTML.
   *
   * @param {string} directory Working directory.
   * @param {string} content The content.
   * @param {boolean} printLogs Whether to print logs.
   * @returns {string | null} Transformed content or `null` on failure.
   */
  override run(directory: string, content: string, printLogs: boolean = true): string | null {
    try {
      const pandocResult = spawnSync(
        'pandoc',
        [
          '-f',
          'latex-auto_identifiers',
          '-t',
          'html',
          '--gladtex',
          '--html-q-tags',
          ...this.additionalArguments,
        ],
        {
          env: process.env,
          cwd: directory,
          encoding: 'utf8',
          input: this.header + content
        }
      )

      // Throw an error if the Pandoc transformation fails.
      if (pandocResult.status !== 0) {
        throw pandocResult.stderr
      }
      return pandocResult.stdout
    } catch (ex) {
      // Handle errors during compilation.
      const logger = this.getLogger()
      if (printLogs) {
        logger.fatal(ex)
      }
    }
    return null
  }
}
