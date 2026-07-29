import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

// Csak akkor inicializáljuk, ha megvannak a kulcsok (ne fagyjon le a szerver, ha még hiányoznak)
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

interface SendSmsParams {
  to: string;
  body: string;
}

export async function sendSmsNotification({ to, body }: SendSmsParams) {
  if (!client || !fromPhone) {
    console.warn("Twilio nincs megfelelően konfigurálva az .env fájlban! (SMS nem ment el)");
    return { success: false, error: "Twilio credentials missing" };
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: fromPhone,
      to: to,
    });
    
    console.log(`Twilio SMS sikeresen elküldve a ${to} számra. SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error("Twilio SMS küldési hiba:", error);
    return { success: false, error: error.message };
  }
}
