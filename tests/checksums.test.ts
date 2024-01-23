import { calculateTexFileChecksums } from '../src/checksums'
import * as path from 'path'

describe("Checksums", () => {
  it("simple checksums calculator", () => {
    const result = calculateTexFileChecksums(path.resolve(__dirname, '_files', 'simple.tex'))
    expect(result).toEqual({'file:simple': '910b8c13892d630eac92cb89e93e40f9'});
  })
  it("complex checksums calculator", () => {
    const result = calculateTexFileChecksums(
      path.resolve(__dirname, '_files', 'complex.tex'),
      ['graphics']
    )
    expect(result).toEqual({
      'file:complex': 'e3a02c4210192871a328937681013bc7',
      'includegraphics:test.png': '418a4ca95ce3d4620c44a1951c37336c',
      'include:commands.tex': {
        'file:commands': '08eae57c93dde70db47e79d1a3e2cec7'
      }
    });
  })
})
