import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { category, excludeId } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ message: "Template category is required" }),
        { status: 400 }
      );
    }

    // Check if there's already a default template for this category
    const existingDefault = await appPrisma.email_templates.findFirst({
      where: {
        category: category,
        is_default: true,
        is_active: true,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        created_at: true,
        users: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (existingDefault) {
      return new Response(
        JSON.stringify({
          hasExistingDefault: true,
          existingTemplate: {
            ...existingDefault,
            createdBy: existingDefault.users
              ? `${existingDefault.users.firstName} ${existingDefault.users.lastName}`.trim()
              : "System",
          },
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({ hasExistingDefault: false }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking default template:", error);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}