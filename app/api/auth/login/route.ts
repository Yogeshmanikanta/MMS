import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

// Credentials come from the environment (see .env.example). Nothing is hard-coded.
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'nytlabs').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(request: Request) {
  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { success: false, message: 'Sign-in is not set up. Add ADMIN_PASSWORD to the server environment.' },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Enter your username and password.' }, { status: 400 });
  }

  const username = String(body?.username || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!username || !password) {
    return NextResponse.json({ success: false, message: 'Enter your username and password.' }, { status: 400 });
  }

  const usernameOk = username === ADMIN_USERNAME || username === `${ADMIN_USERNAME}@collegemess.edu`;
  if (!usernameOk || !safeEqual(password, ADMIN_PASSWORD)) {
    return NextResponse.json({ success: false, message: 'That username and password don’t match.' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: 'usr-admin',
      name: 'Mess admin',
      email: `${ADMIN_USERNAME}@collegemess.edu`,
      role: 'admin' as const
    },
    token: `mms_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  });
}
