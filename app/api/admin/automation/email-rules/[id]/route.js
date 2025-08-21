import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import { protectRoute } from "../../../../../lib/middleware/apiProtection";

export async function GET(request, { params }) {
  const authResult = await protectRoute("emails", "automation");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { id } = await params;

    const rule = await appPrisma.email_automation_rules.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    // Parse conditions from string to JSON
    const ruleWithParsedConditions = {
      ...rule,
      conditions: rule.conditions ? JSON.parse(rule.conditions) : {},
    };

    return NextResponse.json(ruleWithParsedConditions);
  } catch (error) {
    console.error("Error fetching automation rule:", error);
    return NextResponse.json(
      { message: "Failed to fetch automation rule" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const authResult = await protectRoute("emails", "automation");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { id } = await params;
    const {
      name,
      trigger,
      conditions,
      template_id,
      recipient_type,
      is_active,
    } = await request.json();

    // Check if rule exists
    const existingRule = await appPrisma.email_automation_rules.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    // Validate template if provided
    if (template_id) {
      const template = await appPrisma.email_templates.findUnique({
        where: { id: template_id },
      });

      if (!template) {
        return NextResponse.json(
          { message: "Template not found" },
          { status: 400 }
        );
      }
    }

    const rule = await appPrisma.email_automation_rules.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(trigger && { trigger }),
        ...(conditions !== undefined && {
          conditions: JSON.stringify(conditions),
        }),
        ...(template_id && { template_id }),
        ...(recipient_type && { recipient_type }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date(),
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Parse conditions back to JSON for response
    const ruleWithParsedConditions = {
      ...rule,
      conditions: JSON.parse(rule.conditions),
    };

    return NextResponse.json(ruleWithParsedConditions);
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json(
      { message: "Failed to update automation rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const authResult = await protectRoute("emails", "automation");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { id } = await params;

    // Check if rule exists
    const existingRule = await appPrisma.email_automation_rules.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json({ message: "Rule not found" }, { status: 404 });
    }

    await appPrisma.email_automation_rules.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json(
      { message: "Failed to delete automation rule" },
      { status: 500 }
    );
  }
}
