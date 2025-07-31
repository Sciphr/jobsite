import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(req) {
  // Check if user has permission to view users
  const authResult = await protectRoute("users", "view");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;

  try {
    const users = await appPrisma.users.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true, // Keep for backward compatibility
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user_roles: {
          where: { is_active: true },
          select: {
            id: true,
            assigned_at: true,
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
                is_system_role: true,
              },
            },
          },
          orderBy: { assigned_at: "asc" },
        },
        _count: {
          select: {
            jobs: true,
            applications: true,
            saved_jobs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return new Response(JSON.stringify(users), { status: 200 });
  } catch (error) {
    console.error("Users fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  // Check if user has permission to create users
  const authResult = await protectRoute("users", "create");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;

  try {
    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      privilegeLevel,
    } = body;

    // Validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "Email and password are required" }),
        {
          status: 400,
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ message: "Invalid email format" }), {
        status: 400,
      });
    }

    // Validate role and privilege level
    const validRoles = ["user", "hr", "admin", "super_admin"];
    if (role && !validRoles.includes(role)) {
      return new Response(JSON.stringify({ message: "Invalid role" }), {
        status: 400,
      });
    }

    if (
      privilegeLevel !== undefined &&
      (privilegeLevel < 0 || privilegeLevel > 3)
    ) {
      return new Response(
        JSON.stringify({ message: "Privilege level must be between 0 and 3" }),
        {
          status: 400,
        }
      );
    }

    // Check if user already exists
    const existingUser = await appPrisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: "User with this email already exists" }),
        {
          status: 409,
        }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await appPrisma.users.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: role || "user",
        privilegeLevel: privilegeLevel !== undefined ? privilegeLevel : 0,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            jobs: true,
            applications: true,
            saved_jobs: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(newUser), { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);

    if (error.code === "P2002") {
      return new Response(
        JSON.stringify({ message: "User with this email already exists" }),
        {
          status: 409,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
