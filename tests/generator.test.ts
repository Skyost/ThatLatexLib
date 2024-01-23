// noinspection ES6PreferShortImport

import { generatePdf, generateSvg } from '../src/generator'
import * as path from 'path'

describe("Generator", () => {
  it("generate pdf", () => {
    const directory = path.resolve(__dirname, '_files')
    const fileName = 'simple'
    const result = generatePdf(path.resolve(directory, `${fileName}.tex`))
    expect(result.builtFilePath).toEqual(path.resolve(directory, `${fileName}.pdf`));
  })
  it("generate svg", () => {
    const directory = path.resolve(__dirname, '_files')
    const fileName = 'image'
    const result = generateSvg(path.resolve(directory, `${fileName}.tex`))
    expect(result.builtFilePath).toEqual(path.resolve(directory, `${fileName}.svg`));
  })
})
