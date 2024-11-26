import { LatexChecksumsCalculator, ChecksumsCalculator } from '../checksums'
import { GenerateResult } from './result'

/**
 * Allows to generate a file.
 */
abstract class Generator<C extends ChecksumsCalculator> {
  /**
   * The checksums calculator function.
   */
  checksumsCalculator: C

  /**
   * Creates a new `Generator` instance.
   *
   * @param checksumsCalculator The file checksums calculator.
   */
  protected constructor(checksumsCalculator: C) {
    this.checksumsCalculator = checksumsCalculator
  }

  /**
   * Generates a file from another file.
   *
   * @param {string} filePath Path to the file.
   * @returns {GenerateResult} Result of generation.
   */
  abstract generate(filePath: string): GenerateResult
}

/**
 * Allows to generate a file from a Latex file.
 */
export abstract class LatexGenerator extends Generator<LatexChecksumsCalculator> {
  /**
   * If true, generate the PDF even if it already exists.
   */
  generateIfExists: boolean
  /**
   * If true, clean auxiliary files after compilation.
   */
  clean: boolean

  /**
   * Creates a new `LatexGenerator` instance.
   *
   * @param generateIfExists If true, generate the PDF even if it already exists.
   * @param clean If true, clean auxiliary files after compilation.
   * @param checksumsCalculator The Latex checksums calculator.
   */
  constructor(
    {
      generateIfExists = true,
      clean = true,
      checksumsCalculator = new LatexChecksumsCalculator()
    }: {
      generateIfExists?: boolean
      clean?: boolean
      checksumsCalculator?: LatexChecksumsCalculator
    } = {}
  ) {
    super(checksumsCalculator)
    this.generateIfExists = generateIfExists
    this.clean = clean
  }
}
