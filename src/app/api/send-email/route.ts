import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, text, iratId } = await request.json();

    if (!to || !subject || !text) {
      return new NextResponse("Hiányzó adatok", { status: 400 });
    }

    // Alapértelmezett SMTP szerver meghatározása
    // Ha nincs megadva külön SMTP_HOST, az EMAIL_HOST-ból kitalálja (pl. imap.websupport.hu -> smtp.websupport.hu)
    const smtpHost = process.env.SMTP_HOST || (process.env.EMAIL_HOST ? process.env.EMAIL_HOST.replace('imap.', 'smtp.') : '');

    if (!smtpHost || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return new NextResponse("SMTP konfiguráció hiányzik a .env.local fájlból", { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.EMAIL_SMTP_PORT) || 465,
      secure: Number(process.env.EMAIL_SMTP_PORT) === 465, // true if port is 465, false otherwise
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER, // A feladó pontosan az a fiók, amit az IMAP is használ
      to, 
      subject, 
      text, 
    });

    if (iratId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from("esemeny_naplo").insert({
          entitas_tipus: "irat",
          entitas_id: iratId,
          user_id: user.id,
          esemeny_tipus: "modositva",
          indoklas: `Válasz e-mail elküldve a következő címre: ${to}\nMessage-ID: ${info.messageId}\n\nÜzenet szövege:\n${text}`
        });
      }
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Hiba az email küldésekor:", error);
    return new NextResponse(error.message || "Belső szerverhiba a levélküldés során", { status: 500 });
  }
}
