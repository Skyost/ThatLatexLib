// noinspection ES6PreferShortImport

import { PdfGenerator, SvgGenerator } from '../src/generators'
import { LatexMkCommand } from '../src/commands'
import { afterEach, describe, expect, test, vi } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

afterEach(() => {
  vi.restoreAllMocks()
})

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

  test('does not clean when clean is disabled', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'that-latex-lib-'))
    const texFile = path.join(directory, 'document.tex')
    const pdfFile = path.join(directory, 'document.pdf')
    fs.writeFileSync(texFile, 'content')
    vi.spyOn(LatexMkCommand.prototype, 'run').mockReturnValue(pdfFile)
    const clean = vi.spyOn(LatexMkCommand.prototype, 'clean')

    try {
      const result = new PdfGenerator({ clean: false }).generate(texFile)
      expect(result.builtFilePath).toEqual(pdfFile)
      expect(clean).not.toHaveBeenCalled()
    }
    finally {
      fs.rmSync(directory, { recursive: true })
    }
  })
})
