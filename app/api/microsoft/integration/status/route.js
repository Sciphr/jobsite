import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { refreshMicrosoftToken } from "@/app/lib/microsoftAuth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Microsoft integration status
    let user;
    try {
      user = await prisma.users.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          microsoft_integration_enabled: true,
          microsoft_integration_connected_at: true,
          microsoft_email: true,
          microsoft_user_id: true,
          microsoft_tenant_id: true,
          microsoft_token_expires_at: true,
          microsoft_access_token: true,
          microsoft_refresh_token: true,
          calendar_timezone: true,
        },
      });
    } catch (dbError) {
      // If Microsoft fields don't exist yet, return disconnected status
      if (dbError.code === 'P2021' || dbError.message.includes('column') || dbError.message.includes('microsoft')) {
        return NextResponse.json({
          connected: false,
          microsoftEmail: null,
          userId: null,
          tenantId: null,
          connectedAt: null,
          timezone: "America/Toronto",
          tokenExpired: false,
          needsMigration: true,
        });
      }
      throw dbError;
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let isConnected = false;
    let tokenValid = false;
    let updatedExpiresAt = user.microsoft_token_expires_at;

    if (user.microsoft_integration_enabled && user.microsoft_access_token && user.microsoft_token_expires_at) {
      // Check if we need to refresh the token
      if (user.microsoft_refresh_token) {
        const now = new Date();
        const tokenExpiresAt = new Date(user.microsoft_token_expires_at);
        const shouldRefresh = tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000); // Refresh if expires within 5 minutes

        if (shouldRefresh) {
          try {
            const refreshResult = await refreshMicrosoftToken(user);
            tokenValid = true;
            isConnected = true;
            updatedExpiresAt = refreshResult.expiresAt;
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            // Refresh failed, disable integration
            await prisma.users.update({
              where: { id: user.id },
              data: {
                microsoft_integration_enabled: false,
                microsoft_access_token: null,
                microsoft_refresh_token: null,
                microsoft_token_expires_at: null,
              },
            });
            isConnected = false;
            tokenValid = false;
          }
        } else {
          tokenValid = true;
          isConnected = true;
        }
      } else {
        // No refresh token, check if current token is still valid
        tokenValid = new Date(user.microsoft_token_expires_at) > new Date();
        isConnected = tokenValid;
      }
    }

    return NextResponse.json({
      connected: isConnected,
      microsoftEmail: user.microsoft_email,
      userId: user.microsoft_user_id,
      tenantId: user.microsoft_tenant_id,
      connectedAt: user.microsoft_integration_connected_at,
      timezone: user.calendar_timezone || "America/Toronto",
      tokenValid: tokenValid,
      tokenExpiresAt: updatedExpiresAt,
    });

  } catch (error) {
    console.error("Error fetching Microsoft integration status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}