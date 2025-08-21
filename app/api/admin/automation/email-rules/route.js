import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { protectRoute } from "../../../../lib/middleware/apiProtection";

export async function GET(request) {
  const authResult = await protectRoute("emails", "automation");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const rules = await appPrisma.email_automation_rules.findMany({
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ is_active: "desc" }, { name: "asc" }],
    });

    // Parse conditions from string to JSON for each rule
    const rulesWithParsedConditions = rules.map((rule) => ({
      ...rule,
      conditions: rule.conditions ? JSON.parse(rule.conditions) : {},
    }));

    return NextResponse.json(rulesWithParsedConditions);
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json(
      { message: "Failed to fetch automation rules" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const authResult = await protectRoute("emails", "automation");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const {
      name,
      trigger,
      conditions,
      template_id,
      recipient_type,
      is_active,
    } = await request.json();

    // Validate required fields
    if (!name || !trigger || !template_id) {
      return NextResponse.json(
        { message: "Name, trigger, and template_id are required" },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await appPrisma.email_templates.findUnique({
      where: { id: template_id },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 400 }
      );
    }

    const rule = await appPrisma.email_automation_rules.create({
      data: {
        name,
        trigger,
        conditions: JSON.stringify(conditions || {}),
        template_id,
        recipient_type: recipient_type || "applicant",
        is_active: is_active ?? true,
        created_by: session.user.id,
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

    return NextResponse.json(ruleWithParsedConditions, { status: 201 });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { message: "Failed to create automation rule" },
      { status: 500 }
    );
  }
}
