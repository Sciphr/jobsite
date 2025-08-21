import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(req) {
  const authResult = await protectRoute("emails", "templates");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const applicationStatus = searchParams.get("status");
    const defaultOnly = searchParams.get("default_only");

    // Build where clause
    const where = {
      is_active: true,
    };

    // Filter by default templates if requested
    if (defaultOnly === "true") {
      where.is_default = true;
    }
    // Otherwise filter by application status if provided
    else if (applicationStatus && applicationStatus !== "all") {
      where.type = applicationStatus;
    }

    const templates = await appPrisma.email_templates.findMany({
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
  const authResult = await protectRoute("emails", "templates");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

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

    const template = await appPrisma.email_templates.create({
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