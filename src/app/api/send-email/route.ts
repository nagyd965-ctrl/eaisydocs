import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Hozzáférés megtagadva: Bejelentkezés szükséges a levélküldéshez.", { status: 401 });
    }

    const { to, subject, text, iratId } = await request.json();

    if (!to || !subject || !text) {
      return new NextResponse("Hiányzó adatok (címzett, tárgy vagy üzenet)", { status: 400 });
    }

    // Alapvető e-mail cím formátum validáció
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      return new NextResponse("Érvénytelen címzett e-mail cím formátum", { status: 400 });
    }

    // Alapértelmezett SMTP szerver meghatározása
    const smtpHost = process.env.SMTP_HOST || (process.env.EMAIL_HOST ? process.env.EMAIL_HOST.replace('imap.', 'smtp.') : '');

    if (!smtpHost || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return new NextResponse("SMTP konfiguráció hiányzik a szerveren", { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.EMAIL_SMTP_PORT) || 465,
      secure: Number(process.env.EMAIL_SMTP_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: to.trim(),
      subject,
      text,
    });

    if (iratId) {
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "irat",
        entitas_id: iratId,
        user_id: user.id,
        esemeny_tipus: "modositva",
        indoklas: `Válasz e-mail elküldve a következő címre: ${to.trim()}\nMessage-ID: ${info.messageId}\n\nÜzenet szövege:\n${text}`
      });
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Hiba az email küldésekor:", error);
    return new NextResponse("Belső szerverhiba a levélküldés során", { status: 500 });
  }
}
