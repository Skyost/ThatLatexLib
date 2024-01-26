import * as path from 'path'
import { generateChecksum, getFileName } from './utils/utils'
import * as fs from 'fs'

/**
 * Extension of checksums files.
 */
export const checksumsExtension = '.checksums'

/**
 * Interface defining a LaTeX inclusion command configuration.
 */
export interface LatexIncludeCommand {
  /**
   * LaTeX command for inclusion.
   */
  command: string
  /**
   * Directories to search for files related to this command.
   */
  directories: (string | null)[]
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
   * Indicates whether the command involves graphics.
   */
  hasGraphics?: boolean
}

/**
 * Type definition for checksums.
 */
export type Checksums = { [key: string]: string | Checksums }

/**
 * The default Latex include commands.
 */
export const defaultLatexIncludeCommands: LatexIncludeCommand[] = [
  // includegraphics command for graphics files.
  {
    command: 'includegraphics',
    directories: [],
    extensions: ['.pdf', '.svg', '.png', '.jpeg', '.jpg'],
    excludes: [],
    hasIncludes: false,
    targetIsDirectory: false,
    hasGraphics: true
  },
  // include command for other LaTeX files.
  {
    command: 'include',
    directories: [],
    extensions: ['.tex'],
    excludes: [],
    hasIncludes: true,
    targetIsDirectory: false
  },
  // input command for other LaTeX files.
  {
    command: 'input',
    directories: [],
    extensions: ['.tex'],
    excludes: [],
    hasIncludes: true,
    targetIsDirectory: false
  }
]

/**
 * Calculates checksums for a LaTeX file and its dependencies.
 *
 * @param {string} filePath Path to the main LaTeX file.
 * @param {string[]} includeGraphicsDirectories Directories to search for graphics files.
 * @param {string | null} currentDirectory Current directory (used for relative paths).
 * @param {LatexIncludeCommand[]} latexIncludeCommands The "include" commands.
 * @returns {Checksums} Object containing checksums for the file and its dependencies.
 */
export const calculateTexFileChecksums = (
  filePath: string,
  includeGraphicsDirectories: string[] = [],
  currentDirectory: string | null = null,
  latexIncludeCommands: LatexIncludeCommand[] = defaultLatexIncludeCommands
): Checksums => {
  // If currentDirectory is not provided, use the directory of the LaTeX file.
  const fileDirectory = path.dirname(filePath)
  currentDirectory ??= fileDirectory

  // Initialize an object to store checksums.
  const checksums: Checksums = {}

  // Calculate and store the checksum for the main LaTeX file.
  checksums[`file:${getFileName(filePath)}`] = generateChecksum(fs.readFileSync(filePath, { encoding: 'utf8' }))

  // Iterate through each LaTeX include command.
  for (const latexIncludeCommand of latexIncludeCommands) {
    // Define a regular expression based on the current LaTeX include command.
    const regex = new RegExp(`\\\\${latexIncludeCommand.command}(\\[[A-Za-zÀ-ÖØ-öø-ÿ\\d, =.\\\\-]*])?{([A-Za-zÀ-ÖØ-öø-ÿ\\d/, .\\-:_]+)}`, 'gs')

    // Read the content of the LaTeX file.
    const content = fs.readFileSync(filePath, { encoding: 'utf8' })

    // Execute the regular expression on the content.
    let match = regex.exec(content)

    // Iterate through each match found in the content.
    while (match != null) {
      const fileName = match[2]
      const checksumKey = `${latexIncludeCommand.command}:${fileName}`

      // Check if the file should be excluded and if its checksum has not been calculated yet.
      if (!latexIncludeCommand.excludes.includes(fileName) && !(checksumKey in checksums)) {
        // Iterate through each directory for the current LaTeX include command.
        let directories = [
          null,
          currentDirectory,
          ...latexIncludeCommand.directories
        ]
        if (fileDirectory !== currentDirectory) {
          directories.push(fileDirectory)
        }
        if (latexIncludeCommand.hasGraphics) {
          directories = [...directories, ...includeGraphicsDirectories]
        }
        for (const directory of directories) {
          let includeFile = directory == null ? fileName : path.resolve(currentDirectory, directory, fileName)

          // Check if the target is a directory.
          if (latexIncludeCommand.targetIsDirectory) {
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
                if (latexIncludeCommand.hasIncludes) {
                  directoryChecksums[subKey] = calculateTexFileChecksums(subPath, includeGraphicsDirectories, currentDirectory)
                } else {
                  directoryChecksums[subKey] = generateChecksum(fs.readFileSync(subPath, { encoding: 'utf8' }))
                }
              }
              checksums[checksumKey] = directoryChecksums
              break
            }
          } else {
            // Check each possible extension for the include file.
            const extensions = ['', ...latexIncludeCommand.extensions]
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
              if (latexIncludeCommand.hasIncludes) {
                checksums[checksumKey] = calculateTexFileChecksums(includeFile, includeGraphicsDirectories, currentDirectory)
              } else {
                checksums[checksumKey] = generateChecksum(fs.readFileSync(includeFile, { encoding: 'utf8' }))
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
  // Return the calculated checksums.
  return checksums
}
