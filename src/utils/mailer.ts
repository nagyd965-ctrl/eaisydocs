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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
