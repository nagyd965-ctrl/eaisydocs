import { NextRequest, NextResponse } from "next/server"
import { sendEmailWithAttachment } from "@/utils/mailer"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"])
    if (!auth.authorized || !auth.user) {
      return new NextResponse(
        auth.error || "Hozzáférés megtagadva: Bejelentkezés és megfelelő jogosultság szükséges a levélküldéshez.",
        { status: auth.user ? 403 : 401 }
      )
    }
    const user = auth.user

    const { to, subject, text, html, iratId, ugyiratId, saveToPartnerId } = await request.json()

    if (!to || !subject || !text) {
      return new NextResponse("Hiányzó adatok (címzett, tárgy vagy üzenet szövege)", { status: 400 })
    }

    const result = await sendEmailWithAttachment({
      to,
      subject,
      text,
      html,
      iratId,
      ugyiratId,
      userId: user.id,
      saveToPartnerId,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error: any) {
    console.error("Hiba az email küldésekor:", error)
    return new NextResponse("Belső szerverhiba a levélküldés során", { status: 500 })
  }
}
