import { redirect } from "next/navigation"

/**
 * Közvetlen átirányítás a felújított, osztott képernyős iktató és metaadat felületre (/inbox/[id]).
 * A korábbi háromkártyás köztes nézet helyett a felhasználó azonnal a dokumentum előnézethez,
 * csatolmányválasztóhoz és iktatási felülethez kerül.
 */
export default async function DocumentDetailedView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  redirect(`/inbox/${resolvedParams.id}`)
}
