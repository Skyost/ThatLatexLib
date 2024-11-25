import * as path from 'path'

/**
 * Extracts the filename from a given file path.
 *
 * @param {string} file File path.
 * @returns {string} Filename.
 */
export const getFileName = (file: string): string => path.parse(file).name
