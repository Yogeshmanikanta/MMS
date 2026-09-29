import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // Server-side authentication check for NYTlabs admin
    const validUsername = cleanUsername === 'nytlabs' || cleanUsername === 'nytlabs@collegemess.edu';
    const validPassword = cleanPassword === 'yogesh@613' || (process.env.ADMIN_PASSWORD && cleanPassword === process.env.ADMIN_PASSWORD);

    if (validUsername && validPassword) {
      const user = {
        id: 'usr-admin-nytlabs',
        name: 'NYTlabs Administrator',
        email: 'nytlabs@collegemess.edu',
        role: 'admin' as const,
        lastLogin: new Date().toISOString()
      };

      const token = `mms_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user,
        token
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid admin username or password. Please try again.' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
