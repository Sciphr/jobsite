import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Clear all Microsoft integration data
    await prisma.users.update({
      where: { id: session.user.id },
      data: {
        microsoft_access_token: null,
        microsoft_refresh_token: null,
        microsoft_token_expires_at: null,
        microsoft_user_id: null,
        microsoft_email: null,
        microsoft_tenant_id: null,
        microsoft_integration_enabled: false,
        microsoft_integration_connected_at: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Microsoft integration disconnected successfully",
    });

  } catch (error) {
    console.error("Error disconnecting Microsoft integration:", error);
    return NextResponse.json(
      { message: "Failed to disconnect Microsoft integration" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}