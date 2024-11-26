// noinspection ES6PreferShortImport

import { PdfGenerator, SvgGenerator } from '../src/generators'
import * as path from 'path'

describe('Generator', () => {
  it('generate pdf', () => {
    const directory = path.resolve(__dirname, '_files')
    const fileName = 'simple'
    const generator = new PdfGenerator()
    const result = generator.generate(path.resolve(directory, `${fileName}.tex`))
    expect(result.builtFilePath).toEqual(path.resolve(directory, `${fileName}.pdf`))
  })
  it('generate svg', () => {
    const directory = path.resolve(__dirname, '_files')
    const fileName = 'image'
    const generator = new SvgGenerator()
    const result = generator.generate(path.resolve(directory, `${fileName}.tex`))
    expect(result.builtFilePath).toEqual(path.resolve(directory, `${fileName}.svg`))
  })
})
