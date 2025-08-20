// app/api/cron/test/route.js
import { NextResponse } from 'next/server';

// Simple test endpoint to verify cron is working
export async function POST(request) {
  const timestamp = new Date().toISOString();
  
  console.log(`🧪 Cron test endpoint called at ${timestamp}`);
  
  return NextResponse.json({ 
    success: true,
    message: 'Cron system is working!',
    timestamp,
    headers: Object.fromEntries(request.headers)
  });
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Cron test endpoint - use POST to simulate cron call',
    timestamp: new Date().toISOString()
  });
}