import { GenerateCommand } from './command'
import { spawnSync } from 'child_process'

/**
 * `pandoc` command.
 */
export class PandocCommand extends GenerateCommand {
  /**
   * Can contain an additional Pandoc header.
   */
  header: string

  /**
   * Additional arguments to pass to Pandoc.
   */
  additionalArguments: string[]

  /**
   * Creates a new `Pandoc` instance.
   *
   * @param {string} header Can contain an additional Pandoc header.
   * @param additionalArguments Additional arguments to pass to Pandoc.
   * @param printLogs Whether to print logs (eg. on error).
   */
  constructor(
    {
      header = '',
      additionalArguments = [],
      printLogs = true
    }: {
      header?: string
      additionalArguments?: string[]
      printLogs?: boolean
    } = {}
  ) {
    super('pandoc', { printLogs: printLogs })
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
   * @returns {string | null} Transformed content or `null` on failure.
   */
  override run(directory: string, content: string): string | null {
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
          ...this.additionalArguments
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
    }
    catch (ex) {
      // Handle errors during compilation.
      this.logger?.fatal(ex)
    }
    return null
  }
}
