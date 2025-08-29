// app/api/health-check/route.js - Keep database awake
import { appPrisma } from "../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple query to keep database awake
    await appPrisma.$queryRaw`SELECT 1 as health_check`;
    
    return NextResponse.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      database: "connected" 
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ 
      status: "error", 
      error: error.message 
    }, { status: 500 });
  }
}