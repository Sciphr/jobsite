// app/lib/zoomAuth.js
import { appPrisma } from './prisma';

export async function refreshZoomToken(user) {
  if (!user.zoom_refresh_token) {
    throw new Error("No Zoom refresh token available");
  }

  console.log("🔄 Refreshing Zoom token for user:", user.id);

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.zoom_refresh_token,
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Zoom token refresh failed:", errorData);
    throw new Error(`Failed to refresh Zoom token: ${errorData}`);
  }

  const tokens = await response.json();
  console.log("✅ Zoom token refreshed, expires in:", tokens.expires_in, "seconds");

  // Calculate new expiry
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  // Update database with new tokens
  await appPrisma.users.update({
    where: { id: user.id },
    data: {
      zoom_access_token: tokens.access_token,
      zoom_refresh_token: tokens.refresh_token || user.zoom_refresh_token, // Keep old refresh token if none provided
      zoom_token_expires_at: expiresAt,
    },
  });

  console.log("✅ Zoom token refreshed successfully");

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || user.zoom_refresh_token,
    expiresAt
  };
}

export async function getValidZoomToken(userId) {
  const user = await appPrisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      zoom_access_token: true,
      zoom_refresh_token: true,
      zoom_token_expires_at: true,
      zoom_integration_enabled: true,
    },
  });

  if (!user || !user.zoom_integration_enabled) {
    throw new Error("Zoom integration not enabled");
  }

  if (!user.zoom_access_token) {
    throw new Error("No Zoom access token available");
  }

  // Check if token expires within 5 minutes and refresh if needed
  const now = new Date();
  const expiresAt = new Date(user.zoom_token_expires_at);
  const shouldRefresh = expiresAt <= new Date(now.getTime() + 5 * 60 * 1000);

  if (shouldRefresh) {
    try {
      if (user.zoom_refresh_token) {
        console.log("🔄 Zoom token expiring, refreshing...");
        const refreshed = await refreshZoomToken(user);
        return refreshed.accessToken;
      } else {
        // No refresh token - disable integration
        await appPrisma.users.update({
          where: { id: userId },
          data: {
            zoom_integration_enabled: false,
            zoom_access_token: null,
            zoom_refresh_token: null,
          },
        });
        throw new Error("Zoom token expired and no refresh token available. Please reconnect.");
      }
    } catch (error) {
      // Refresh failed - disable integration
      await appPrisma.users.update({
        where: { id: userId },
        data: {
          zoom_integration_enabled: false,
          zoom_access_token: null,
          zoom_refresh_token: null,
        },
      });
      throw new Error("Zoom token expired and refresh failed. Please reconnect.");
    }
  }

  return user.zoom_access_token;
}