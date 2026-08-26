/**
 * pdf-browser.ts
 *
 * Egységes böngésző-indító segédfüggvény a Puppeteer alapú PDF generáláshoz.
 *
 * - Vercel / éles serverless környezetben: @sparticuz/chromium-min-t használ
 *   (optimalizált, kis méretű AWS Lambda / Vercel kompatibilis Chromium bináris)
 * - Lokális fejlesztői környezetben (Windows / macOS / Linux): a gépre telepített
 *   Chrome vagy Edge böngészőt veszi igénybe, puppeteer-core-on keresztül.
 *
 * Használat:
 *   import { launchPdfBrowser } from '@/utils/pdf-browser'
 *   const browser = await launchPdfBrowser()
 *   const page = await browser.newPage()
 *   // ... PDF generálás ...
 *   await browser.close()
 */

import puppeteerCore, { type Browser } from 'puppeteer-core'
import * as os from 'os'
import * as fs from 'fs'

/** Standard Chromium argumentumok, amelyek stabillá teszik a futást mindkét környezetben */
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
]

/**
 * Windows rendszeren megkeresi a Chrome vagy Edge telepítési útvonalát.
 * Sorrendben próbálkozik: Chrome stabil, Chrome beta, Microsoft Edge.
 */
function findLocalChromiumPath(): string | null {
  if (os.platform() !== 'win32') return null

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]

  for (const path of candidates) {
    if (path && fs.existsSync(path)) {
      return path
    }
  }
  return null
}

/**
 * macOS / Linux rendszeren megkeresi a Chrome telepítési útvonalát.
 */
function findLocalChromiumPathUnix(): string | null {
  const platform = os.platform()

  if (platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p
    }
  }

  if (platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ]
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p
    }
  }

  return null
}

/**
 * Elindít egy headless Chromium böngészőt a megfelelő módban.
 *
 * @returns Puppeteer Browser instance
 * @throws Error ha nem sikerül böngészőt indítani
 */
export async function launchPdfBrowser(): Promise<Browser> {
  // ── Vercel / Lambda serverless környezet ──────────────────────────────────
  // A VERCEL env változót a Vercel automatikusan beállítja minden deployment esetén.
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium-min')

    // A chromium.executablePath() egy URL-t vár, ahonnan letöltheti a binárist,
    // vagy ha a bináris már be van csomagolva, akkor az elérési útvonalat adja vissza.
    // A chromium-min automatikusan kezeli ezt.
    const executablePath = await chromium.default.executablePath()

    return puppeteerCore.launch({
      args: [...(chromium.default.args ?? []), ...CHROMIUM_ARGS],
      executablePath,
      headless: true,
    })
  }

  // ── Helyi fejlesztői környezet ────────────────────────────────────────────
  // Megkeressük a gépen lévő Chrome-ot vagy Edge-et.
  const localPath = findLocalChromiumPath() || findLocalChromiumPathUnix()

  if (localPath) {
    console.log(`[pdf-browser] Helyi böngésző: ${localPath}`)
    return puppeteerCore.launch({
      executablePath: localPath,
      headless: true,
      args: CHROMIUM_ARGS,
    })
  }

  // ── Fallback: teljes puppeteer (ha telepítve van a gépre) ─────────────────
  // Ez általában a fejlesztői gépeken automatikusan letöltött Chromium-ot jelenti.
  try {
    const puppeteer = await import('puppeteer')
    console.log('[pdf-browser] Fallback: beépített puppeteer Chromium')
    return puppeteer.default.launch({
      headless: true,
      args: CHROMIUM_ARGS,
    }) as unknown as Browser
  } catch {
    throw new Error(
      '[pdf-browser] Nem található Chromium böngésző. ' +
      'Ellenőrizd, hogy telepítve van-e a Chrome, az Edge, vagy a puppeteer csomag!'
    )
  }
}
