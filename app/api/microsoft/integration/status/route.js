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
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          microsoftIntegrationEnabled: true,
          microsoftIntegrationConnectedAt: true,
          microsoftEmail: true,
          microsoftUserId: true,
          microsoftTenantId: true,
          microsoftTokenExpiresAt: true,
          microsoftAccessToken: true,
          microsoftRefreshToken: true,
          calendarTimezone: true,
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
    let updatedExpiresAt = user.microsoftTokenExpiresAt;

    if (user.microsoftIntegrationEnabled && user.microsoftAccessToken && user.microsoftTokenExpiresAt) {
      // Check if we need to refresh the token
      if (user.microsoftRefreshToken) {
        const now = new Date();
        const tokenExpiresAt = new Date(user.microsoftTokenExpiresAt);
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
            await prisma.user.update({
              where: { id: user.id },
              data: {
                microsoftIntegrationEnabled: false,
                microsoftAccessToken: null,
                microsoftRefreshToken: null,
                microsoftTokenExpiresAt: null,
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
        tokenValid = new Date(user.microsoftTokenExpiresAt) > new Date();
        isConnected = tokenValid;
      }
    }

    return NextResponse.json({
      connected: isConnected,
      microsoftEmail: user.microsoftEmail,
      userId: user.microsoftUserId,
      tenantId: user.microsoftTenantId,
      connectedAt: user.microsoftIntegrationConnectedAt,
      timezone: user.calendarTimezone || "America/Toronto",
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