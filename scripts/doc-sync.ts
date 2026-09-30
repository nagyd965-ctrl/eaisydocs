/**
 * eaisyDocs & eaisyHR - Documentation Synchronization CLI Helper
 * Futtatás: npx tsx scripts/doc-sync.ts
 * 
 * Kilistázza a módosított fájlokat a gitből, és megadja az érintett dokumentációkat,
 * valamint a következő szabad ADR és PRD sorszámokat.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function getGitStatus(): string[] {
  try {
    const status = execSync("git status -s", { encoding: "utf8" });
    return status
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.substring(3).trim());
  } catch (_e) {
    return [];
  }
}

function getNextIndexNumber(indexPath: string, prefix: string): string {
  if (!fs.existsSync(indexPath)) return `${prefix}-001`;
  const content = fs.readFileSync(indexPath, "utf8");
  const regex = new RegExp(`\\[${prefix}-(\\d+)\\]`, "g");
  let maxNum = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > maxNum) maxNum = num;
  }
  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" 📚 eaisyDocs & eaisyHR - Dokumentáció Ellenőrző és Szinkronizáló");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const files = getGitStatus();
  console.log(`🔍 Módosított fájlok száma a sessionben: ${files.length}`);
  files.forEach(f => console.log(`   • ${f}`));

  const adrIndex = path.join(process.cwd(), "docs", "architecture", "decisions", "index.md");
  const prdIndex = path.join(process.cwd(), "docs", "product", "decisions", "index.md");
  const brdIndex = path.join(process.cwd(), "docs", "business", "decisions", "index.md");

  const nextAdr = getNextIndexNumber(adrIndex, "A");
  const nextPrd = getNextIndexNumber(prdIndex, "P");
  const nextBrd = getNextIndexNumber(brdIndex, "BRD");

  console.log("\n📋 Következő sorszámok a nyilvántartásokban:");
  console.log(`   • Következő ADR sorszám : ${nextAdr}`);
  console.log(`   • Következő PRD sorszám : ${nextPrd}`);
  console.log(`   • Következő BRD sorszám : ${nextBrd}`);

  console.log("\n💡 Tipp a dokumentáláshoz:");
  console.log("   Mondd az AI asszisztensnek: 'dokumentáld le a mai fejlesztést' vagy 'docs sync'!");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main();
