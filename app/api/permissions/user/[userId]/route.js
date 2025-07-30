// app/api/permissions/user/[userId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserPermissions } from "@/app/lib/permissions";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    
    // Users can only fetch their own permissions unless they're Super Admin
    if (session.user.id !== userId) {
      // Check if current user can manage other users
      const { userHasPermission } = await import("@/app/lib/permissions");
      const canManageUsers = await userHasPermission(session.user.id, 'users', 'view');
      
      if (!canManageUsers) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const permissions = await getUserPermissions(userId);

    return NextResponse.json({
      success: true,
      permissions,
      userId
    });

  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}