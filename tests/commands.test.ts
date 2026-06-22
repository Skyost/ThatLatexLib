import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, test, vi } from 'vitest'

const spawnSync = vi.hoisted(() => vi.fn())

vi.mock('child_process', () => ({ spawnSync }))

import { LatexMkCommand, PdfToCairoCommand } from '../src/commands'

afterEach(() => {
  spawnSync.mockReset()
})

describe('Commands', () => {
  test('reconverts a PDF when the SVG already exists', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'that-latex-lib-'))
    fs.writeFileSync(path.join(directory, 'document.svg'), 'stale')
    spawnSync.mockReturnValue({ status: 0 })

    try {
      const result = new PdfToCairoCommand({ printLogs: false }).run(directory, 'document.pdf')
      expect(result).toEqual(path.join(directory, 'document.svg'))
      expect(spawnSync).toHaveBeenCalledWith(
        'pdftocairo',
        ['-svg', 'document.pdf', 'document.svg'],
        expect.objectContaining({ cwd: directory })
      )
    }
    finally {
      fs.rmSync(directory, { recursive: true })
    }
  })

  test('passes special file names as a distinct latexmk argument', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'that-latex-lib-'))
    spawnSync.mockReturnValue({ status: 0 })

    try {
      new LatexMkCommand({ printLogs: false }).run(directory, 'document; echo unsafe.tex', false)
      expect(spawnSync).toHaveBeenCalledWith(
        'latexmk',
        ['-lualatex', 'document; echo unsafe.tex'],
        expect.objectContaining({ cwd: directory })
      )
    }
    finally {
      fs.rmSync(directory, { recursive: true })
    }
  })
})
