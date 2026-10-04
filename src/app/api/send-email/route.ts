import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { sendEmailWithAttachment } from "@/utils/mailer"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Hozzáférés megtagadva: Bejelentkezés szükséges a levélküldéshez.", { status: 401 })
    }

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
