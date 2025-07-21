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
      category: template.category,
      tags: template.tags || [],
      usageCount: template.usage_count || 0,
      lastUsedAt: template.last_used_at,
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
    const { name, subject, content, type, category, tags, description, variables, isDefault, isActive, createdBy } = await request.json();

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

    // If this template is being set as default, remove default flag from other templates of the same category
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: {
          category: category || 'general',
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
        category: category || 'general',
        tags: tags || [],
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
      category: template.category,
      tags: template.tags || [],
      usageCount: template.usage_count || 0,
      lastUsedAt: template.last_used_at,
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

// Add a PUT endpoint to migrate template types
export async function PUT(request) {
  try {
    const { action } = await request.json();
    
    if (action === "migrate_types") {
      // Mapping old types to new types
      const typeMapping = {
        "Applied": "application_received",
        "Reviewing": "application_under_review", 
        "Interview": "interview_invitation",
        "Hired": "offer_extended",
        "Rejected": "rejection_general"
      };
      
      // Update each template type
      const updatePromises = Object.entries(typeMapping).map(([oldType, newType]) => 
        prisma.emailTemplate.updateMany({
          where: { type: oldType },
          data: { type: newType }
        })
      );
      
      await Promise.all(updatePromises);
      
      return NextResponse.json({
        success: true,
        message: "Template types migrated successfully",
        mapping: typeMapping
      });
    }

    if (action === "update_categories_and_add_templates") {
      // First, update existing templates' categories
      const categoryUpdates = [
        { name: "Application Received Confirmation", category: "application", isDefault: true, isActive: true },
        { name: "Application Under Review", category: "application", isDefault: false, isActive: true },
        { name: "Request Additional Information", category: "application", isDefault: false, isActive: true },
        { name: "Interview Invitation", category: "interview", isDefault: true, isActive: true },
        { name: "Interview Confirmation", category: "interview", isDefault: false, isActive: true },
        { name: "Job Offer", category: "onboarding", isDefault: true, isActive: true },
        { name: "Application Not Selected", category: "rejection", isDefault: true, isActive: true },
        { name: "Post-Interview Rejection", category: "rejection", isDefault: false, isActive: true }
      ];

      // Update existing templates
      for (const update of categoryUpdates) {
        await prisma.emailTemplate.updateMany({
          where: { name: update.name },
          data: { 
            category: update.category,
            is_default: update.isDefault,
            is_active: update.isActive
          }
        });
      }

      // Add new diverse templates
      const newTemplates = [
        {
          name: "Application Withdrawn",
          subject: "Application Withdrawal Confirmation - {{jobTitle}}",
          content: "Dear {{candidateName}},\n\nWe have received your request to withdraw your application for the {{jobTitle}} position at {{companyName}}.\n\nYour application has been removed from our system as requested. We appreciate your interest in our company and encourage you to apply for future opportunities that align with your career goals.\n\nThank you for considering {{companyName}} as a potential employer.\n\nBest regards,\n{{senderName}}\n{{companyName}} Recruitment Team",
          type: "application_received",
          category: "application",
          description: "Confirmation when candidate withdraws application",
          is_default: false,
          is_active: false,
          variables: JSON.stringify(["candidateName", "jobTitle", "companyName", "senderName"])
        },
        {
          name: "Interview Reschedule Request",
          subject: "Interview Rescheduling - {{jobTitle}} Position",
          content: "Dear {{candidateName}},\n\nWe need to reschedule your upcoming interview for the {{jobTitle}} position originally scheduled for {{originalDate}} at {{originalTime}}.\n\nWe apologize for any inconvenience this may cause. Please let us know your availability for the following times:\n• {{option1}}\n• {{option2}}\n• {{option3}}\n\nPlease reply with your preferred option, or suggest alternative times that work better for you.\n\nThank you for your understanding.\n\nBest regards,\n{{senderName}}\n{{companyName}} Hiring Team",
          type: "interview_reminder",
          category: "interview",
          description: "Request to reschedule interview",
          is_default: false,
          is_active: true,
          variables: JSON.stringify(["candidateName", "jobTitle", "originalDate", "originalTime", "option1", "option2", "option3", "senderName", "companyName"])
        },
        {
          name: "Interview No-Show Follow-up",
          subject: "Missed Interview - {{jobTitle}} Position",
          content: "Dear {{candidateName}},\n\nWe noticed that you were unable to attend your scheduled interview for the {{jobTitle}} position today at {{interviewTime}}.\n\nWe understand that unexpected situations can arise. If you are still interested in this position and would like to reschedule, please contact us within the next 48 hours.\n\nPlease note that this will be our final attempt to reschedule the interview.\n\nBest regards,\n{{senderName}}\n{{companyName}} Hiring Team",
          type: "interview_feedback",
          category: "interview",
          description: "Follow-up for missed interview",
          is_default: false,
          is_active: false,
          variables: JSON.stringify(["candidateName", "jobTitle", "interviewTime", "senderName", "companyName"])
        },
        {
          name: "Welcome Package - First Day",
          subject: "Welcome to {{companyName}} - Your First Day Guide",
          content: "Dear {{candidateName}},\n\nWelcome to {{companyName}}! We're excited to have you join our team as {{jobTitle}}.\n\nHere's what you need to know for your first day on {{startDate}}:\n\n📍 **Location**: {{officeAddress}}\n🕘 **Start Time**: {{startTime}}\n👤 **Report to**: {{supervisor}} ({{supervisorEmail}})\n🅿️ **Parking**: {{parkingInfo}}\n\n**What to Bring:**\n• Photo ID\n• Completed paperwork (if any remaining)\n• Banking details for payroll\n\n**What to Expect:**\n• Office tour and desk setup\n• IT equipment setup\n• Meeting your team\n• HR orientation session\n\nIf you have any questions before your start date, please don't hesitate to reach out.\n\nWe look forward to seeing you!\n\nBest regards,\n{{senderName}}\n{{companyName}} HR Team",
          type: "onboarding_welcome",
          category: "onboarding",
          description: "First day welcome and logistics",
          is_default: true,
          is_active: true,
          variables: JSON.stringify(["candidateName", "companyName", "jobTitle", "startDate", "officeAddress", "startTime", "supervisor", "supervisorEmail", "parkingInfo", "senderName"])
        },
        {
          name: "Document Submission Reminder",
          subject: "Action Required: Missing Documents - {{jobTitle}}",
          content: "Dear {{candidateName}},\n\nWe're preparing for your start date of {{startDate}} and need the following documents to complete your onboarding:\n\n**Required Documents:**\n{{missingDocuments}}\n\n**Submission Options:**\n• Email: {{hrEmail}}\n• Upload Portal: {{portalLink}}\n• In-person: {{officeAddress}}\n\n**Deadline**: {{deadline}}\n\nPlease ensure all documents are submitted by the deadline to avoid any delays in your start date.\n\nIf you have any questions or need assistance, please contact our HR team.\n\nBest regards,\n{{senderName}}\n{{companyName}} HR Team",
          type: "document_request",
          category: "onboarding",
          description: "Missing document reminder for new hires",
          is_default: false,
          is_active: true,
          variables: JSON.stringify(["candidateName", "startDate", "missingDocuments", "hrEmail", "portalLink", "officeAddress", "deadline", "senderName", "companyName"])
        },
        {
          name: "Position Filled Notification",
          subject: "Position Update - {{jobTitle}} at {{companyName}}",
          content: "Dear {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position at {{companyName}}.\n\nWe wanted to inform you that this position has been filled. While your qualifications were impressive, we selected a candidate whose experience most closely matched our specific requirements.\n\nWe encourage you to:\n• Apply for other open positions on our careers page\n• Sign up for job alerts in your area of expertise\n• Connect with us on LinkedIn for future opportunities\n\nWe will keep your information on file for {{retentionPeriod}} and may reach out if suitable positions become available.\n\nThank you for considering {{companyName}} as your potential employer.\n\nBest regards,\n{{senderName}}\n{{companyName}} Talent Acquisition Team",
          type: "rejection_general",
          category: "rejection",
          description: "Position filled notification",
          is_default: false,
          is_active: true,
          variables: JSON.stringify(["candidateName", "jobTitle", "companyName", "retentionPeriod", "senderName"])
        },
        {
          name: "Application Status Check-in",
          subject: "Quick Update on Your {{jobTitle}} Application",
          content: "Dear {{candidateName}},\n\nWe wanted to provide you with a quick update on your application for the {{jobTitle}} position at {{companyName}}.\n\nYour application is progressing through our review process. We're currently in the {{currentStage}} phase and expect to complete this stage by {{expectedDate}}.\n\n**Next Steps:**\n{{nextSteps}}\n\n**Timeline:**\n{{timeline}}\n\nWe appreciate your patience during this process. If you have any questions, please feel free to reach out.\n\nBest regards,\n{{senderName}}\n{{companyName}} Hiring Team",
          type: "follow_up",
          category: "follow_up",
          description: "Proactive application status update",
          is_default: true,
          is_active: true,
          variables: JSON.stringify(["candidateName", "jobTitle", "companyName", "currentStage", "expectedDate", "nextSteps", "timeline", "senderName"])
        },
        {
          name: "Reference Check Request",
          subject: "Reference Check - {{candidateName}} for {{jobTitle}}",
          content: "Dear {{referenceName}},\n\nI hope this email finds you well. {{candidateName}} has applied for the {{jobTitle}} position at {{companyName}} and has listed you as a professional reference.\n\nWould you be available for a brief 10-15 minute phone call to discuss {{candidateName}}'s work performance and qualifications? We're particularly interested in:\n\n• {{candidateName}}'s key strengths\n• Areas for development\n• Work style and team collaboration\n• Overall recommendation\n\nPlease let me know your availability over the next few days. I'm flexible with timing and can accommodate your schedule.\n\nYou can reach me at:\n• Phone: {{phoneNumber}}\n• Email: {{email}}\n\nThank you for your time and assistance.\n\nBest regards,\n{{senderName}}\n{{companyName}} Hiring Manager",
          type: "document_request",
          category: "general",
          description: "Reference check request email",
          is_default: false,
          is_active: false,
          variables: JSON.stringify(["referenceName", "candidateName", "jobTitle", "companyName", "phoneNumber", "email", "senderName"])
        }
      ];

      // Create new templates (without created_by since it's nullable)
      await prisma.emailTemplate.createMany({
        data: newTemplates.map(template => ({
          ...template,
          created_by: null,
          created_at: new Date(),
          updated_at: new Date()
        }))
      });

      const updatedCount = categoryUpdates.length;
      const newCount = newTemplates.length;

      return NextResponse.json({
        success: true,
        message: `Updated ${updatedCount} existing templates and created ${newCount} new templates`,
        details: {
          updatedTemplates: updatedCount,
          newTemplates: newCount
        }
      });
    }
    
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
    
  } catch (error) {
    console.error("Error migrating template types:", error);
    return NextResponse.json(
      { error: "Failed to migrate template types", details: error.message },
      { status: 500 }
    );
  }
}