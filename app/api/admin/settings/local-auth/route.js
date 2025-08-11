import { NextResponse } from 'next/server';
import { appPrisma } from '../../../../lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { AuthAudit } from '../../../../lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.privilegeLevel < 3) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get local auth setting
    const localAuthSetting = await appPrisma.settings.findFirst({
      where: {
        key: 'local_auth_enabled',
        userId: null // System-wide setting
      }
    });

    return NextResponse.json({
      local_auth_enabled: localAuthSetting?.value === 'true' || true // Default to true if not set
    });
  } catch (error) {
    console.error('Error fetching local auth settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local auth settings' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.privilegeLevel < 3) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { local_auth_enabled } = await request.json();

    // Validate input
    if (typeof local_auth_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'local_auth_enabled must be a boolean' }, 
        { status: 400 }
      );
    }

    // Update or create the setting
    await appPrisma.settings.upsert({
      where: {
        key_userId: {
          key: 'local_auth_enabled',
          userId: null
        }
      },
      update: {
        value: local_auth_enabled.toString(),
        updatedAt: new Date()
      },
      create: {
        key: 'local_auth_enabled',
        value: local_auth_enabled.toString(),
        description: 'Enable local username/password authentication',
        dataType: 'boolean',
        category: 'authentication',
        userId: null,
        updatedAt: new Date()
      }
    });

    // Log authentication method change
    const session = await getServerSession(authOptions);
    if (local_auth_enabled) {
      await AuthAudit.authMethodEnabled('local', session?.user);
    } else {
      await AuthAudit.authMethodDisabled('local', session?.user);
    }

    return NextResponse.json({
      success: true,
      local_auth_enabled
    });
  } catch (error) {
    console.error('Error updating local auth settings:', error);
    return NextResponse.json(
      { error: 'Failed to update local auth settings' }, 
      { status: 500 }
    );
  }
}