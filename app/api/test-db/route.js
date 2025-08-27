import { NextResponse } from "next/server";
import { appPrisma } from "../../lib/prisma";

export async function GET() {
  try {
    console.log("Testing database connection...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Missing");
    
    // Simple database test
    const result = await appPrisma.$queryRaw`SELECT 1 as test`;
    console.log("Raw query result:", result);
    
    const userCount = await appPrisma.users.count();
    console.log("User count:", userCount);
    
    return NextResponse.json({ 
      success: true,
      message: "Database connected successfully",
      userCount,
      hasEnvVar: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database test failed:", error);
    
    // More detailed error info
    const errorInfo = {
      name: error.name,
      message: error.message,
      code: error.code,
      clientVersion: error.clientVersion,
      hasEnvVar: !!process.env.DATABASE_URL,
      envUrl: process.env.DATABASE_URL ? "Set (hidden)" : "Not set"
    };
    
    return NextResponse.json({ 
      success: false,
      error: errorInfo,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}