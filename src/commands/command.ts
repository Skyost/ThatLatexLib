import { consola, ConsolaInstance } from 'consola'

/**
 * A command for generating a file from another.
 */
export abstract class GenerateCommand {
  /**
   * The command name.
   */
  commandName: string

  /**
   * The logger.
   */
  logger: ConsolaInstance | null

  /**
   * Creates a new `Command` instance.
   *
   * @param {string} commandName The command name.
   * @param {boolean} printLogs Whether to print logs (eg. on error).
   */
  constructor(
    commandName: string,
    {
      printLogs = true
    }: {
      printLogs?: boolean
    } = {}
  ) {
    this.commandName = commandName
    if (printLogs) {
      this.logger = consola.withTag(commandName)
    }
  }

  /**
   * Calls the command on a file and returns the generated file.
   *
   * @param {string} directory Working directory.
   * @param {string} argument String argument to use for the command.
   * @returns {string | null} Path to the generated file or null on failure.
   */
  abstract run(directory: string, argument: string): string | null
}
