import assert from "node:assert"
import { getErrorBackTarget } from "../error-navigation"

async function runTests() {
  console.log("Starting Error Navigation Unit Tests...\n")

  // TEST 1: Docs útvonalak az áttekintésre vezetnek vissza
  console.log("--- TEST 1: Docs routes go back to the dashboard ---")
  for (const p of ["/", "/dossiers", "/dossiers/abc-123", "/inbox", "/partners/42", "/archive", "/audit"]) {
    const t = getErrorBackTarget(p)
    assert.strictEqual(t.href, "/", `${p} -> /`)
    assert.strictEqual(t.label, "Vissza az áttekintéshez")
  }
  console.log("TEST 1 PASSED.")

  // TEST 2: HR útvonalak a HR főoldalra vezetnek vissza (modul-függetlenség)
  console.log("\n--- TEST 2: HR routes go back to the HR home ---")
  for (const p of ["/hr", "/hr/", "/hr/admin", "/hr/employee/9f", "/hr/self-service/profile"]) {
    const t = getErrorBackTarget(p)
    assert.strictEqual(t.href, "/hr", `${p} -> /hr`)
    assert.strictEqual(t.label, "Vissza az eaisyHR főoldalra")
  }
  console.log("TEST 2 PASSED.")

  // TEST 3: Csak a valódi /hr szegmens számít, a hasonló előtagok nem
  console.log("\n--- TEST 3: Look-alike prefixes are not treated as HR ---")
  for (const p of ["/hrabc", "/hr-docs", "/hrx/admin", "/archive/hr"]) {
    assert.strictEqual(getErrorBackTarget(p).href, "/", `${p} must not be HR`)
  }
  console.log("TEST 3 PASSED.")

  // TEST 4: Hiányzó/üres útvonal biztonságos alapértelmezést ad
  console.log("\n--- TEST 4: Missing pathname falls back to the dashboard ---")
  assert.strictEqual(getErrorBackTarget(null).href, "/")
  assert.strictEqual(getErrorBackTarget(undefined).href, "/")
  assert.strictEqual(getErrorBackTarget("").href, "/")
  console.log("TEST 4 PASSED.")

  console.log("\nALL ERROR NAVIGATION TESTS PASSED.")
}

runTests().catch((e) => {
  console.error(e)
  process.exit(1)
})
