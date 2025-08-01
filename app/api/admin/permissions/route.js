import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(request) {
  // Protect route - requires roles management permission to view all permissions
  const authResult = await protectRoute("roles", "view");
  if (authResult.error) return authResult.error;

  try {
    // Fetch all permissions from database, grouped by category
    const permissions = await appPrisma.permissions.findMany({
      orderBy: [
        { category: 'asc' },
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    // Group permissions by category for better organization
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      
      acc[permission.category].push({
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
        key: `${permission.resource}:${permission.action}`,
        isSystemPermission: permission.is_system_permission
      });
      
      return acc;
    }, {});

    // Also return a flat list for easy lookup
    const flatPermissions = permissions.map(permission => ({
      id: permission.id,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      category: permission.category,
      key: `${permission.resource}:${permission.action}`,
      isSystemPermission: permission.is_system_permission
    }));

    return NextResponse.json({
      permissions: flatPermissions,
      grouped: groupedPermissions,
      categories: Object.keys(groupedPermissions).sort()
    });

  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}