import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const type = searchParams.get("type") || "";
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search") || "";

    // Build where clause for filtering
    const where = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== "") {
      where.is_active = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch templates
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { is_default: "desc" },
        { name: "asc" },
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

    // Transform data for frontend
    const transformedTemplates = templates.map((template) => ({
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
    }));

    return NextResponse.json({
      success: true,
      data: transformedTemplates,
    });

  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch email templates", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { name, subject, content, type, description, variables, isDefault, isActive, createdBy } = await request.json();

    // Validate required fields
    if (!name || !subject || !content || !type) {
      return NextResponse.json(
        { error: "Name, subject, content, and type are required" },
        { status: 400 }
      );
    }

    // Generate a placeholder UUID if createdBy is not provided or invalid
    const validCreatedBy = createdBy && createdBy.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
      ? createdBy 
      : '00000000-0000-0000-0000-000000000000'; // Placeholder UUID for system-created templates

    // If this template is being set as default, remove default flag from other templates of the same type
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: {
          type: type,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    // Create the template
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        content,
        type,
        description: description || null,
        variables: variables ? JSON.stringify(variables) : null,
        is_default: isDefault || false,
        is_active: isActive !== undefined ? isActive : true,
        created_by: validCreatedBy,
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
      message: "Email template created successfully",
    });

  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json(
      { error: "Failed to create email template", details: error.message },
      { status: 500 }
    );
  }
}