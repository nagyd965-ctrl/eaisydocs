import { NextResponse } from 'next/server';
import { processIncomingEmails } from '@/utils/imap-service';

// Ez egy cron végpont, amit meghívhat egy külső szolgáltató (pl. Vercel Cron, UptimeRobot) 5 percenként.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const secretQuery = searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (
    !expectedSecret ||
    (authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret && secretQuery !== expectedSecret)
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
