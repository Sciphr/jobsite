// app/lib/microsoftAuth.js
import { appPrisma } from "./prisma";

export async function refreshMicrosoftToken(user) {
  if (!user.microsoft_refresh_token) {
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
      refresh_token: user.microsoft_refresh_token,
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
  await appPrisma.users.update({
    where: { id: user.id },
    data: {
      microsoft_access_token: tokens.access_token,
      microsoft_refresh_token: tokens.refresh_token || user.microsoft_refresh_token,
      microsoft_token_expires_at: expiresAt,
    },
  });

  console.log("✅ Microsoft token refreshed successfully");
  return {
    accessToken: tokens.access_token,
    expiresAt: expiresAt,
    refreshToken: tokens.refresh_token || user.microsoft_refresh_token,
  };
}

export async function getMicrosoftAccessToken(userId, forceRefresh = false) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        microsoft_access_token: true,
        microsoft_refresh_token: true,
        microsoft_token_expires_at: true,
        microsoft_integration_enabled: true,
      },
    });

    if (!user?.microsoft_integration_enabled) {
      throw new Error("Microsoft integration not enabled");
    }

    if (!user.microsoft_access_token) {
      throw new Error("No Microsoft access token found");
    }

    const now = new Date();
    const tokenExpiresAt = new Date(user.microsoft_token_expires_at);
    const shouldRefresh = forceRefresh || tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000); // Refresh if expires within 5 minutes

    if (shouldRefresh && user.microsoft_refresh_token) {
      try {
        const refreshResult = await refreshMicrosoftToken(user);
        return refreshResult.accessToken;
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Disable integration if refresh fails
        await appPrisma.users.update({
          where: { id: userId },
          data: {
            microsoft_integration_enabled: false,
            microsoft_access_token: null,
            microsoft_refresh_token: null,
            microsoft_token_expires_at: null,
          },
        });
        throw new Error("Microsoft token expired and refresh failed. Please reconnect.");
      }
    }

    // Check if current token is still valid
    if (tokenExpiresAt <= now) {
      throw new Error("Microsoft token expired and no refresh token available. Please reconnect.");
    }

    return user.microsoft_access_token;
  } finally {
    await appPrisma.$disconnect();
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