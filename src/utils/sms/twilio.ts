import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

// Csak akkor inicializáljuk, ha megvannak a kulcsok (ne fagyjon le a szerver, ha még hiányoznak)
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

interface SendSmsParams {
  to: string;
  body: string;
  subject?: string;
  dossierId?: string;
  skipLog?: boolean;
}

async function logSmsAudit(
  to: string, 
  body: string, 
  status: 'sikeres' | 'hibas', 
  errorReason?: string | null, 
  subject?: string, 
  dossierId?: string
) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    await adminSupabase.from('ertesites_naplo').insert({
      csatorna: 'sms',
      cimzett_email: to,
      targy: subject || (body.length > 50 ? body.substring(0, 47) + '...' : body),
      uzenet: body,
      statusz: status,
      hiba_oka: errorReason || null,
      ugyirat_id: dossierId || null
    });
  } catch (e) {
    console.error("SMS naplózási hiba:", e);
  }
}

export async function sendSmsNotification({ to, body, subject, dossierId, skipLog }: SendSmsParams) {
  if (!client || !fromPhone) {
    console.warn("Twilio nincs megfelelően konfigurálva az .env fájlban! (SMS szimulált)");
    if (!skipLog) {
      await logSmsAudit(to, body, 'hibas', 'Twilio nincs konfigurálva (szimulált küldés)', subject, dossierId);
    }
    return { success: false, error: "Twilio credentials missing", simulated: true };
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: fromPhone,
      to: to,
    });
    
    console.log(`Twilio SMS sikeresen elküldve a ${to} számra. SID: ${message.sid}`);
    if (!skipLog) {
      await logSmsAudit(to, body, 'sikeres', null, subject, dossierId);
    }
    return { success: true, messageSid: message.sid };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Ismeretlen SMS hiba";
    console.error("Twilio SMS küldési hiba:", error);
    if (!skipLog) {
      await logSmsAudit(to, body, 'hibas', errorMsg, subject, dossierId);
    }
    return { success: false, error: errorMsg };
  }
}
