import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { clearConfigCache } from '@/app/lib/subscriptionConfig.js';

export async function POST(request) {
  try {
    const { tier, updated_by, updated_at } = await request.json();

    console.log('Received tier update webhook:', { tier, updated_by, updated_at });

    // Validate the tier value
    if (!tier || !['basic', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier value' }, { status: 400 });
    }

    // TODO: Add webhook authentication here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Create config directory if it doesn't exist
    const configDir = path.join(process.cwd(), 'config');
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    // Update the subscription config file
    const configPath = path.join(configDir, 'subscription.json');
    const config = {
      tier,
      last_updated: updated_at || new Date().toISOString(),
      updated_by: updated_by || 'saas_management'
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Clear the config cache so next read gets the new value
    clearConfigCache();

    console.log('Updated subscription config:', config);

    // Broadcast to all connected clients via Server-Sent Events
    try {
      const { broadcastTierUpdate } = await import('../../websocket/route.js');
      broadcastTierUpdate(tier);
    } catch (error) {
      console.error('Error broadcasting tier update:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription tier updated successfully',
      new_tier: tier
    });

  } catch (error) {
    console.error('Error processing tier update webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription tier' },
      { status: 500 }
    );
  }
}