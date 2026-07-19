import { createClient } from '@/utils/supabase/server';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  dossierId?: string; // Opcionális ügyirat azonosító a naplózáshoz
}

export async function sendNotificationEmail({ to, subject, html, dossierId }: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  const supabase = await createClient();

  // Aktuális user lekérése a naplózáshoz (ki váltotta ki az eseményt)
  const { data: { user } } = await supabase.auth.getUser();

  if (!apiKey) {
    console.error('Hiányzik a BREVO_API_KEY a környezeti változókból!');
    await logNotification(supabase, to, subject, html, 'hibas', 'Hiányzó API kulcs', dossierId, user?.id);
    return { success: false, error: 'Hiányzó API kulcs' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'eaisyDocs Rendszer',
          email: 'ertesites@thinkai.hu' // A Brevo-ba beregisztrált domain
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo API hiba:', errorText);
      await logNotification(supabase, to, subject, html, 'hibas', `Brevo hiba: ${errorText}`, dossierId, user?.id);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    
    // Sikeres naplózás
    await logNotification(supabase, to, subject, html, 'sikeres', null, dossierId, user?.id);
    
    return { success: true, messageId: data.messageId };

  } catch (error: unknown) {
    console.error('Kivétel az e-mail küldés során:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba';
    await logNotification(supabase, to, subject, html, 'hibas', errorMessage, dossierId, user?.id);
    return { success: false, error: errorMessage };
  }
}

 
async function logNotification(
  supabaseClient: any,
  to: string,
  subject: string,
  html: string,
  status: 'sikeres' | 'hibas' | 'folyamatban',
  errorReason: string | null = null,
  dossierId?: string,
  userId?: string
) {
  try {
    // Használjuk a service_role kulcsot, hogy az RLS biztosan ne blokkolja a naplózást
    let adminSupabase = supabaseClient;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const { createClient } = await import('@supabase/supabase-js');
      adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }

    const { error } = await adminSupabase.from('ertesites_naplo').insert({
      csatorna: 'email',
      cimzett_email: to,
      targy: subject,
      uzenet: html,
      statusz: status,
      hiba_oka: errorReason,
      ugyirat_id: dossierId || null,
      kivato_user_id: userId || null
    });

    if (error) {
      console.error('Adatbázis hiba az e-mail naplózása során:', error);
    }
  } catch (logError) {
    console.error('Kivétel az e-mail naplózása során:', logError);
  }
}

export function buildHtmlEmail(title: string, message: string, details?: { label: string, value: string }[], actionText?: string, actionUrl?: string) {
  const detailsHtml = details && details.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
      ${details.map(d => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eef2f6; color: #64748b; width: 35%; font-size: 14px;">${d.label}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eef2f6; color: #0f172a; font-weight: 600; font-size: 14px;">${d.value}</td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const buttonHtml = actionText && actionUrl ? `
    <div style="margin-top: 32px; text-align: center;">
      <a href="${actionUrl}" style="background-color: #0eb39e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">${actionText}</a>
    </div>
  ` : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #0eb39e; padding: 24px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">eaisyDocs</h1>
        </div>
        <div style="padding: 40px 32px;">
          <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 600;">${title}</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">${message}</p>
          ${detailsHtml}
          ${buttonHtml}
        </div>
        <div style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Ezt az üzenetet az eaisyDocs rendszer automatikusan generálta.</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Kérjük, ne válaszolj erre az e-mailre!</p>
        </div>
      </div>
    </div>
  `;
}
