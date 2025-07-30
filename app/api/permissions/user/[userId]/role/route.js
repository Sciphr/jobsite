// app/api/permissions/user/[userId]/role/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserRole } from "@/app/lib/permissions";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    
    // Users can only fetch their own role unless they have permissions
    if (session.user.id !== userId) {
      const { userHasPermission } = await import("@/app/lib/permissions");
      const canViewUsers = await userHasPermission(session.user.id, 'users', 'view');
      
      if (!canViewUsers) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const role = await getUserRole(userId);

    return NextResponse.json({
      success: true,
      role,
      userId
    });

  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}