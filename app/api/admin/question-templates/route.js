// app/api/admin/question-templates/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

// GET - List all question templates
export async function GET(request) {
  try {
    const authResult = await protectRoute("settings", "read");
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const templates = await appPrisma.question_templates.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: [
        { usage_count: "desc" },
        { created_at: "desc" }
      ],
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching question templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch question templates" },
      { status: 500 }
    );
  }
}

// POST - Create new question template
export async function POST(request) {
  try {
    const authResult = await protectRoute("settings", "create");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const body = await request.json();

    const {
      title,
      question_text,
      question_type,
      options,
      is_required,
      placeholder_text,
      help_text,
    } = body;

    // Validation
    if (!title || !question_text || !question_type) {
      return NextResponse.json(
        { error: "Title, question text, and question type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["text", "textarea", "multiple_choice", "checkbox", "yes_no", "file_upload", "date"];
    if (!validTypes.includes(question_type)) {
      return NextResponse.json(
        { error: "Invalid question type" },
        { status: 400 }
      );
    }

    // Validate options for multiple_choice and checkbox types
    if (["multiple_choice", "checkbox"].includes(question_type)) {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { error: "Multiple choice and checkbox questions must have at least 2 options" },
          { status: 400 }
        );
      }
    }

    const template = await appPrisma.question_templates.create({
      data: {
        title,
        question_text,
        question_type,
        options: options ? JSON.stringify(options) : null,
        is_required: is_required || false,
        placeholder_text,
        help_text,
        created_by: session.user.id,
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "QUESTION_TEMPLATE",
      subcategory: "CREATE",
      entityType: "question_template",
      entityId: template.id,
      entityName: template.title,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Create question template",
      description: `Created question template: ${template.title}`,
      metadata: {
        question_type: template.question_type,
        is_required: template.is_required,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating question template:", error);
    return NextResponse.json(
      { error: "Failed to create question template" },
      { status: 500 }
    );
  }
}
