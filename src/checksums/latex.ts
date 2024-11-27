import * as path from 'path'
import { getFileName } from '../utils/utils'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { Checksums } from './checksums'
import { ChecksumsCalculator } from './calculator'

/**
 * Interface defining a LaTeX inclusion command configuration.
 */
export class LatexIncludeCommand {
  /**
   * LaTeX command for inclusion.
   */
  command: string
  /**
   * Directories to search for files related to this command.
   */
  directories: string[]
  /**
   * Possible file extensions for this command.
   */
  extensions: string[]
  /**
   * File names to exclude for this command.
   */
  excludes: string[]
  /**
   * Indicates whether the command involves nested includes.
   */
  hasIncludes: boolean
  /**
   * Indicates whether the target of the command is a directory.
   */
  targetIsDirectory: boolean

  /**
   * Creates a new `LatexIncludeCommand` instance.
   *
   * @param {string} command LaTeX command for inclusion.
   * @param directories Directories to search for files related to this command.
   * @param extensions Possible file extensions for this command.
   * @param excludes File names to exclude for this command.
   * @param hasIncludes Indicates whether the command involves nested includes.
   * @param targetIsDirectory Indicates whether the target of the command is a directory.
   */
  constructor(
    command: string,
    {
      directories = [],
      extensions = ['.tex'],
      excludes = [],
      hasIncludes = true,
      targetIsDirectory = false
    }: {
      command?: string
      directories?: string[]
      extensions?: string[]
      excludes?: string[]
      hasIncludes?: boolean
      targetIsDirectory?: boolean
    } = {}
  ) {
    this.command = command
    this.directories = directories
    this.extensions = extensions
    this.excludes = excludes
    this.hasIncludes = hasIncludes
    this.targetIsDirectory = targetIsDirectory
  }

  /**
   * Appends the current command result to the checksums.
   * @param {string} filePath The file path.
   * @param {string} currentDirectory The current directory.
   * @param {LatexChecksumsCalculator} checksumsCalculator The checksums calculator instance.
   * @param {Checksums} checksums The checksums.
   */
  appendToChecksums(
    filePath: string,
    currentDirectory: string,
    checksumsCalculator: LatexChecksumsCalculator,
    checksums: Checksums
  ) {
    const fileDirectory = path.dirname(filePath)
    // Define a regular expression based on the current LaTeX include command.
    const regex = new RegExp(`\\\\${this.command}(\\[[A-Za-zÀ-ÖØ-öø-ÿ\\d, =.\\\\-]*])?{([A-Za-zÀ-ÖØ-öø-ÿ\\d/, .\\-:_]+)}`, 'gs')

    // Read the content of the LaTeX file.
    const content = fs.readFileSync(filePath, { encoding: 'utf8' })

    // Execute the regular expression on the content.
    let match = regex.exec(content)

    // Iterate through each match found in the content.
    while (match != null) {
      const fileName = match[2]
      const checksumKey = `${this.command}:${fileName}`

      // Check if the file should be excluded and if its checksum has not been calculated yet.
      if (!this.excludes.includes(fileName) && !(checksumKey in checksums)) {
        // Iterate through each directory for the current LaTeX include command.
        const directories = [
          null,
          currentDirectory,
          ...this.directories.map(directory => path.resolve(currentDirectory, directory)),
          ...this.directories
        ]
        if (fileDirectory !== currentDirectory) {
          directories.push(fileDirectory)
        }
        for (const directory of directories) {
          let includeFile = directory == null ? fileName : path.resolve(directory, fileName)

          // Check if the target is a directory.
          if (this.targetIsDirectory) {
            // Check if the directory exists and is a directory.
            if (fs.existsSync(includeFile) && fs.lstatSync(includeFile).isDirectory()) {
              const directoryChecksums: Checksums = {}

              // List files in the directory.
              const files = fs.readdirSync(includeFile)

              // Iterate through each file in the directory.
              for (const file of files) {
                const subKey = `sub:${getFileName(file)}`
                const subPath = path.resolve(includeFile, file)

                // Calculate checksums for files inside the directory.
                if (this.hasIncludes) {
                  directoryChecksums[subKey] = checksumsCalculator.calculateFileChecksums(
                    subPath,
                    currentDirectory
                  )
                }
                else {
                  directoryChecksums[subKey] = checksumsCalculator.generateChecksum(fs.readFileSync(subPath, { encoding: 'utf8' }))
                }
              }
              checksums[checksumKey] = directoryChecksums
              break
            }
          }
          else {
            // Check each possible extension for the include file.
            const extensions = ['', ...this.extensions]
            for (const extension of extensions) {
              const includeFileWithExtension = `${includeFile}${extension}`

              // Check if the file with the extension exists.
              if (fs.existsSync(includeFileWithExtension)) {
                includeFile = includeFileWithExtension
                break
              }
            }

            // Check if the file exists.
            if (fs.existsSync(includeFile)) {
              // Calculate checksums for included files.
              if (this.hasIncludes) {
                checksums[checksumKey] = checksumsCalculator.calculateFileChecksums(includeFile, currentDirectory)
              }
              else {
                checksums[checksumKey] = checksumsCalculator.generateChecksum(fs.readFileSync(includeFile, { encoding: 'utf8' }))
              }
              break
            }
          }
        }
      }
      // Continue to the next match.
      match = regex.exec(content)
    }
  }

  /**
   * The default Latex include commands.
   */
  static defaultLatexIncludeCommands: LatexIncludeCommand[] = [
    // `include` command for other LaTeX files.
    new LatexIncludeCommand('include'),
    // `input` command for other LaTeX files.
    new LatexIncludeCommand('input')
  ]

  /**
   * `includegraphics` command for graphics files.
   *
   * @param {string[]} includeGraphicsDirectories Directories for including graphics.
   * @returns {LatexIncludeCommand} The includegraphics` command.
   */
  static includeGraphics(includeGraphicsDirectories: string[]): LatexIncludeCommand {
    return new LatexIncludeCommand(
      'includegraphics',
      {
        directories: includeGraphicsDirectories,
        extensions: ['.pdf', '.svg', '.png', '.jpeg', '.jpg'],
        hasIncludes: false
      }
    )
  }
}

/**
 * Allows to calculate the checksums of a LaTeX file.
 */
export class LatexChecksumsCalculator extends ChecksumsCalculator {
  /**
   * The "include" commands.
   */
  latexIncludeCommands: LatexIncludeCommand[]

  /**
   * Creates a new `ChecksumsCalculator` instance.
   */
  constructor(
    {
      latexIncludeCommands = LatexIncludeCommand.defaultLatexIncludeCommands
    }: {
      latexIncludeCommands?: LatexIncludeCommand[]
    } = {}
  ) {
    super()
    this.latexIncludeCommands = latexIncludeCommands
  }

  /**
   * Calculates checksums for a LaTeX file and its dependencies.
   *
   * @param {string} filePath Path to the main LaTeX file.
   * @param {string | null} currentDirectory Current directory (used for relative paths).
   * @returns {Checksums} Object containing checksums for the file and its dependencies.
   */
  override calculateFileChecksums(
    filePath: string,
    currentDirectory: string | null = null
  ): Checksums {
    // If currentDirectory is not provided, use the directory of the LaTeX file.
    const fileDirectory = path.dirname(filePath)
    currentDirectory ??= fileDirectory

    // Initialize an object to store checksums.
    const checksums: Checksums = {}

    // Calculate and store the checksum for the main LaTeX file.
    checksums[`file:${getFileName(filePath)}`] = this.generateChecksum(fs.readFileSync(filePath, { encoding: 'utf8' }))

    // Iterate through each LaTeX include command.
    for (const latexIncludeCommand of this.latexIncludeCommands) {
      latexIncludeCommand.appendToChecksums(filePath, currentDirectory, this, checksums)
    }
    // Return the calculated checksums.
    return checksums
  }
}
