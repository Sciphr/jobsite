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
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        microsoftAccessToken: null,
        microsoftRefreshToken: null,
        microsoftTokenExpiresAt: null,
        microsoftUserId: null,
        microsoftEmail: null,
        microsoftTenantId: null,
        microsoftIntegrationEnabled: false,
        microsoftIntegrationConnectedAt: null,
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