import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Extracts the filename from a given file path.
 *
 * @param {string} file File path.
 * @returns {string} Filename.
 */
export const getFileName = (file: string): string => path.parse(file).name

/**
 * Generates an MD5 checksum for a given string.
 *
 * @param {string} string Input string.
 * @returns {string} MD5 checksum.
 */
export const generateChecksum = (string: string): string => crypto
  .createHash('md5')
  .update(string, 'utf8')
  .digest('hex')
