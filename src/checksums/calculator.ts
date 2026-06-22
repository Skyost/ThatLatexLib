import type { Checksums } from './checksums.js'
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
   * @param input Input data.
   * @returns {string} MD5 checksum.
   */
  generateChecksum(input: string | NodeJS.ArrayBufferView): string {
    return crypto
      .createHash('md5')
      .update(input)
      .digest('hex')
  }
}
