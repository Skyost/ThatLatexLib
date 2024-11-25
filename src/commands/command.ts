import { consola } from 'consola'

/**
 * A command for generating a file from another.
 */
export abstract class GenerateCommand {
  /**
   * The command name.
   */
  abstract readonly commandName: string

  /**
   * The logger instance.
   */
  protected getLogger = () => consola.withTag(this.commandName)

  /**
   * Calls the command on a file and returns the generated file.
   *
   * @param {string} directory Working directory.
   * @param {string} argument String argument to use for the command.
   * @returns {string | null} Path to the generated file or null on failure.
   */
  abstract run (directory: string, argument: string): string | null
}
