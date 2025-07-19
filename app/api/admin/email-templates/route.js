import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
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
    const { searchParams } = new URL(req.url);
    const applicationStatus = searchParams.get("status");

    // Build where clause
    const where = {
      is_active: true,
    };

    // Filter by application status if provided
    if (applicationStatus && applicationStatus !== "all") {
      where.type = applicationStatus;
    }

    const templates = await appPrisma.emailTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        subject: true,
        content: true,
        type: true,
        is_default: true,
        variables: true,
        description: true,
        created_by: true,
        created_at: true,
        users: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { is_default: "desc" }, // Default templates first
        { name: "asc" },
      ],
    });

    // Parse variables field (stored as JSON string)
    const formattedTemplates = templates.map((template) => ({
      ...template,
      variables: template.variables ? JSON.parse(template.variables) : [],
      createdBy: template.users
        ? `${template.users.firstName} ${template.users.lastName}`.trim()
        : "System",
    }));

    return new Response(JSON.stringify(formattedTemplates), { status: 200 });
  } catch (error) {
    console.error("Email templates fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

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
    const body = await req.json();
    const { name, subject, content, type, description, variables } = body;

    // Validate required fields
    if (!name || !subject || !content || !type) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    const template = await appPrisma.emailTemplate.create({
      data: {
        name,
        subject,
        content,
        type,
        description,
        variables: JSON.stringify(variables || []),
        is_default: false,
        is_active: true,
        created_by: session.user.id,
      },
    });

    return new Response(JSON.stringify(template), { status: 201 });
  } catch (error) {
    console.error("Email template creation error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}