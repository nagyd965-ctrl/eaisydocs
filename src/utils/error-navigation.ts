export interface ErrorBackTarget {
  href: string
  label: string
}

/**
 * Meghatározza, hova vezessen a hibaoldal "Vissza" gombja.
 * Az eaisyHR és az eaisyDocs önálló modul: HR útvonalról a HR főoldalra,
 * minden más útvonalról az eaisyDocs áttekintésre kell visszavinni a felhasználót.
 */
export function getErrorBackTarget(pathname: string | null | undefined): ErrorBackTarget {
  const path = pathname ?? ""
  const isHr = path === "/hr" || path.startsWith("/hr/")

  if (isHr) {
    return { href: "/hr", label: "Vissza az eaisyHR főoldalra" }
  }
  return { href: "/", label: "Vissza az áttekintéshez" }
}
