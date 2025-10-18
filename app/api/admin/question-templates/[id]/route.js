// app/api/admin/question-templates/[id]/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

// GET - Get single question template
export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("settings", "read");
    if (authResult.error) return authResult.error;

    const resolvedParams = await params;
    const template = await appPrisma.question_templates.findUnique({
      where: { id: resolvedParams.id },
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

    if (!template) {
      return NextResponse.json(
        { error: "Question template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error fetching question template:", error);
    return NextResponse.json(
      { error: "Failed to fetch question template" },
      { status: 500 }
    );
  }
}

// PATCH - Update question template
export async function PATCH(request, { params }) {
  try {
    const authResult = await protectRoute("settings", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const body = await request.json();

    const existingTemplate = await appPrisma.question_templates.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Question template not found" },
        { status: 404 }
      );
    }

    const {
      title,
      question_text,
      question_type,
      options,
      is_required,
      placeholder_text,
      help_text,
      is_active,
    } = body;

    // Validate options for multiple_choice and checkbox types
    if (question_type && ["multiple_choice", "checkbox"].includes(question_type)) {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { error: "Multiple choice and checkbox questions must have at least 2 options" },
          { status: 400 }
        );
      }
    }

    const template = await appPrisma.question_templates.update({
      where: { id: resolvedParams.id },
      data: {
        ...(title && { title }),
        ...(question_text && { question_text }),
        ...(question_type && { question_type }),
        ...(options !== undefined && { options: options ? JSON.stringify(options) : null }),
        ...(is_required !== undefined && { is_required }),
        ...(placeholder_text !== undefined && { placeholder_text }),
        ...(help_text !== undefined && { help_text }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date(),
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "QUESTION_TEMPLATE",
      subcategory: "UPDATE",
      entityType: "question_template",
      entityId: template.id,
      entityName: template.title,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Update question template",
      description: `Updated question template: ${template.title}`,
      metadata: {
        question_type: template.question_type,
        is_active: template.is_active,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating question template:", error);
    return NextResponse.json(
      { error: "Failed to update question template" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete question template
export async function DELETE(request, { params }) {
  try {
    const authResult = await protectRoute("settings", "delete");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;

    const existingTemplate = await appPrisma.question_templates.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Question template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting is_active to false
    const template = await appPrisma.question_templates.update({
      where: { id: resolvedParams.id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "DELETE",
      category: "QUESTION_TEMPLATE",
      subcategory: "DELETE",
      entityType: "question_template",
      entityId: template.id,
      entityName: template.title,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Delete question template",
      description: `Deleted (soft) question template: ${template.title}`,
    });

    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting question template:", error);
    return NextResponse.json(
      { error: "Failed to delete question template" },
      { status: 500 }
    );
  }
}
