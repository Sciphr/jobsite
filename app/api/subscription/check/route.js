import { NextResponse } from 'next/server';
import { getSubscriptionTier } from '@/app/lib/subscriptionConfig.js';

export async function GET() {
  try {
    const tier = await getSubscriptionTier();

    return NextResponse.json({
      success: true,
      tier,
      message: `Current subscription tier: ${tier}`
    });

  } catch (error) {
    console.error('Error checking subscription tier:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription tier' },
      { status: 500 }
    );
  }
}