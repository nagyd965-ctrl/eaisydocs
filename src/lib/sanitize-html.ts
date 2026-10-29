/**
 * Biztonságos HTML és Markdown tartalom-tisztító segédfüggvény.
 * Eltávolítja a potenciálisan veszélyes scripteket, beágyazásokat és eseménykezelőket,
 * valamint normalizálja az egymásba ágyazott blockquote blokkokat.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") {
    return ""
  }

  let clean = rawHtml
    // 1. Veszélyes címkék teljes eltávolítása (tartalommal együtt)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")

    // 2. Inline eseménykezelők és beégetett inline style attribútumok eltávolítása
    .replace(/\s+on[a-zA-Z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s+style\s*=\s*(['"]).*?\1/gi, "")

    // 3. Veszélyes protokollok semlegesítése linkekben és forrásokban
    .replace(
      /(href|src)\s*=\s*(['"])\s*(?:javascript|vbscript|data:text\/html):[^'"]*\2/gi,
      '$1="#"'
    )
    .replace(
      /(href|src)\s*=\s*(?:javascript|vbscript|data:text\/html):[^\s>]+/gi,
      '$1="#"'
    )

  // 4. Egymásba ágyazott <blockquote><blockquote>...</blockquote></blockquote> lapítása
  let prev = ""
  while (prev !== clean) {
    prev = clean
    clean = clean
      .replace(/<blockquote[^>]*>\s*<blockquote[^>]*>/gi, "<blockquote>")
      .replace(/<\/blockquote>\s*<\/blockquote>/gi, "</blockquote>")
  }

  return clean
}
