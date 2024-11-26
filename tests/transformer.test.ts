// noinspection ES6PreferShortImport

import * as path from 'path'
import { LatexImageExtractorInDirectory, PandocCommand, PandocTransformer } from '../src'

describe('Transformer', () => {
  it('simple html transform', () => {
    const transformer = new PandocTransformer()
    const result = transformer.transform(path.resolve(__dirname, '_files', 'simple.tex'))
    expect(removeLineBreaks(result.htmlResult!.toString())).toEqual('<p>Hello World !</p>')
  })
  it('complex html transform', () => {
    const transformer = new PandocTransformer({
      imageSrcResolver: PandocTransformer.resolveFromAssetsRoot(
        path.resolve(__dirname, '_files', 'graphics')
      ),
      imageExtractors: [
        new LatexImageExtractorInDirectory(
          'tikzpicture',
          path.resolve(__dirname, '_files', 'graphics', 'extracted'),
          (extractedImageTexFilePath, latexContent) => {
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
    const result = transformer.transform(path.resolve(__dirname, '_files', 'complex.tex'))
    expect(removeLineBreaks(result.htmlResult!.outerHTML)).toEqual(removeLineBreaks(`<div class="center">
<p>This is a simple shared command.</p>
<p>We’re using Pandoc !</p>
<p><img src="/graphics/test.png" style="height:5cm" alt="test"></p>
<p><img src="/graphics/extracted/tikzpicture-1.svg" alt="tikzpicture-1"></p>
</div>`))
  })
})

const removeLineBreaks = (input: string): string => input.trim().replace(/\r\n|\r|\n/g, '')
