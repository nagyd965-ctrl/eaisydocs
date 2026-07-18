import { NextResponse } from 'next/server';
import { processIncomingEmails } from '@/utils/imap-service';

// Ez egy cron végpont, amit meghívhat egy külső szolgáltató (pl. Vercel Cron, UptimeRobot) 5 percenként.
export async function GET(request: Request) {
  // Opcionálisan: Ellenőrizd a CRON_SECRET fejlécet a jogosulatlan futtatások ellen
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await processIncomingEmails();
    
    if (!result.success) {
      return NextResponse.json(
        { message: 'IMAP sync skipped or failed', details: result },
        { status: 200 } // 200 hogy ne jelezzen be állandóan a cron, ha pl. nincs beállítva jelszó
      );
    }

    return NextResponse.json({ 
      message: 'IMAP sync completed successfully', 
      processedCount: result.processedCount 
    });

  } catch (error: any) {
    console.error('Error in IMAP cron route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
