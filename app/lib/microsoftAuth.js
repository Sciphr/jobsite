// app/lib/microsoftAuth.js
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function refreshMicrosoftToken(user) {
  if (!user.microsoftRefreshToken) {
    throw new Error("No refresh token available");
  }

  console.log("🔄 Refreshing Microsoft token for user:", user.id);

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.microsoftRefreshToken,
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/User.Read offline_access',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Microsoft token refresh failed:", errorData);
    throw new Error(`Failed to refresh Microsoft token: ${errorData}`);
  }

  const tokens = await response.json();
  
  // Calculate new expiration
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  // Update user with new tokens
  await prisma.user.update({
    where: { id: user.id },
    data: {
      microsoftAccessToken: tokens.access_token,
      microsoftRefreshToken: tokens.refresh_token || user.microsoftRefreshToken,
      microsoftTokenExpiresAt: expiresAt,
    },
  });

  console.log("✅ Microsoft token refreshed successfully");
  return {
    accessToken: tokens.access_token,
    expiresAt: expiresAt,
    refreshToken: tokens.refresh_token || user.microsoftRefreshToken,
  };
}

export async function getMicrosoftAccessToken(userId, forceRefresh = false) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
        microsoftIntegrationEnabled: true,
      },
    });

    if (!user?.microsoftIntegrationEnabled) {
      throw new Error("Microsoft integration not enabled");
    }

    if (!user.microsoftAccessToken) {
      throw new Error("No Microsoft access token found");
    }

    const now = new Date();
    const tokenExpiresAt = new Date(user.microsoftTokenExpiresAt);
    const shouldRefresh = forceRefresh || tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000); // Refresh if expires within 5 minutes

    if (shouldRefresh && user.microsoftRefreshToken) {
      try {
        const refreshResult = await refreshMicrosoftToken(user);
        return refreshResult.accessToken;
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Disable integration if refresh fails
        await prisma.user.update({
          where: { id: userId },
          data: {
            microsoftIntegrationEnabled: false,
            microsoftAccessToken: null,
            microsoftRefreshToken: null,
            microsoftTokenExpiresAt: null,
          },
        });
        throw new Error("Microsoft token expired and refresh failed. Please reconnect.");
      }
    }

    // Check if current token is still valid
    if (tokenExpiresAt <= now) {
      throw new Error("Microsoft token expired and no refresh token available. Please reconnect.");
    }

    return user.microsoftAccessToken;
  } finally {
    await prisma.$disconnect();
  }
}

export async function validateMicrosoftToken(accessToken) {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
}