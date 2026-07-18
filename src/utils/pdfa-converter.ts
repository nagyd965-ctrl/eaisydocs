import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

/**
 * Converts a standard PDF buffer to a PDF/A-2b compliant PDF buffer using Ghostscript.
 * If Ghostscript is not installed or the conversion fails, it gracefully falls back
 * to returning the original buffer (mock/demo mode).
 * 
 * @param inputBuffer The original PDF file buffer
 * @returns A Promise resolving to the PDF/A buffer (or the original buffer as fallback)
 */
export async function convertToPdfA(inputBuffer: Buffer): Promise<{ buffer: Buffer, isFallback: boolean }> {
  const tempDir = os.tmpdir()
  const inputId = Math.random().toString(36).substring(7)
  const inputPath = path.join(tempDir, `input_${inputId}.pdf`)
  const outputPath = path.join(tempDir, `output_pdfa_${inputId}.pdf`)

  try {
    // 1. Write the buffer to a temporary file
    await fs.writeFile(inputPath, inputBuffer)

    // 2. Determine the Ghostscript command based on OS
    const isWindows = os.platform() === 'win32'
    const gsCommand = isWindows ? 'gswin64c' : 'gs'

    // Ghostscript parameters for PDF/A-2b conversion
    // Note: A true PDF/A requires a color profile (e.g., sRGB.icc) to be embedded,
    // but for demo purposes, this basic conversion command is sufficient to demonstrate the concept.
    const args = [
      '-dPDFA',
      '-dBATCH',
      '-dNOPAUSE',
      '-dColorConversionStrategy=/UseDeviceIndependentColor',
      '-sProcessColorModel=DeviceRGB',
      '-sDEVICE=pdfwrite',
      '-sPDFACompatibilityPolicy=1',
      `-sOutputFile="${outputPath}"`,
      `"${inputPath}"`
    ].join(' ')

    // 3. Execute Ghostscript
    await execAsync(`${gsCommand} ${args}`)

    // 4. Read the converted file
    const convertedBuffer = await fs.readFile(outputPath)

    // Cleanup and return
    await cleanup([inputPath, outputPath])
    return { buffer: convertedBuffer, isFallback: false }

  } catch (error) {
    console.warn('⚠️ PDF/A conversion failed or Ghostscript is not installed. Falling back to original PDF.', error)
    
    // Cleanup temporary files on failure
    await cleanup([inputPath, outputPath])
    
    // Fallback: return the original buffer
    return { buffer: inputBuffer, isFallback: true }
  }
}

async function cleanup(paths: string[]) {
  for (const p of paths) {
    try {
      await fs.unlink(p)
    } catch (e) {
      // Ignore cleanup errors (e.g., if file doesn't exist)
    }
  }
}
