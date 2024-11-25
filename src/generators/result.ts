/**
 * Class for the result of a file generation operation.
 */
export class GenerateResult {
  /**
   * Path to the generated file or `null` if generation fails.
   */
  builtFilePath: string | null
  /**
   * Indicates whether the file was retrieved from the cache.
   */
  wasCached: boolean

  /**
   * Creates a new `GenerateResult` instance.
   *
   * @param builtFilePath Path to the generated file or `null` if generation fails.
   * @param wasCached Indicates whether the file was retrieved from the cache.
   */
  constructor (
    builtFilePath: string | null,
    wasCached: boolean = false
  ) {
    this.builtFilePath = builtFilePath
    this.wasCached = wasCached
  }
}
