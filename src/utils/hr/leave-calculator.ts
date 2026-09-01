export function calculateAnnualLeave(
  birthDateString: string | null | undefined,
  childrenCount: number = 0,
  isVulnerable: boolean = false,
  currentYear: number = new Date().getFullYear()
): number {
  const baseLeave = 20;
  let ageExtra = 0;

  if (birthDateString) {
    const birthYear = new Date(birthDateString).getFullYear();
    const age = currentYear - birthYear;

    if (age >= 45) ageExtra = 10;
    else if (age >= 43) ageExtra = 9;
    else if (age >= 41) ageExtra = 8;
    else if (age >= 39) ageExtra = 7;
    else if (age >= 37) ageExtra = 6;
    else if (age >= 35) ageExtra = 5;
    else if (age >= 33) ageExtra = 4;
    else if (age >= 31) ageExtra = 3;
    else if (age >= 28) ageExtra = 2;
    else if (age >= 25) ageExtra = 1;
  }

  let childrenExtra = 0;
  if (childrenCount === 1) childrenExtra = 2;
  else if (childrenCount === 2) childrenExtra = 4;
  else if (childrenCount >= 3) childrenExtra = 7;

  const vulnerableExtra = isVulnerable ? 5 : 0;

  return baseLeave + ageExtra + childrenExtra + vulnerableExtra;
}

/**
 * Kiszámítja a munkanapokon eltöltött napok számát két dátum között,
 * figyelembe véve a hétvégéket ÉS a magyar munkaszüneti napokat.
 *
 * @param startDate - Kezdő dátum (ISO string vagy Date)
 * @param endDate   - Záró dátum (ISO string vagy Date), inkluzív
 * @param unnepnapok - A hr_munkaszuneti_nap táblából lekért dátumok tömbje ('YYYY-MM-DD' formátumban)
 * @returns A munkanapok száma
 */
export function calculateWorkingDays(
  startDate: string | Date,
  endDate: string | Date,
  unnepnapok: string[] = []
): number {
  const unnepSet = new Set(unnepnapok)
  let count = 0
  const cur = new Date(startDate)
  const end = new Date(endDate)

  // Normalizálás (időzóna-semleges összehasonlítás)
  cur.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  while (cur <= end) {
    const dow = cur.getDay()
    const dateStr = cur.toISOString().split("T")[0]
    // Munkanap: nem hétvége ÉS nem munkaszüneti nap
    if (dow !== 0 && dow !== 6 && !unnepSet.has(dateStr)) {
      count++
    }
    cur.setDate(cur.getDate() + 1)
  }

  return count
}
