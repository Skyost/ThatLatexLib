import { execSync } from 'child_process'
import { getFileName } from '../utils/utils'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Converts a PDF file to an SVG file using pdftocairo.
 *
 * @param {string} directory Working directory.
 * @param {string} pdfFile Path to the PDF file.
 * @returns {string} Path to the generated SVG file.
 */
export const pdftocairo = (directory: string, pdfFile: string): string => {
  // Generate the desired SVG file name based on the PDF file name.
  const svgFile = `${getFileName(pdfFile)}.svg`
  // Generate the full path to the SVG file.
  const svgFilePath = path.resolve(directory, svgFile)

  // Check if the SVG file does not already exist.
  if (!fs.existsSync(svgFilePath)) {
    // Execute pdftocairo command to convert the PDF file to SVG.
    execSync(`pdftocairo -svg "${pdfFile}" "${svgFile}"`, { cwd: directory })
  }

  // Return the path to the generated SVG file.
  return svgFilePath
}
