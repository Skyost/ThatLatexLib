// noinspection ES6PreferShortImport

import { LatexChecksumsCalculator, LatexIncludeCommand } from '../src/checksums'
import * as path from 'path'

describe("Checksums", () => {
  it("simple checksums calculator", () => {
    const calculator = new LatexChecksumsCalculator()
    const result = calculator.calculateFileChecksums(path.resolve(__dirname, '_files', 'simple.tex'))
    expect(result).toEqual({'file:simple': '108c59e46ac65f9eec3257d5b60903fe'});
  })
  it("complex checksums calculator", () => {
    const calculator = new LatexChecksumsCalculator([
      LatexIncludeCommand.includeGraphics([path.resolve(__dirname, '_files', 'graphics')]),
      ...LatexIncludeCommand.defaultLatexIncludeCommands,
    ])
    const result = calculator.calculateFileChecksums(path.resolve(__dirname, '_files', 'complex.tex'))
    expect(result).toEqual({
      'file:complex': '66702ac7b36e24344d4d9483da16c99b',
      'includegraphics:test.png': '418a4ca95ce3d4620c44a1951c37336c',
      'include:commands.tex': {
        'file:commands': 'd03026a07e55b4f39b138ba042f5f009'
      }
    });
  })
})
