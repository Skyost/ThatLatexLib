// noinspection ES6PreferShortImport

import * as path from 'path'
import { describe, expect, test } from 'vitest'
import { LatexImageExtractorInDirectory, PandocCommand, PandocTransformer } from '../src'

describe('Transformer', () => {
  test('simple html transform', async () => {
    const transformer = new PandocTransformer()
    const result = await transformer.transform(path.resolve(__dirname, '_files', 'simple.tex'))
    expect(removeLineBreaks(result.htmlResult!.toString())).toEqual('<p>Hello World !</p>')
  }, 30000)
  test('complex html transform', async () => {
    const transformer = new PandocTransformer({
      imageSrcResolver: PandocTransformer.resolveFromAssetsRoot(
        path.resolve(__dirname, '_files', 'graphics')
      ),
      imageExtractors: [
        new LatexImageExtractorInDirectory(
          'tikzpicture',
          path.resolve(__dirname, '_files', 'graphics', 'extracted'),
          (_: string, latexContent: string) => {
            return `\\documentclass[tikz]{standalone}
\\usepackage{tkz-euclide}
\\usepackage{fourier-otf}
\\usepackage{fontspec}
\\tikzset{
  graphfonctionlabel/.style args={at #1 #2 with #3}{
    postaction={
      decorate, decoration={markings, mark= at position #1 with \\node [#2] {#3};}
    }
  },
every picture/.append style={scale=1.5, every node/.style={scale=1.5}}
}
\\begin{document}
  ${latexContent}
\\end{document}`
          }
        )
      ],
      pandoc: new PandocCommand({
        header: '\\providecommand{\\ifpandoc}[2]{#1}'
      })
    })
    const result = await transformer.transform(path.resolve(__dirname, '_files', 'complex.tex'))
    expect(removeLineBreaks(result.htmlResult!.outerHTML)).toEqual(removeLineBreaks(`<div class="center">
<p>This is a simple shared command that writes <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.7278em;vertical-align:-0.0833em;"></span><span class="mord">2</span><span class="mspace" style="margin-right:0.2222em;"></span><span class="mbin">+</span><span class="mspace" style="margin-right:0.2222em;"></span></span><span class="base"><span class="strut" style="height:0.6444em;"></span><span class="mord">2</span><span class="mspace" style="margin-right:0.2778em;"></span><span class="mrel">=</span><span class="mspace" style="margin-right:0.2778em;"></span></span><span class="base"><span class="strut" style="height:0.6444em;"></span><span class="mord">4</span></span></span></span>.</p>
<p>We’re using Pandoc !</p>
<p><img src="/graphics/test.png" style="height:5cm" alt="test"></p>
<p><img src="/graphics/extracted/tikzpicture-1.svg" alt="tikzpicture-1"></p>
</div>`))
  }, 30000)
})

const removeLineBreaks = (input: string): string => input.trim().replace(/\r\n|\r|\n/g, '')
