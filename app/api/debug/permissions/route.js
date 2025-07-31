import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.privilegeLevel < 3) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all permissions
    const permissions = await appPrisma.permissions.findMany({
      orderBy: [{ category: 'asc' }, { resource: 'asc' }, { action: 'asc' }]
    });

    // Group by category
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {});

    // Get all roles with their permissions
    const roles = await appPrisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        _count: {
          select: {
            user_roles: {
              where: { is_active: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        permissions: {
          total: permissions.length,
          grouped
        },
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description,
          userCount: role._count.user_roles,
          permissions: role.role_permissions.map(rp => ({
            resource: rp.permissions.resource,
            action: rp.permissions.action,
            key: `${rp.permissions.resource}:${rp.permissions.action}`,
            description: rp.permissions.description
          }))
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching permissions debug info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}