// noinspection ES6PreferShortImport

import { PdfGenerator, SvgGenerator } from '../src/generators'
import { describe, expect, test } from 'vitest'
import * as path from 'path'

describe('Generator', () => {
  test('generate pdf', () => {
    const directory = path.resolve(__dirname, '_files')
    const fileName = 'simple'
    const generator = new PdfGenerator()
    const result = generator.generate(path.resolve(directory, `${fileName}.tex`))
    expect(result.builtFilePath).toEqual(path.resolve(directory, `${fileName}.pdf`))
  }, 30000)
  test('generate svg', () => {
    const directory = path.resolve(__dirname, '_files')
    const fileName = 'image'
    const generator = new SvgGenerator()
    const result = generator.generate(path.resolve(directory, `${fileName}.tex`))
    expect(result.builtFilePath).toEqual(path.resolve(directory, `${fileName}.svg`))
  }, 30000)
})
