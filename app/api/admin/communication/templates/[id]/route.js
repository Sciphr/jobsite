import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const template = await prisma.email_templates.findUnique({
      where: { id },
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
        { error: "Email template not found" },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const transformedTemplate = {
      id: template.id,
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
      isDefault: template.is_default,
      isActive: template.is_active,
      variables: template.variables ? JSON.parse(template.variables) : [],
      description: template.description,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      creator: template.users ? {
        name: `${template.users.firstName || ''} ${template.users.lastName || ''}`.trim(),
        email: template.users.email,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: transformedTemplate,
    });

  } catch (error) {
    console.error("Error fetching email template:", error);
    return NextResponse.json(
      { error: "Failed to fetch email template", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, subject, content, type, category, description, variables, isDefault, isActive } = await request.json();

    // Check if template exists
    const existingTemplate = await prisma.email_templates.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!name || !subject || !content || !type) {
      return NextResponse.json(
        { error: "Name, subject, content, and type are required" },
        { status: 400 }
      );
    }

    // If this template is being set as default, remove default flag from other templates of the same category
    if (isDefault && !existingTemplate.is_default) {
      await prisma.email_templates.updateMany({
        where: {
          category: category || existingTemplate.category || 'general',
          is_default: true,
          id: { not: id },
        },
        data: {
          is_default: false,
        },
      });
    }

    // Update the template
    const template = await prisma.email_templates.update({
      where: { id },
      data: {
        name,
        subject,
        content,
        type,
        category: category || 'general',
        description: description || null,
        variables: variables ? JSON.stringify(variables) : null,
        is_default: isDefault || false,
        is_active: isActive !== undefined ? isActive : true,
        updated_at: new Date(),
      },
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

    // Transform response
    const transformedTemplate = {
      id: template.id,
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
      isDefault: template.is_default,
      isActive: template.is_active,
      variables: template.variables ? JSON.parse(template.variables) : [],
      description: template.description,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      creator: template.users ? {
        name: `${template.users.firstName || ''} ${template.users.lastName || ''}`.trim(),
        email: template.users.email,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: transformedTemplate,
      message: "Email template updated successfully",
    });

  } catch (error) {
    console.error("Error updating email template:", error);
    return NextResponse.json(
      { error: "Failed to update email template", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check if template exists
    const existingTemplate = await prisma.email_templates.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 404 }
      );
    }

    // Check if template is being used in any emails
    const emailsUsingTemplate = await prisma.email.count({
      where: { template_id: id },
    });

    if (emailsUsingTemplate > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete template that has been used in emails",
          details: `This template has been used in ${emailsUsingTemplate} email(s). Consider deactivating it instead.`
        },
        { status: 400 }
      );
    }

    // Delete the template
    await prisma.email_templates.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Email template deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting email template:", error);
    return NextResponse.json(
      { error: "Failed to delete email template", details: error.message },
      { status: 500 }
    );
  }
}