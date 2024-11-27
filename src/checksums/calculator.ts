import { Checksums } from './checksums'
import * as crypto from 'crypto'

/**
 * Allows to calculate the checksums of a file.
 */
export abstract class ChecksumsCalculator {
  /**
   * Calculates checksums for a file and its dependencies.
   *
   * @param {string} filePath Path to the main file.
   * @returns {Checksums} Object containing checksums for the file.
   */
  abstract calculateFileChecksums(filePath: string): Checksums

  /**
   * Generates an MD5 checksum for a given string.
   *
   * @param {string} string Input string.
   * @returns {string} MD5 checksum.
   */
  generateChecksum(string: string): string {
    return crypto
      .createHash('md5')
      .update(string, 'utf8')
      .digest('hex')
  }
}
