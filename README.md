<div align="center">
<img src="https://raw.githubusercontent.com/Skyost/ThatLatexLib/refs/heads/master/logo.svg" height="100" title="That LaTeX lib" alt="That LaTeX lib"/>
</div>

<br>

Just a very simple wrapper around `latexmk`, `pdftocairo`, `svgo` and `pandoc` that allows me
to convert my LaTeX documents into a PDF, a SVG or an HTML document.

## Features

* Convert your LaTeX files to use them in your web pages.
* Calculate TeX files checksums so that you don't have to regenerate it each time
  you want a PDF.
* Extract and convert your `tikzpicture` images from your LaTeX documents.
* Automatically compresses your SVG files using SVGO.
* Render transformed HTML math elements using Katex (can easily be configured).

## Use cases

I'm currently using it in three of my Nuxt projects :

* [MesCoursDeMaths](https://github.com/Skyost/MesCoursDeMaths) ;
* [Agregation](https://github.com/Skyost/Agregation) ;
* [Bacomathiques](https://github.com/Skyost/Bacomathiques).

In these projects, everything is written in LaTeX, then processed using this library.
Here's an [example output page](https://agreg.skyost.eu/developpements/caracterisation-reelle-de-gamma/).

Feel free to use it in your projects as well :wink:

## Usage

Check the [tests directory](https://github.com/Skyost/ThatLatexLib/blob/master/tests/) to see how you can use this library.

## License

Licensed under the MIT license. See [here](https://github.com/Skyost/ThatLatexLib/blob/master/LICENSE).
