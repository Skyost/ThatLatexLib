// noinspection ES6PreferShortImport

import { LatexChecksumsCalculator, LatexIncludeCommand } from '../src/checksums'
import { describe, expect, test } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

describe('Checksums', () => {
  test('simple checksums calculator', () => {
    const calculator = new LatexChecksumsCalculator()
    const result = calculator.calculateFileChecksums(path.resolve(__dirname, '_files', 'simple.tex'))
    expect(result).toEqual({ 'file:simple': '108c59e46ac65f9eec3257d5b60903fe' })
  })
  test('complex checksums calculator', () => {
    const calculator = new LatexChecksumsCalculator({
      latexIncludeCommands: [
        LatexIncludeCommand.includeGraphics([path.resolve(__dirname, '_files', 'graphics')]),
        ...LatexIncludeCommand.defaultLatexIncludeCommands
      ]
    })
    const result = calculator.calculateFileChecksums(path.resolve(__dirname, '_files', 'complex.tex'))
    expect(result).toEqual({
      'file:complex': '66702ac7b36e24344d4d9483da16c99b',
      'includegraphics:test.png': 'fd8b322ccb0c9f503d320ac5a6fcb9a9',
      'include:commands.tex': {
        'file:commands': '583d939ec10b45576ad278f0268c308d'
      }
    })
  })

  test('normalizes text line endings', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'that-latex-lib-'))
    const lfFile = path.join(directory, 'lf.tex')
    const crlfFile = path.join(directory, 'crlf.tex')
    fs.writeFileSync(lfFile, 'first\nsecond\n')
    fs.writeFileSync(crlfFile, 'first\r\nsecond\r\n')

    try {
      const calculator = new LatexChecksumsCalculator()
      expect(calculator.calculateFileChecksums(lfFile)['file:lf'])
        .toEqual(calculator.calculateFileChecksums(crlfFile)['file:crlf'])
    }
    finally {
      fs.rmSync(directory, { recursive: true })
    }
  })

  test('handles cyclic includes and special file names', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'that-latex-lib-'))
    const firstFile = path.join(directory, 'first.tex')
    const secondFile = path.join(directory, 'second (v#1).tex')
    fs.writeFileSync(firstFile, '\\input{second (v#1)}')
    fs.writeFileSync(secondFile, '\\input{first}')

    try {
      const result = new LatexChecksumsCalculator().calculateFileChecksums(firstFile)
      expect(result['input:second (v#1)']).toEqual({
        'file:second (v#1)': 'a36096cb00655cbdb99142a36ce68d4a',
        'input:first': {}
      })
    }
    finally {
      fs.rmSync(directory, { recursive: true })
    }
  })

  test('hashes binary data without UTF-8 decoding', () => {
    const calculator = new LatexChecksumsCalculator()
    expect(calculator.generateChecksum(Buffer.from([0xff])))
      .not.toEqual(calculator.generateChecksum(Buffer.from([0xfe])))
  })
})
